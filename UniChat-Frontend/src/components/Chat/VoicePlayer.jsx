import React, { useState, useRef, useEffect } from 'react';

export function VoicePlayer({ attachment, onDelete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime || 0);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
    };
  }, [attachment?.id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!attachment) return null;

  return (
    <div className="voice-player">
      <audio ref={audioRef} src={attachment.url} preload="metadata" />
      <button className="play-btn" onClick={togglePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div className="voice-progress">
        <span className="current-time">{formatTime(currentTime)}</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="total-time">{formatTime(duration)}</span>
      </div>
      <span className="voice-duration">{attachment.duration || '?'}s</span>
      {onDelete && (
        <button className="delete-btn" onClick={onDelete}>🗑</button>
      )}
    </div>
  );
}