import { useEffect, useRef, useState } from 'react';
import { PanelId } from '../types';

interface Props {
  panelId: PanelId;
  title: string;
  icon?: string;
  defaultX: number;
  defaultY: number;
  width?: number;
  zIndex: number;
  children: React.ReactNode;
  onClose: () => void;
  onFocus: () => void;
}

export function DraggableWindow({
  title,
  icon,
  defaultX,
  defaultY,
  width = 440,
  zIndex,
  children,
  onClose,
  onFocus,
}: Props) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, wx: 0, wy: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const nx = origin.current.wx + (e.clientX - origin.current.mx);
      const ny = origin.current.wy + (e.clientY - origin.current.my);
      // Clamp so titlebar stays visible
      setPos({
        x: Math.max(0, Math.min(nx, window.innerWidth - width)),
        y: Math.max(0, Math.min(ny, window.innerHeight - 40)),
      });
    };
    const onUp = () => { dragging.current = false; };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [width]);

  const onTitleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, wx: pos.x, wy: pos.y };
    onFocus();
  };

  return (
    <div
      className="draggable-window"
      style={{ left: pos.x, top: pos.y, width, zIndex }}
      onMouseDown={onFocus}
    >
      <div className="window-titlebar" onMouseDown={onTitleMouseDown}>
        <span className="window-title">
          {icon && <span className="window-icon">{icon}</span>}
          {title}
        </span>
        <button
          className="window-close-btn"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close"
        >
          ✕
        </button>
      </div>
      <div className="window-body">
        {children}
      </div>
    </div>
  );
}
