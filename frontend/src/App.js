import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

// --- Configuration ---
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
];

function App() {
  // --- Refs ---
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  // --- State ---
  const [roomName, setRoomName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [connectionState, setConnectionState] = useState("DISCONNECTED");

  // This effect now correctly depends on both the stream and the joined state
  useEffect(() => {
    if (localStream && isJoined && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isJoined]);


  // --- Core WebRTC & Signaling Logic ---
  const handleSignal = useCallback(async ({ from, type, sdp, candidate }) => {
    if (!pcRef.current) return;
    try {
      if (type === "offer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit("signal", { room: roomName, type: "answer", sdp: answer.sdp });
      } else if (type === "answer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
      } else if (type === "candidate") {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling signal:", error);
    }
  }, [roomName]);

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", { room: roomName, type: "candidate", candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState.toUpperCase());
    };

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    return pc;
  }, [roomName]);

  const createOffer = async () => {
    if (!pcRef.current) return;
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("signal", { room: roomName, type: "offer", sdp: offer.sdp });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomName) return alert("Please enter a room name.");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      socketRef.current = io(); 
      
      socketRef.current.on('connect', () => {
        socketRef.current.emit("join-room", roomName, socketRef.current.id);
        setIsJoined(true); // This will trigger the useEffect
        pcRef.current = createPeerConnection(stream);
        socketRef.current.on("user-joined", () => createOffer());
        socketRef.current.on("signal", handleSignal);
        socketRef.current.on("user-left", (userId) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            pcRef.current.close();
            pcRef.current = createPeerConnection(stream);
        });
      });

    } catch (error) {
      console.error("Could not start call:", error);
      alert(`Error starting call: ${error.message}`);
    }
  };

  const handleHangUp = () => {
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) pcRef.current.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setIsJoined(false);
    setRoomName("");
    setConnectionState("DISCONNECTED");
  };

  useEffect(() => {
    return () => handleHangUp();
  }, []);

  return (
    <div>
      <h1>Simple WebRTC Video Call</h1>
      {!isJoined ? (
        <div>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter Room Name"
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <h2>Room: {roomName}</h2>
          <p><strong>Status:</strong> {connectionState}</p>
          <button onClick={handleHangUp}>Hang Up</button>
          <div>
            <div>
              <h3>Local Video</h3>
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 320 }} />
            </div>
            <div>
              <h3>Remote Video</h3>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 320, backgroundColor: '#333' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;