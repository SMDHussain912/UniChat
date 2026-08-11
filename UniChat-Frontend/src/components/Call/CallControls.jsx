import { useCall } from '../../contexts/CallContext';
import { CallTimer } from './CallTimer';
import { ConnectionIndicator } from './ConnectionIndicator';
import './Call.css';

export function CallControls({ callState }) {
  const { toggleMute, toggleVideo, endCall, switchCamera, shareScreen, stopScreenShare } = useCall();

  const handleEndCall = () => {
    endCall(callState.callId);
  };

  return (
    <div className="call-controls">
      <div className="call-controls-top">
        <CallTimer duration={callState.duration} />
        <ConnectionIndicator quality={callState.connectionQuality} />
      </div>
      <div className="call-controls-buttons">
        <button className={`control-btn ${callState.isMuted ? 'active' : ''}`} onClick={toggleMute}>
          {callState.isMuted ? '🔇' : '🎤'}
        </button>
        <button className={`control-btn ${callState.isVideoOff ? 'active' : ''}`} onClick={toggleVideo}>
          {callState.isVideoOff ? '📷 off' : '📷'}
        </button>
        <button className="control-btn" onClick={switchCamera}>
          🔄
        </button>
        <button className="control-btn" onClick={shareScreen}>
          📺
        </button>
        <button className="control-btn end-call" onClick={handleEndCall}>
          📞
        </button>
      </div>
    </div>
  );
}
