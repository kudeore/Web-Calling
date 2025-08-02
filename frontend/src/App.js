import React, { useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // Start local media (camera/mic)
  const startCall = async () => {
    if (stream) return;
    const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setStream(userStream);
    videoRef.current.srcObject = userStream;
    setAudioOn(true);
    setVideoOn(true);
  };

  // Toggle audio (mute/unmute)
  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setAudioOn(!audioOn);
    }
  };

  // Toggle video (on/off)
  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
      setVideoOn(!videoOn);
    }
  };

  // Screen share
  const startScreenShare = async () => {
    if (!stream || screenSharing) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = displayStream.getVideoTracks()[0];

      // Replace video track in local stream
      stream.removeTrack(stream.getVideoTracks()[0]);
      stream.addTrack(videoTrack);

      videoRef.current.srcObject = null;
      videoRef.current.srcObject = stream;

      setScreenSharing(true);

      videoTrack.onended = () => {
        // Revert to camera after sharing ends
        stream.removeTrack(videoTrack);
        navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
          let camTrack = camStream.getVideoTracks()[0];
          stream.addTrack(camTrack);
          videoRef.current.srcObject = stream;
        });
        setScreenSharing(false);
      };
    } catch (e) {
      alert("Screen sharing failed");
    }
  };

  // End call
  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setAudioOn(false);
      setVideoOn(false);
      setScreenSharing(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
      <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ width: 800, height: 600, background: "#222", borderRadius: 10, marginBottom: 24 }}
      />

    <div style={{ display: "flex", gap: 24 }}>
        {/* Start Call */}
        <button
          title="Start Call"
          onClick={startCall}
          disabled={!!stream}
          style={{
            fontSize: "3rem",
            color: "green",       // <-- Call icon is now green
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          📞
        </button>
        {/* Mute/Unmute */}
        <button
          title="Mute/Unmute"
          onClick={toggleAudio}
          disabled={!stream}
          style={{
            fontSize: "3rem",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          {audioOn ? "🔊" : "🔇"}
        </button>
        {/* Video On/Off */}
        <button
          title="Video On/Off"
          onClick={toggleVideo}
          disabled={!stream}
          style={{
            fontSize: "3rem",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          {videoOn ? "🎥" : "🎦"}
        </button>
        {/* Screen Share */}
        <button
          title="Screen Share"
          onClick={startScreenShare}
          disabled={!stream || screenSharing}
          style={{
            fontSize: "3rem",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          🖥️
        </button>
        {/* End Call */}
        <button
          title="End Call"
          onClick={endCall}
          disabled={!stream}
          style={{
            fontSize: "3rem",
            color: "red",         // <-- End call icon stays red
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          📴
        </button>
      </div>
      <div style={{ marginTop: 24, color: "#4e4e4e" }}>
        <b>Status:</b><br />
        {stream ? (
          <>
            {audioOn ? "Microphone: ON" : "Microphone: OFF"}<br />
            {videoOn ? "Camera: ON" : "Camera: OFF"}<br />
            {screenSharing ? "Screen Sharing Active" : ""}
          </>
        ) : "Call not started"}
      </div>
    </div>
  );
}

export default App;
