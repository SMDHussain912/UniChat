import React from 'react';

export function UploadProgress({ uploads, onCancel, onRetry }) {
  if (!uploads || uploads.length === 0) return null;

  return (
    <div className="upload-progress">
      {uploads.map(upload => (
        <div key={upload.id} className="upload-item">
          <span className="upload-filename">{upload.fileName}</span>
          {upload.status === 'uploading' && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${upload.progress || 0}%` }} />
            </div>
          )}
          {upload.status === 'done' && <span className="upload-status success">✓</span>}
          {upload.status === 'error' && <span className="upload-status error">✗</span>}
          {upload.status === 'uploading' && (
            <button className="icon-btn" onClick={() => onCancel(upload.id)}>Cancel</button>
          )}
          {upload.status === 'error' && (
            <button className="icon-btn" onClick={() => onRetry(upload.id)}>Retry</button>
          )}
        </div>
      ))}
    </div>
  );
}