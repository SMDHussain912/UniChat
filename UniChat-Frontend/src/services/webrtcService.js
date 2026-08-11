import { io } from 'socket.io-client';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9121/api';

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let callInterval = null;
let currentCallId = null;
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });
  }
  return socket;
}

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

function createPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection({ iceServers });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && currentCallId) {
      getSocket().emit('ice-candidate', {
        callId: currentCallId,
        candidate: event.candidate
      });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState;
    if (state === 'disconnected' || state === 'failed') {
      if (onConnectionStateChange) {
        onConnectionStateChange(state);
      }
    }
  };

  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    if (onRemoteStream) {
      onRemoteStream(remoteStream);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    if (state === 'connected' && onCallConnected) {
      onCallConnected();
    } else if (state === 'disconnected' || state === 'failed') {
      if (onConnectionStateChange) {
        onConnectionStateChange(state);
      }
    }
  };

  return peerConnection;
}

function addLocalTracks(stream) {
  if (!peerConnection || !stream) return;
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });
}

async function createOffer() {
  if (!peerConnection) return null;
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  });
  await peerConnection.setLocalDescription(offer);
  return offer;
}

async function createAnswer() {
  if (!peerConnection) return null;
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

async function setRemoteDescription(description) {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
}

async function addIceCandidate(candidate) {
  if (!peerConnection) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

async function getLocalStream(audio = true, video = false) {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    audio,
    video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
  };

  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return localStream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Permission denied for media device');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No media device found');
    }
    throw error;
  }
}

async function getScreenStream() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    return stream;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Screen share permission denied');
    }
    throw error;
  }
}

async function switchCamera() {
  if (!localStream) return null;

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return null;

  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === 'videoinput');

  if (cameras.length <= 1) return localStream;

  const currentCameraId = videoTrack.getSettings().deviceId;
  const nextCamera = cameras.find(c => c.deviceId !== currentCameraId) || cameras[0];

  const newTrack = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: nextCamera.deviceId } }
  }).catch(() => localStream);

  if (newTrack !== localStream) {
    const sender = peerConnection?.getSenders().find(s => s.track === videoTrack);
    if (sender) {
      await sender.replaceTrack(newTrack.getVideoTracks()[0]);
    }
    localStream.removeTrack(videoTrack);
    localStream.addTrack(newTrack.getVideoTracks()[0]);
    videoTrack.stop();
  }

  return localStream;
}

async function setSpeakerOutput(deviceId) {
  try {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(el => {
      if (el.setSinkId) {
        el.setSinkId(deviceId);
      }
    });
  } catch (error) {
    console.error('Error setting speaker:', error);
  }
}

function getDeviceList() {
  return navigator.mediaDevices.enumerateDevices();
}

async function toggleMute(isMuted) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
}

async function toggleVideo(isVideoOff) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach(track => {
    track.enabled = !isVideoOff;
  });
}

function cleanup() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }
  if (callInterval) {
    clearInterval(callInterval);
    callInterval = null;
  }
  currentCallId = null;
}

let onRemoteStream = null;
let onCallConnected = null;
let onConnectionStateChange = null;

export const webrtcService = {
  createPeerConnection,
  addLocalTracks,
  createOffer,
  createAnswer,
  setRemoteDescription,
  addIceCandidate,
  getLocalStream,
  getScreenStream,
  switchCamera,
  setSpeakerOutput,
  getDeviceList,
  toggleMute,
  toggleVideo,
  cleanup,
  setOnRemoteStream: (callback) => { onRemoteStream = callback; },
  setOnCallConnected: (callback) => { onCallConnected = callback; },
  setOnConnectionStateChange: (callback) => { onConnectionStateChange = callback; },
  getPeerConnection: () => peerConnection,
  getLocalStream: () => localStream,
  getRemoteStream: () => remoteStream,
  getCurrentCallId: () => currentCallId,
  setCurrentCallId: (id) => { currentCallId = id; },
  setCallInterval: (interval) => { callInterval = interval; },
  getCallInterval: () => callInterval
};