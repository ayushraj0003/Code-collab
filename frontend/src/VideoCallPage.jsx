import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Connect to your backend

function VideoCallPage({ roomId }) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // To store all remote streams
  const peerConnection = useRef(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [localStream, setLocalStream] = useState(null); // Store the local stream
  const [isCameraOn, setIsCameraOn] = useState(true); // Track camera state
  const [isMicOn, setIsMicOn] = useState(true); // Track microphone state

  useEffect(() => {
    socket.emit('joinRoom', roomId);

    // Setting up PeerConnection
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302', // STUN server
        },
      ],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Handling ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    // Handling remote stream events
    peerConnection.current.ontrack = (event) => {
      setRemoteStreams((prevStreams) => [
        ...prevStreams,
        event.streams[0], // Adding the new remote stream
      ]);
    };

    // Receiving ICE candidates from the server
    socket.on('ice-candidate', (candidateData) => {
      if (candidateData) {
        try {
          const candidate = new RTCIceCandidate(candidateData);
          peerConnection.current
            .addIceCandidate(candidate)
            .catch((e) => console.error('Error adding received ICE candidate', e));
        } catch (e) {
          console.error('Error creating ICE candidate', e);
        }
      }
    });

    return () => {
      socket.emit('leaveRoom', roomId);
      peerConnection.current.close();
    };
  }, [roomId]);

  const startCall = async () => {
    try {
      // Get local stream and add it to the PeerConnection
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream); // Store the local stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit('offer', offer);
      setIsCallStarted(true);
    } catch (error) {
      console.error('Error starting the call:', error);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  };

  // Receiving the offer from the other peer
  socket.on('offer', async (offer) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('answer', answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  });

  // Receiving the answer from the other peer
  socket.on('answer', (answer) => {
    handleAnswer(answer);
  });

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  return (
    <div>
      <h2>Video Call</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around' }}>
        {/* Local video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '45%', height: 'auto', border: '1px solid black', margin: '10px' }}
        ></video>

        {/* Remote videos */}
        {remoteStreams.map((stream, index) => (
          <video
            key={index}
            ref={(ref) => {
              if (ref) {
                ref.srcObject = stream;
              }
            }}
            autoPlay
            playsInline
            style={{ width: '45%', height: 'auto', border: '1px solid black', margin: '10px' }}
          ></video>
        ))}
      </div>
      {!isCallStarted && <button onClick={startCall}>Start Call</button>}
      {isCallStarted && (
        <div>
          <button onClick={toggleCamera}>{isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}</button>
          <button onClick={toggleMic}>{isMicOn ? 'Turn Off Microphone' : 'Turn On Microphone'}</button>
        </div>
      )}
    </div>
  );
}

export default VideoCallPage;
