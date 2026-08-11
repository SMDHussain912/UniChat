import { useRef, useEffect } from 'react';

export function ParticipantView({ stream, name, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`participant-view ${isLocal ? 'local' : 'remote'}`}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      <span className="participant-name">{name || (isLocal ? 'You' : 'Participant')}</span>
    </div>
  );
}
