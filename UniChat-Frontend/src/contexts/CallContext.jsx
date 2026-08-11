import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { webrtcService } from '../services/webrtcService';
import { callService } from '../services/callService';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const [callState, setCallState] = useState({
    callId: null,
    status: 'idle',
    callType: null,
    caller: null,
    callerName: null,
    participant: null,
    participantName: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    duration: 0,
    connectionQuality: 'good'
  });

  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (webrtcService.getPeerConnection()) {
      webrtcService.setOnRemoteStream((stream) => {
        setCallState(prev => ({ ...prev, remoteStream: stream }));
      });

      webrtcService.setOnCallConnected(() => {
        setCallState(prev => ({ ...prev, status: 'connected' }));
        startCallTimer();
      });

      webrtcService.setOnConnectionStateChange((state) => {
        if (state === 'disconnected' || state === 'failed') {
          setCallState(prev => ({ ...prev, status: 'reconnecting' }));
        }
      });
    }

    return () => {
      webrtcService.setOnRemoteStream(null);
      webrtcService.setOnCallConnected(null);
      webrtcService.setOnConnectionStateChange(null);
    };
  }, []);

  function startCallTimer() {
    if (webrtcService.getCallInterval()) {
      clearInterval(webrtcService.getCallInterval());
    }
    const interval = setInterval(() => {
      setCallState(prev => {
        if (prev.status !== 'connected') {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, duration: prev.duration + 1 };
      });
    }, 1000);
    webrtcService.setCallInterval(interval);
  }

  const initiateCall = useCallback(async (receiverId, callType) => {
    setCallState(prev => ({ ...prev, status: 'calling', callType }));
    try {
      const response = await callService.initiateCall(receiverId, callType);
      if (response.success) {
        setCallState(prev => ({ ...prev, callId: response.call._id }));
      }
      return response;
    } catch (error) {
      setCallState(prev => ({ ...prev, status: 'idle' }));
      throw error;
    }
  }, []);

  const acceptCall = useCallback(async (callId) => {
    setCallState(prev => ({ ...prev, status: 'connecting', callId }));
    try {
      const localStream = await webrtcService.getLocalStream(true, true);
      setCallState(prev => ({ ...prev, localStream, status: 'connecting' }));
      const response = await callService.acceptCall(callId);
      return response;
    } catch (error) {
      setCallState(prev => ({ ...prev, status: 'idle' }));
      throw error;
    }
  }, []);

  const rejectCall = useCallback(async (callId) => {
    try {
      await callService.rejectCall(callId);
      setIncomingCall(null);
      setCallState(prev => ({ ...prev, status: 'idle' }));
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, []);

  const endCall = useCallback(async (callId) => {
    try {
      if (callId) {
        await callService.endCall(callId);
      }
      webrtcService.cleanup();
      setCallState({
        callId: null,
        status: 'idle',
        callType: null,
        caller: null,
        callerName: null,
        participant: null,
        participantName: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        duration: 0,
        connectionQuality: 'good'
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setCallState(prev => {
      const newMuted = !prev.isMuted;
      webrtcService.toggleMute(newMuted);
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setCallState(prev => {
      const newVideoOff = !prev.isVideoOff;
      webrtcService.toggleVideo(newVideoOff);
      return { ...prev, isVideoOff: newVideoOff };
    });
  }, []);

  const switchCamera = useCallback(async () => {
    try {
      const stream = await webrtcService.switchCamera();
      if (stream) {
        setCallState(prev => ({ ...prev, localStream: stream }));
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }, []);

  const shareScreen = useCallback(async () => {
    try {
      const screenStream = await webrtcService.getScreenStream();
      setCallState(prev => ({ ...prev, isScreenSharing: true }));
      return screenStream;
    } catch (error) {
      console.error('Error sharing screen:', error);
      throw error;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    webrtcService.cleanup();
    setCallState(prev => ({ ...prev, isScreenSharing: false }));
  }, []);

  return (
    <CallContext.Provider value={{
      callState,
      incomingCall,
      setIncomingCall,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      switchCamera,
      shareScreen,
      stopScreenShare
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

export default CallContext;