import React from 'react';

export function AttachmentPreview({ attachment, onClick, onDownload }) {
  if (!attachment) return null;

  const isImage = attachment.mimeType?.startsWith('image/');
  const isVideo = attachment.mimeType?.startsWith('video/');
  const isVoice = attachment.mimeType?.startsWith('audio/');
  const isSticker = attachment.mimeType?.startsWith('image/') && attachment.originalName?.match(/\.(webp|png|gif)$/i);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="attachment-preview" onClick={onClick}>
      {isImage && (
        <img src={attachment.url} alt={attachment.originalName} className="attachment-thumbnail" />
      )}
      {isVideo && (
        <div className="attachment-video-preview">
          <span className="video-icon">▶</span>
          {attachment.thumbnail && (
            <img src={attachment.thumbnail} alt="" className="attachment-thumbnail" />
          )}
        </div>
      )}
      {isVoice && (
        <div className="attachment-voice-preview">
          <span className="voice-icon">🎤</span>
          <span className="voice-duration">{attachment.duration || 0}s</span>
        </div>
      )}
      {!isImage && !isVideo && !isVoice && (
        <div className="attachment-file-preview">
          <span className="file-icon">📎</span>
          <span className="file-name">{attachment.originalName}</span>
        </div>
      )}
      <span className="attachment-size">{formatSize(attachment.fileSize)}</span>
      {onDownload && (
        <button className="download-btn" onClick={(e) => { e.stopPropagation(); onDownload(attachment); }}>
          Download
        </button>
      )}
    </div>
  );
}