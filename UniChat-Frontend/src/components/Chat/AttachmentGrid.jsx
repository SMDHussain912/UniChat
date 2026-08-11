import React from 'react';
import { AttachmentPreview } from './AttachmentPreview';

export function AttachmentGrid({ attachments, onPreview, onDownload }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="attachment-grid">
      {attachments.map((attachment, index) => (
        <div key={attachment.id || index} className="attachment-grid-item">
          <AttachmentPreview
            attachment={attachment}
            onClick={() => onPreview?.(attachment)}
            onDownload={onDownload}
          />
        </div>
      ))}
    </div>
  );
}