import React from 'react';
import '../pages/Themes.css';

export const THEMES = [
  { id: 'default', name: 'Default', color: '#e0e7ff' },
  { id: 'ocean', name: 'Ocean', color: '#dbeafe' },
  { id: 'love', name: 'Love', color: '#ffe4e6' },
  { id: 'midnight', name: 'Midnight', color: '#0f172a' },
  { id: 'sunset', name: 'Sunset', color: '#fff7ed' },
  { id: 'mint', name: 'Mint', color: '#ecfdf5' },
  { id: 'neon', name: 'Neon', color: '#000000' },
  { id: '3d-ocean', name: '3D Ocean', color: '#3b82f6' },
  { id: '3d-sunset', name: '3D Sunset', color: '#be123c' },
  { id: '3d-neon', name: '3D Neon', color: '#27272a' }
];

const ThemeModal = ({ isOpen, onClose, onSelectTheme, currentTheme, onUploadBackground, onRemoveBackground, hasCustomBg }) => {
  if (!isOpen) return null;

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chat Themes</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="themes-grid">
            {THEMES.map(theme => (
              <div
                key={theme.id}
                className={`theme-item ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => onSelectTheme(theme.id)}
              >
                <div
                  className="theme-preview"
                  style={{ background: theme.color }}
                />
                <span>{theme.name}</span>
              </div>
            ))}
          </div>

          <div className="custom-bg-section">
            <h4>Custom Background</h4>
            <div className="bg-controls">
              <label className="upload-btn">
                🖼️ Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadBackground}
                  hidden
                />
              </label>

              {hasCustomBg && (
                <button className="remove-bg-btn" onClick={onRemoveBackground}>
                  ❌ Remove Background
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .theme-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }

        .theme-modal {
          background: #ffffff;
          padding: 24px;
          border-radius: 20px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #1e293b;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
        }

        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .theme-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .theme-item:hover {
          transform: scale(1.05);
        }

        .theme-preview {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid transparent;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .theme-item.active .theme-preview {
          border-color: #7c3aed;
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px #7c3aed;
        }

        .theme-item span {
          font-size: 0.8rem;
          font-weight: 500;
          color: #475569;
        }

        .custom-bg-section h4 {
          margin: 0 0 12px 0;
          font-size: 0.95rem;
          color: #334155;
        }

        .bg-controls {
          display: flex;
          gap: 12px;
        }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #f1f5f9;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #334155;
          transition: 0.2s;
        }

        .upload-btn:hover {
          background: #e2e8f0;
        }

        .remove-bg-btn {
          padding: 10px 16px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: 0.2s;
        }

        .remove-bg-btn:hover {
          background: #fecaca;
        }

        /* Dark Mode Support within Modal */
        @media (prefers-color-scheme: dark) {
           .theme-modal {
             background: #1e293b;
             color: #f8fafc;
           }
           .modal-header h3 { color: #f8fafc; }
           .theme-item span { color: #cbd5e1; }
           .custom-bg-section h4 { color: #cbd5e1; }
           .upload-btn { background: #334155; color: #f1f5f9; }
           .upload-btn:hover { background: #475569; }
        }
      `}</style>
    </div>
  );
};

export default ThemeModal;
