import React, { useState, useRef, useCallback } from 'react';

export function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waves, setWaves] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (onRecordingComplete) onRecordingComplete(blob, duration);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    setDuration(0);
    if (onCancel) onCancel();
  }, [isRecording, onCancel]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-controls">
        {!isRecording ? (
          <button className="record-btn" onClick={startRecording}>
            🎤 Record
          </button>
        ) : (
          <>
            <span className="recording-timer">{formatDuration(duration)}</span>
            <button className="stop-btn" onClick={stopRecording}>Stop</button>
            <button className="cancel-btn" onClick={cancelRecording}>Cancel</button>
          </>
        )}
      </div>
      {isRecording && (
        <div className="waveform">
          {[...Array(20)].map((_, i) => (
            <span key={i} className="wave-bar" style={{
              height: `${20 + Math.random() * 80}px`,
              animationDelay: `${i * 0.05}s`
            }} />
          ))}
        </div>
      )}
    </div>
  );
}