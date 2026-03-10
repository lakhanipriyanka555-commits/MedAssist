import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="glass-header">
      <div className="logo-container">
        <Link href="/" className="logo-link">
          <span className="font-bold" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>
            MedAssist
          </span>
          <span className="font-medium text-muted" style={{ marginLeft: '8px', fontSize: '14px' }}>
            Digital Pulse
          </span>
        </Link>
      </div>

      <div className="nav-actions">
        {/* RRQ Bridge - Phase 2 gateway */}
        <button
          onClick={() => {
            alert("🚨 SYSTEM TRIGGER: Bridging to Digital Pulse Phase 2 (RRQ Emergency Protocol).");
            // In a real integrated environment, this would be: 
            // window.location.href = 'https://link-to-rrq-app.com';
          }}
          className="rrq-btn"
          title="Emergency SOS (RRQ)"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          🚨 RRQ SOS
        </button>
      </div>

      <style jsx>{`
        .logo-link {
          display: flex;
          align-items: baseline;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rrq-btn {
          background-color: var(--color-error);
          color: white;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          transition: transform var(--transition-fast);
        }
        .rrq-btn:hover {
          transform: scale(1.05);
        }
        .rrq-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </header>
  );
}
