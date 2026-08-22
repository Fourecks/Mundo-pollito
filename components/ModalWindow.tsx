import React, { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import CloseIcon from './icons/CloseIcon';
import ExpandIcon from './icons/ExpandIcon';
import { WindowState } from '../types';

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  frameless?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  windowState?: WindowState | null;
  onStateChange?: (state: WindowState) => void;
  zIndex?: number;
  onFocus?: () => void;
  noHeader?: boolean;
  allowFullscreen?: boolean;
  overflowVisible?: boolean;
}

const ModalWindow: React.FC<ModalWindowProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '', 
  frameless = false, 
  isDraggable = false, 
  isResizable = false, 
  minWidth = 320,
  minHeight = 200,
  windowState, 
  onStateChange, 
  zIndex, 
  onFocus, 
  noHeader = false,
  allowFullscreen = false,
  overflowVisible = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeInteraction, setActiveInteraction] = useState<'drag' | 'resize' | null>(null);

  const lastPos = useRef(pos);
  useEffect(() => { lastPos.current = pos; }, [pos]);
  const lastSize = useRef(size);
  useEffect(() => { lastSize.current = size; }, [size]);

  const interactionInfo = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    modalX: 0,
    modalY: 0,
  });

  // Sync with incoming windowState prop if valid
  useEffect(() => {
    if (isOpen) {
      if (
        windowState?.pos && 
        windowState?.size && 
        typeof windowState.size.width === 'number' && 
        typeof windowState.size.height === 'number' &&
        windowState.size.width >= (minWidth || 200) && 
        windowState.size.height >= (minHeight || 120)
      ) {
        // Clamp saved positions so window is visible
        const safeX = Math.max(-windowState.size.width + 100, Math.min(window.innerWidth - 100, windowState.pos.x));
        const safeY = Math.max(0, Math.min(window.innerHeight - 60, windowState.pos.y));
        setPos({ x: safeX, y: safeY });
        setSize(windowState.size);
        setHasInteracted(true);
      } else if (!hasInteracted) {
        setHasInteracted(false);
        setPos({ x: 0, y: 0 });
        setSize({ width: 0, height: 0 });
      }
    }
  }, [isOpen, windowState, minWidth, minHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionInfo.current.isDragging) {
      const dx = e.clientX - interactionInfo.current.startX;
      const dy = e.clientY - interactionInfo.current.startY;
      
      const rawX = interactionInfo.current.modalX + dx;
      const rawY = interactionInfo.current.modalY + dy;
      
      const currentW = lastSize.current.width > 0 ? lastSize.current.width : 400;
      // Clamp bounds so window header cannot be dragged out of viewport
      const clampedX = Math.max(-currentW + 80, Math.min(window.innerWidth - 80, rawX));
      const clampedY = Math.max(0, Math.min(window.innerHeight - 48, rawY));

      const newPos = { x: clampedX, y: clampedY };
      setPos(newPos);
      lastPos.current = newPos;
    } else if (interactionInfo.current.isResizing) {
      const dw = e.clientX - interactionInfo.current.startX;
      const dh = e.clientY - interactionInfo.current.startY;
      const minW = minWidth ?? 320;
      const minH = minHeight ?? 200;
      
      const newWidth = Math.max(minW, Math.min(window.innerWidth - 20, interactionInfo.current.startWidth + dw));
      const newHeight = Math.max(minH, Math.min(window.innerHeight - 20, interactionInfo.current.startHeight + dh));
      
      const newSize = { width: newWidth, height: newHeight };
      setSize(newSize);
      lastSize.current = newSize;
    }
  }, [minWidth, minHeight]);

  const handleMouseUp = useCallback(() => {
    const wasDragging = interactionInfo.current.isDragging;
    const wasResizing = interactionInfo.current.isResizing;

    interactionInfo.current.isDragging = false;
    interactionInfo.current.isResizing = false;
    setActiveInteraction(null);

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    if (wasDragging || wasResizing) {
      if (lastSize.current.width >= (minWidth || 200) && lastSize.current.height >= (minHeight || 120)) {
        onStateChange?.({ pos: lastPos.current, size: lastSize.current });
      }
    }
  }, [handleMouseMove, onStateChange, minWidth, minHeight]);
  
  const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLElement>, type: 'drag' | 'resize') => {
    onFocus?.();
    e.stopPropagation();

    // Prevent dragging if user is clicking on interactive elements inside header
    if (type === 'drag') {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, .no-drag')) {
        return;
      }
    }

    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();

    let currentPos = pos;
    let currentSize = size;
    
    // First interaction snapshot
    if (!hasInteracted || currentSize.width <= 0 || currentSize.height <= 0) {
      currentPos = { x: Math.round(rect.left), y: Math.round(rect.top) };
      currentSize = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setPos(currentPos);
      setSize(currentSize);
      lastPos.current = currentPos;
      lastSize.current = currentSize;
      setHasInteracted(true);
    }

    if (type === 'drag') {
      interactionInfo.current = {
        isDragging: true,
        isResizing: false,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: currentSize.width || Math.round(rect.width),
        startHeight: currentSize.height || Math.round(rect.height),
        modalX: currentPos.x || Math.round(rect.left),
        modalY: currentPos.y || Math.round(rect.top),
      };
    } else {
      interactionInfo.current = {
        isResizing: true,
        isDragging: false,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: currentSize.width || Math.round(rect.width),
        startHeight: currentSize.height || Math.round(rect.height),
        modalX: currentPos.x || Math.round(rect.left),
        modalY: currentPos.y || Math.round(rect.top),
      };
    }

    setActiveInteraction(type);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [pos, size, hasInteracted, onFocus, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  // Fullscreen View
  if (isFullscreen) {
    return (
      <div
        ref={modalRef}
        onClick={onFocus}
        className="fixed inset-0 z-[50000] flex flex-col bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100 overflow-hidden select-auto animate-fade-in pointer-events-auto shadow-none"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 50000 }}
      >
        {!noHeader && (
          <header 
            className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md shrink-0 select-none"
            onDoubleClick={() => setIsFullscreen(false)}
            title="Doble clic para restaurar ventana"
          >
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {allowFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Salir de pantalla completa (Restaurar)"
                  aria-label="Salir de pantalla completa"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth={2}
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                title="Cerrar ventana"
                aria-label="Cerrar ventana"
              >
                <CloseIcon />
              </button>
            </div>
          </header>
        )}
        <main className={`flex-1 min-h-0 w-full flex flex-col relative ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}>
          {children}
        </main>
      </div>
    );
  }

  // Windowed View (Free Moving or Centered Initial)
  const Resizer = () => (
    <div
      onMouseDown={(e) => handleInteractionStart(e, 'resize')}
      className="absolute bottom-1 right-1 w-6 h-6 cursor-nwse-resize z-30 flex items-end justify-end p-1 select-none text-gray-400/70 hover:text-primary transition-colors"
      title="Arrastra para redimensionar"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 15L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 15L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );

  const windowInner = (
    <div
      ref={modalRef}
      onMouseDown={(e) => {
        onFocus?.();
        if (isDraggable) {
          const target = e.target as HTMLElement;
          if (target.closest('.drag-handle') && !target.closest('button, input, select, textarea, a, .no-drag')) {
            handleInteractionStart(e, 'drag');
          }
        }
      }}
      style={hasInteracted ? {
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        margin: 0,
        zIndex: zIndex ?? 50,
      } : undefined}
      className={`
        ${!frameless ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden' : 'relative flex flex-col'}
        ${!hasInteracted ? (className || 'w-full max-w-3xl h-[80vh]') : ''}
        ${!hasInteracted ? 'animate-deploy' : ''}
        relative pointer-events-auto
      `}
      onClick={(e) => {
        e.stopPropagation();
        onFocus?.();
      }}
    >
      {frameless ? (
        children
      ) : (
        <>
          {!noHeader && (
            <header 
              onMouseDown={isDraggable ? (e) => handleInteractionStart(e, 'drag') : undefined}
              className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/70 dark:bg-gray-900/50 backdrop-blur-md shrink-0 select-none drag-handle ${isDraggable ? 'cursor-move' : 'cursor-default'}`}
              onDoubleClick={() => {
                if (allowFullscreen) {
                  setIsFullscreen(true);
                } else if (hasInteracted) {
                  // Double-click resets custom placement to center
                  setHasInteracted(false);
                  setPos({ x: 0, y: 0 });
                  setSize({ width: 0, height: 0 });
                  onStateChange?.({ pos: { x: 0, y: 0 }, size: { width: 0, height: 0 } });
                }
              }}
              title={isDraggable ? (allowFullscreen ? "Arrastra para mover libremente • Doble clic para pantalla completa" : "Arrastra para mover libremente • Doble clic para centrar") : undefined}
            >
              <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{title}</h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {allowFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreen(true);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Pantalla completa"
                    aria-label="Pantalla completa"
                  >
                    <ExpandIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Cerrar ventana"
                  aria-label="Cerrar ventana"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>
          )}
          <main className={`flex-1 min-h-0 w-full flex flex-col relative ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
            {children}
          </main>
        </>
      )}
      {isResizable && <Resizer />}
    </div>
  );

  return (
    <>
      {/* Invisible overlay during active drag/resize so iframes or canvas don't swallow mouse events */}
      {activeInteraction && (
        <div 
          className="fixed inset-0 z-[999999] select-none pointer-events-auto"
          style={{ cursor: activeInteraction === 'resize' ? 'nwse-resize' : 'move' }}
        />
      )}

      {hasInteracted ? (
        windowInner
      ) : (
        <div
          className="fixed inset-0 p-2 sm:p-4 flex items-center justify-center pointer-events-none"
          aria-modal="true"
          role="dialog"
          style={{ zIndex: zIndex ?? 50 }}
        >
          {windowInner}
        </div>
      )}
    </>
  );
};

export default ModalWindow;
