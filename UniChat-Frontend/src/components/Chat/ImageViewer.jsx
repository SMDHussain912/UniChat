import React, { useState, useEffect } from 'react';

export function ImageViewer({ attachment, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setZoom(1);
    setLoading(true);
  }, [attachment?.id]);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  if (!attachment) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer" onClick={e => e.stopPropagation()} onWheel={handleWheel}>
        {loading && <div className="image-loader">Loading...</div>}
        <img
          src={attachment.url}
          alt={attachment.originalName}
          style={{ transform: `scale(${zoom})` }}
          onLoad={() => setLoading(false)}
        />
        <div className="image-controls">
          <button onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(0.5, prev - 0.1)); }}>−</button>
          <button onClick={(e) => { e.stopPropagation(); setZoom(1); }}>1:1</button>
          <button onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(3, prev + 0.1)); }}>+</button>
        </div>
        <button className="close-viewer" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
}