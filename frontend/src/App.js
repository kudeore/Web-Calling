import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';

// =============================================================================
// Styled Components
// =============================================================================
const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #101418;
  font-family: 'Poppins', sans-serif;
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #1A202C;
  padding: 40px;
  border-radius: 24px;
  border: 1px solid rgba(0, 191, 255, 0.2);
  box-shadow: 0 0 40px rgba(0, 191, 255, 0.3), 0 0 10px rgba(0, 191, 255, 0.2) inset;
  width: 90vw;
  max-width: 1400px;
  height: 90vh;
`;

const Header = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #E2E8F0;
  text-align: center;
  flex-shrink: 0;
`;

const StatusText = styled.p`
  font-size: 1rem;
  color: #718096;
  margin-top: -15px;
  margin-bottom: 20px;
  flex-shrink: 0;
`;

const VideoGrid = styled.div`
  flex-grow: 1;
  width: 100%;
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  overflow-y: auto;
  align-content: start;
`;

const VideoContainer = styled.div`
  background-color: #000;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(0, 191, 255, 0.2);
  aspect-ratio: 16 / 9;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: ${props => (props.mirrored ? 'scaleX(-1)' : 'none')};
`;

const Controls = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  flex-shrink: 0;
`;

const ControlButton = styled.button`
  background-color: ${props => props.active ? 'rgba(72, 187, 120, 0.8)' : 'rgba(74, 85, 104, 0.5)'};
  border: 1px solid ${props => props.active ? '#48BB78' : '#4A5568'};
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #E2E8F0;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:not(:disabled):hover {
    background-color: #4A5568;
    border-color: #00BFFF;
  }

  &.end {
    background-color: rgba(229, 62, 62, 0.8);
    border-color: #E53E3E;
  }
`;

const PreJoinContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
    text-align: center;
`;

const JoinButton = styled.button`
  padding: 12px 30px;
  border-radius: 8px;
  border: none;
  background-color: #00BFFF;
  color: #101828;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

// =============================================================================
// React Components
// =============================================================================

const Video = ({ peer }) => {
    const ref = useRef();
    useEffect(() => {
        const handleStream = (stream) => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        };
        peer.on("stream", handleStream);

        return () => {
            peer.off("stream", handleStream);
        };
    }, [peer]);
    return <StyledVideo playsInline autoPlay ref={ref} mirrored={false} />;
};

const App = () => {
    const { roomID } = useParams();
    const isScreenShareSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState([]);
    const [audioOn, setAudioOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const socketRef = useRef();
    const myVideo = useRef();
    const peersRef = useRef([]);
    const screenTrackRef = useRef();

    useEffect(() => {
        if (stream && myVideo.current) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    const handleJoin = () => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(currentStream => {
                setStream(currentStream);
                socketRef.current.emit("join-room", roomID);

                socketRef.current.on("all-users", users => {
                    const peers = [];
                    users.forEach(userID => {
                        const peer = createPeer(userID, socketRef.current.id, currentStream);
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        });
                        peers.push({ peerID: userID, peer });
                    });
                    setPeers(peers);
                });

                socketRef.current.on("user joined", payload => {
                    const peer = addPeer(payload.signal, payload.callerID, currentStream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });
                    setPeers(userPeers => [...userPeers, { peer, peerID: payload.callerID }]);
                });

                socketRef.current.on("receiving returned signal", payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    item.peer.signal(payload.signal);
                });

                socketRef.current.on("user-left", id => {
                    const peerObj = peersRef.current.find(p => p.peerID === id);
                    if(peerObj) peerObj.peer.destroy();
                    const newPeers = peersRef.current.filter(p => p.peerID !== id);
                    peersRef.current = newPeers;
                    setPeers(newPeers);
                });
            })
            .catch(err => {
                console.error("Failed to get local stream", err);
            });
    };

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
        });
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID });
        });
        peer.signal(incomingSignal);
        return peer;
    }

    const toggleAudio = () => { /* Unchanged */ };
    const toggleVideo = () => { /* Unchanged */ };
    const handleScreenShare = () => { /* Unchanged */ };
    const replaceTrack = (newTrack) => { /* Unchanged */ };
    const handleEndCall = () => { /* Unchanged */ };

    if (!stream) {
        return (
            <AppContainer>
                <MainContainer>
                    <Header>MentorFlow</Header>
                    <PreJoinContainer>
                        <StatusText>You are about to join the call:</StatusText>
                        <p style={{fontSize: '1.2rem', color: '#00BFFF', margin: '10px'}}>{roomID}</p>
                        <JoinButton onClick={handleJoin}>Join with Camera and Mic</JoinButton>
                    </PreJoinContainer>
                </MainContainer>
            </AppContainer>
        );
    }

    return (
        <AppContainer>
            <MainContainer>
                <Header>MentorFlow</Header>
                <StatusText>In Room: {roomID}</StatusText>
                
                <VideoGrid>
                    <VideoContainer>
                        <StyledVideo muted ref={myVideo} autoPlay playsInline mirrored={!isScreenSharing} />
                    </VideoContainer>
                    {peers.map((data) => (
                        <VideoContainer key={data.peerID}>
                            <Video peer={data.peer} />
                        </VideoContainer>
                    ))}
                </VideoGrid>

                <Controls>
                    <ControlButton active={audioOn} onClick={toggleAudio}>
                        {audioOn ? "🎤" : "🔇"}
                    </ControlButton>
                    <ControlButton active={videoOn} onClick={toggleVideo} disabled={isScreenSharing}>
                        {videoOn ? "📹" : "📸"}
                    </ControlButton>
                    {isScreenShareSupported && (
                        <ControlButton active={isScreenSharing} onClick={handleScreenShare}>
                            🖥️
                        </ControlButton>
                    )}
                    <ControlButton className="end" onClick={handleEndCall}>
                        📞
                    </ControlButton>
                </Controls>
            </MainContainer>
        </AppContainer>
    );
};

export default App;