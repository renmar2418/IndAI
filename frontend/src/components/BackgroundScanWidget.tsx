import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBackgroundScan } from '../context/BackgroundScanContext';

export default function BackgroundScanWidget() {
  const { activeScanId, scanData, cancelScan } = useBackgroundScan();
  const location = useLocation();
  const navigate = useNavigate();

  // Widget state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Don't show if no active scan, or if user is on the GitHub repos page
  if (!activeScanId || !scanData) return null;
  if (location.pathname === '/github') return null;

  const isCompleted = scanData.status === 'completed';
  const isFailed = scanData.status === 'failed';

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 340,
        backgroundColor: 'var(--surface-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: `translate(${position.x}px, ${position.y}px)`,
        animation: 'slideUp 0.3s ease-out',
        overflow: 'hidden', // to respect border-radius
      }}
    >
      {/* Draggable Header */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          cursor: 'grab',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: isMinimized ? 'none' : '1px solid var(--border-color)',
          userSelect: 'none'
        }}
      >
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCompleted ? '✅ Scan Complete' : isFailed ? '❌ Scan Failed' : '⏳ GitHub Scan'}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {scanData.progress}%
          </span>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {!isMinimized && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {!isCompleted && !isFailed && (
            <>
              <div style={{ 
                height: 6, 
                backgroundColor: 'var(--bg-color)', 
                borderRadius: 3, 
                overflow: 'hidden' 
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${scanData.progress}%`,
                    background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                  {scanData.status === 'queued' ? 'Waiting in queue...' : `Scanning: ${scanData.current_file || 'Initializing...'}`}
                </div>
                <button
                  onClick={cancelScan}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {isCompleted && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: 4,
                padding: '8px 12px',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              View Results in Dashboard
            </button>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
