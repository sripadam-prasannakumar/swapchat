import React, { useState } from 'react';
import '../pages/Themes.css';

export const THEMES = [
  { id: 'default', name: 'Default', color: '#e0e7ff', animated: false },
  { id: 'ocean', name: 'Ocean', color: '#dbeafe', animated: false },
  { id: 'love', name: 'Love', color: '#ffe4e6', animated: false },
  { id: 'midnight', name: 'Midnight', color: '#0f172a', animated: false },
  { id: 'sunset', name: 'Sunset', color: '#fff7ed', animated: false },
  { id: 'mint', name: 'Mint', color: '#ecfdf5', animated: false },
  { id: 'neon', name: 'Neon', color: '#000000', animated: false },
  { id: '3d-ocean', name: '3D Ocean', color: '#3b82f6', animated: false },
  { id: '3d-sunset', name: '3D Sunset', color: '#be123c', animated: false },
  { id: '3d-neon', name: '3D Neon', color: '#27272a', animated: false },
  { id: 'instagram', name: 'Instagram', color: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)', animated: false },
  // ── Animated Classics ──
  { id: 'aurora', name: 'Aurora', color: 'linear-gradient(135deg, #0a3d2e, #0e4d6b, #2d0a4e)', animated: true },
  { id: 'galaxy', name: 'Galaxy', color: 'linear-gradient(135deg, #050510, #0b0d2a, #4f46e5)', animated: true },
  { id: 'fire', name: 'Fire', color: 'linear-gradient(135deg, #7c1500, #f97316)', animated: true },
  { id: 'matrix', name: 'Matrix', color: 'linear-gradient(135deg, #000500, #00cc33)', animated: true },
  { id: 'sakura', name: 'Sakura', color: 'linear-gradient(135deg, #fbcfe8, #ec4899)', animated: true },
  // ── Instagram-Style Animated ──
  { id: 'insta-animated', name: '📸 Insta', color: 'linear-gradient(135deg, #405de6, #833ab4, #e1306c, #fd1d1d, #fcb045)', animated: true, icon: '🌈' },
  { id: 'neon-pulse', name: '💜 Neon Pulse', color: 'linear-gradient(135deg, #0a0010, #7c3aed, #ec4899)', animated: true, icon: '💜' },
  { id: 'ocean-waves', name: '🌊 Ocean Waves', color: 'linear-gradient(135deg, #001233, #0096c7, #48cae4)', animated: true, icon: '🌊' },
  { id: 'sunset-drift', name: '🌅 Sunset', color: 'linear-gradient(135deg, #0f0500, #d97706, #f59e0b)', animated: true, icon: '🌅' },
  { id: 'cosmic-dust', name: '🔮 Cosmic', color: 'linear-gradient(135deg, #1e0a4e, #7c3aed, #a78bfa)', animated: true, icon: '🔮' },
  { id: 'lava-lamp', name: '🔴 Lava', color: 'linear-gradient(135deg, #0d0000, #b91c1c, #dc2626)', animated: true, icon: '🔴' },
  { id: 'cyber-rain', name: '🟢 Cyber Rain', color: 'linear-gradient(135deg, #001a0a, #00cc6a, #00ff88)', animated: true, icon: '🟢' },
];

