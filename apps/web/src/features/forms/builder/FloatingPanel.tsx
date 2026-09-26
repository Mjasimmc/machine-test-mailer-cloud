import React, { useState, useRef, useEffect, useCallback } from 'react';
import './FloatingPanel.scss';

export interface FloatingPanelProps {
  title: string;
  icon?: string;
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  title,
  icon,
  isOpen,
  onClose,
  defaultPosition,
  width = 340,
  height = 'auto',
  maxHeight = 'calc(100vh - 140px)',
  children,
  headerExtra,
}) => {
  // Initial position calculation (default: bottom left/center above toolbar)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    const initialX = Math.max(24, Math.round(window.innerWidth / 2 - 170));
    const initialY = Math.max(70, window.innerHeight - 560);
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag start
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header, ignore buttons inside header
    if ((e.target as HTMLElement).closest('.floating-panel__close-btn')) return;

    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Drag move
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      const panelEl = panelRef.current;
      const panelWidth = panelEl ? panelEl.offsetWidth : 340;
      const panelHeight = panelEl ? panelEl.offsetHeight : 400;

      // Keep within viewport bounds
      const minX = 12;
      const maxX = Math.max(minX, window.innerWidth - panelWidth - 12);
      const minY = 62; // Below sticky header
      const maxY = Math.max(minY, window.innerHeight - panelHeight - 64); // Above bottom toolbar

      let newX = e.clientX - dragOffsetRef.current.x;
      let newY = e.clientY - dragOffsetRef.current.y;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    },
    [isDragging],
  );

  // Drag end
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Adjust position on window resize to ensure panel stays within screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const panelEl = panelRef.current;
        const panelWidth = panelEl ? panelEl.offsetWidth : 340;
        const panelHeight = panelEl ? panelEl.offsetHeight : 400;
        const maxX = Math.max(12, window.innerWidth - panelWidth - 12);
        const maxY = Math.max(62, window.innerHeight - panelHeight - 64);
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`floating-panel ${isDragging ? 'floating-panel--dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      }}
    >
      <div className="floating-panel__header" onPointerDown={handlePointerDown}>
        <div className="floating-panel__title-group">
          <span className="material-icon floating-panel__grip">drag_indicator</span>
          {icon && <span className="material-icon floating-panel__icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="floating-panel__actions">
          {headerExtra}
          <button
            type="button"
            className="floating-panel__close-btn"
            onClick={onClose}
            title="Close panel"
          >
            <span className="material-icon">close</span>
          </button>
        </div>
      </div>
      <div className="floating-panel__body">{children}</div>
    </div>
  );
};
