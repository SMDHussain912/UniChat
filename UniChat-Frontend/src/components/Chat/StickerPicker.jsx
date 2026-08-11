import React, { useState, useEffect } from 'react';
import { stickerService } from '../services/api';

export function StickerPicker({ serverId, onSelect }) {
  const [stickers, setStickers] = useState([]);
  const [customStickers, setCustomStickers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStickers() {
      try {
        const [defaultRes, customRes] = await Promise.all([
          stickerService.getStickers(),
          serverId ? stickerService.getCustomStickers(serverId) : Promise.resolve({ stickers: [] })
        ]);
        setStickers(defaultRes.stickers || []);
        setCustomStickers(customRes.stickers || []);
      } catch (error) {
        console.error('Error fetching stickers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStickers();
  }, [serverId]);

  if (loading) return <div className="sticker-picker loading">Loading stickers...</div>;

  return (
    <div className="sticker-picker">
      {customStickers.length > 0 && (
        <div className="sticker-section">
          <h4>Custom Stickers</h4>
          <div className="sticker-grid">
            {customStickers.map(sticker => (
              <button
                key={sticker.id}
                className="sticker-btn"
                onClick={() => onSelect(sticker)}
              >
                <img src={sticker.imageUrl} alt={sticker.name} title={sticker.name} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sticker-section">
        <h4>Default Stickers</h4>
        <div className="sticker-grid">
          {stickers.map(sticker => (
            <button
              key={sticker.id}
              className="sticker-btn"
              onClick={() => onSelect(sticker)}
            >
              <img src={sticker.imageUrl} alt={sticker.name} title={sticker.name} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}