const ThemeModal = ({ isOpen, onClose, onSelectTheme, currentTheme, onUploadBackground, onRemoveBackground, hasCustomBg }) => {
  const [pendingTheme, setPendingTheme] = useState(null);

  if (!isOpen) return null;

  const activeSelection = pendingTheme || currentTheme;
  const hasChange = pendingTheme && pendingTheme !== currentTheme;

  const handleSave = () => {
    if (hasChange) {
      onSelectTheme(pendingTheme);
      setPendingTheme(null);
    }
    onClose();
  };

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal font-display" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chat customization</h3>
          <button className="close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body space-y-8">
          {/* Static Themes */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">Vibrant Themes</h4>
            <div className="themes-grid custom-scrollbar">
              {THEMES.filter(t => !t.animated).map(theme => (
                <div
                  key={theme.id}
                  className={`theme-item group ${activeSelection === theme.id ? 'active' : ''}`}
                  onClick={() => setPendingTheme(theme.id)}
                >
                  <div
                    className="theme-preview"
                    style={{ background: theme.color }}
                  >
                    {activeSelection === theme.id && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                  </div>
                  <span>{theme.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Classic Animated Themes */}
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-sm font-bold uppercase tracking-widest ml-1" style={{ background: 'linear-gradient(90deg,#a855f7,#ec4899,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✨ Animated Themes</h4>
            <div className="themes-grid custom-scrollbar">
              {THEMES.filter(t => t.animated && !t.icon).map(theme => (
                <div
                  key={theme.id}
                  className={`theme-item group ${activeSelection === theme.id ? 'active' : ''}`}
                  onClick={() => setPendingTheme(theme.id)}
                >
                  <div
                    className="theme-preview relative overflow-hidden"
                    style={{ background: theme.color }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[18px] animate-pulse">✨</span>
                    {activeSelection === theme.id && <span className="material-symbols-outlined text-white text-[16px] relative z-10">check</span>}
                  </div>
                  <span>{theme.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instagram-Style Animated Themes */}
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 ml-1 mb-1">
              <span className="text-lg">📸</span>
              <h4 className="text-sm font-bold uppercase tracking-widest" style={{ background: 'linear-gradient(90deg, #405de6, #833ab4, #e1306c, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Instagram Themes</h4>
            </div>
            <div className="themes-grid custom-scrollbar">
              {THEMES.filter(t => t.animated && t.icon).map(theme => (
                <div
                  key={theme.id}
                  className={`theme-item group ${activeSelection === theme.id ? 'active' : ''}`}
                  onClick={() => setPendingTheme(theme.id)}
                >
                  <div
                    className="theme-preview relative overflow-hidden"
                    style={{ background: theme.color }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[22px]" style={{ animation: 'pulse 2s ease-in-out infinite' }}>{theme.icon}</span>
                    {activeSelection === theme.id && <span className="material-symbols-outlined text-white text-[16px] relative z-10" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>check</span>}
                  </div>
                  <span>{theme.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="custom-bg-section pt-8 border-t border-slate-100 dark:border-border-dark">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1 mb-6">Background Image</h4>
            <div className="bg-controls">
              <label className="upload-btn">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadBackground}
                  hidden
                />
              </label>

              {hasCustomBg && (
                <button className="remove-bg-btn" onClick={onRemoveBackground}>
                  <span className="material-symbols-outlined">delete_sweep</span>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={!hasChange}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '1rem',
                background: hasChange
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(148,163,184,0.2)',
                color: hasChange ? 'white' : 'rgba(100,116,139,0.6)',
                cursor: hasChange ? 'pointer' : 'not-allowed',
                boxShadow: hasChange ? '0 10px 20px -5px rgba(99,102,241,0.4)' : 'none',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              {hasChange ? `Apply ${THEMES.find(t => t.id === pendingTheme)?.name} Theme` : 'Select a theme above'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .theme-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10003;
          animation: cgFadeIn 0.3s ease;
        }

        .theme-modal {
          background: #ffffff;
          padding: 40px;
          border-radius: 32px;
          width: 90%;
          max-width: 480px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.15),
            0 0 32px rgba(99, 102, 241, 0.1);
          animation: modalScale 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        body.dark .theme-modal {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        @keyframes modalScale {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .close-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: var(--transition-normal);
        }

        .close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fecaca;
        }

        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 20px;
          padding: 4px;
        }

        .theme-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: var(--transition-normal);
        }

        .theme-item:hover {
          transform: translateY(-4px);
        }

        .theme-preview {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          border: 4px solid transparent;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-normal);
        }

        .theme-item.active .theme-preview {
          border-color: var(--accent-light);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
          transform: scale(1.05);
        }

        .theme-item span {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .theme-item.active span {
          color: var(--primary);
        }

        .bg-controls {
          display: flex;
          gap: 16px;
        }

        .upload-btn, .remove-bg-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 800;
          transition: var(--transition-normal);
          cursor: pointer;
        }

        .upload-btn {
          background: var(--primary-gradient);
          color: white;
          box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
        }

        .upload-btn:hover {
          box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }

        .remove-bg-btn {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fecaca;
        }

        .remove-bg-btn:hover {
          background: #fee2e2;
          border-color: #f87171;
        }

        body.dark .remove-bg-btn {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }

        body.dark .remove-bg-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ThemeModal;
