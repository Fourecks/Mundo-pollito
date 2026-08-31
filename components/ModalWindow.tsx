import React, { ReactNode, useRef, useState, useEffect, useCallback, memo } from 'react';
import CloseIcon from './icons/CloseIcon';
import ExpandIcon from './icons/ExpandIcon';
import { WindowState } from '../types';

export const ModalWindowContext = React.createContext<{
  startInteraction?: (e: React.MouseEvent | React.TouchEvent, type: 'drag' | 'resize') => void;
}>({});

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

const ModalWindowComponent: React.FC<ModalWindowProps> = ({ 
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

  // Position and size state: null means use default responsive centered styles
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (
      windowState?.pos && 
      typeof windowState.pos.x === 'number' && 
      typeof windowState.pos.y === 'number' &&
      (windowState.pos.x !== 0 || windowState.pos.y !== 0) &&
      typeof window.innerWidth === 'number'
    ) {
      const safeX = Math.max(0, Math.min(window.innerWidth - 80, windowState.pos.x));
      const safeY = Math.max(0, Math.min(window.innerHeight - 40, windowState.pos.y));
      return { x: safeX, y: safeY };
    }
    return null;
  });

  const [size, setSize] = useState<{ width: number; height: number } | null>(() => {
    if (
      windowState?.size && 
      typeof windowState.size.width === 'number' && 
      typeof windowState.size.height === 'number' &&
      windowState.size.width >= 150 && 
      windowState.size.height >= 100 &&
      typeof window.innerWidth === 'number'
    ) {
      const safeWidth = Math.min(window.innerWidth - 30, Math.max(minWidth, windowState.size.width));
      const safeHeight = Math.min(window.innerHeight - 30, Math.max(minHeight, windowState.size.height));
      return { width: safeWidth, height: safeHeight };
    }
    return null;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      document.body.setAttribute('data-fullscreen-window', 'true');
    } else {
      // Small delay to prevent flashing if switching between windows
      setTimeout(() => {
        if (!document.querySelector('.is-fullscreen-window')) {
          document.body.removeAttribute('data-fullscreen-window');
        }
      }, 50);
    }
    
    return () => {
      if (isFullscreen) {
        setTimeout(() => {
          if (!document.querySelector('.is-fullscreen-window')) {
            document.body.removeAttribute('data-fullscreen-window');
          }
        }, 50);
      }
    };
  }, [isFullscreen]);

  // Refs for tracking live coordinates without causing component re-renders
  const currentPosRef = useRef<{ x: number; y: number } | null>(pos);
  const currentSizeRef = useRef<{ width: number; height: number } | null>(size);
  const rafIdRef = useRef<number | null>(null);

  const interactionStateRef = useRef({
    active: false,
    type: null as 'drag' | 'resize' | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    originWidth: 0,
    originHeight: 0,
    lastX: 0,
    lastY: 0,
    lastW: 0,
    lastH: 0,
  });

  // Sync state if windowState was provided later and we have no state yet
  useEffect(() => {
    if (isOpen && pos === null && size === null && windowState?.pos && windowState?.size) {
      if (
        typeof windowState.size.width === 'number' && 
        typeof windowState.size.height === 'number' &&
        windowState.size.width >= 150 && 
        windowState.size.height >= 100 &&
        (windowState.pos.x !== 0 || windowState.pos.y !== 0)
      ) {
        const safeWidth = Math.min(window.innerWidth - 30, Math.max(minWidth, windowState.size.width));
        const safeHeight = Math.min(window.innerHeight - 30, Math.max(minHeight, windowState.size.height));
        const safeX = Math.max(0, Math.min(window.innerWidth - 80, windowState.pos.x));
        const safeY = Math.max(0, Math.min(window.innerHeight - 40, windowState.pos.y));
        
        const newPos = { x: safeX, y: safeY };
        const newSize = { width: safeWidth, height: safeHeight };
        setPos(newPos);
        setSize(newSize);
        currentPosRef.current = newPos;
        currentSizeRef.current = newSize;
      }
    }
  }, [isOpen, windowState, minWidth, minHeight, pos, size]);

  // Keep refs synchronized with state
  useEffect(() => {
    currentPosRef.current = pos;
  }, [pos]);
  useEffect(() => {
    currentSizeRef.current = size;
  }, [size]);

  // High-performance direct DOM dragging and resizing via requestAnimationFrame
  const onPointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    const info = interactionStateRef.current;
    if (!info.active || !info.type || !modalRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - info.startX;
    const deltaY = clientY - info.startY;

    if (info.type === 'drag') {
      const minVisibleHeaderX = 80;
      const currentW = info.originWidth || 500;
      
      const newX = Math.max(-currentW + minVisibleHeaderX, Math.min(window.innerWidth - minVisibleHeaderX, info.originX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 44, info.originY + deltaY));

      info.lastX = Math.round(newX);
      info.lastY = Math.round(newY);

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (modalRef.current) {
            modalRef.current.style.left = `${info.lastX}px`;
            modalRef.current.style.top = `${info.lastY}px`;
            modalRef.current.style.transform = 'none';
          }
          rafIdRef.current = null;
        });
      }
    } else if (info.type === 'resize') {
      const minW = Math.max(200, minWidth || 320);
      const minH = Math.max(120, minHeight || 200);

      const maxW = Math.max(minW, window.innerWidth - info.originX - 10);
      const maxH = Math.max(minH, window.innerHeight - info.originY - 10);

      const newW = Math.round(Math.min(maxW, Math.max(minW, info.originWidth + deltaX)));
      const newH = Math.round(Math.min(maxH, Math.max(minH, info.originHeight + deltaY)));

      info.lastW = newW;
      info.lastH = newH;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (modalRef.current) {
            modalRef.current.style.width = `${info.lastW}px`;
            modalRef.current.style.height = `${info.lastH}px`;
          }
          rafIdRef.current = null;
        });
      }
    }
  }, [minWidth, minHeight]);

  const onPointerUp = useCallback(() => {
    const info = interactionStateRef.current;
    if (!info.active) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);

    const finalPos = { x: info.lastX, y: info.lastY };
    const finalSize = { width: info.lastW, height: info.lastH };

    info.active = false;
    info.type = null;
    setIsInteracting(false);

    if (modalRef.current) {
      modalRef.current.style.willChange = 'auto';
    }

    // Commit final coordinates to React state without unmounting
    setPos(finalPos);
    setSize(finalSize);
    currentPosRef.current = finalPos;
    currentSizeRef.current = finalSize;

    // Send update to parent callback
    onStateChange?.({
      pos: finalPos,
      size: finalSize,
    });
  }, [onPointerMove, onStateChange]);

  const startInteraction = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, type: 'drag' | 'resize') => {
    onFocus?.();
    e.stopPropagation();

    if (type === 'drag') {
      const target = e.target as HTMLElement;
      // Never drag when clicking buttons, inputs, links or .no-drag
      if (target.closest('button, input, select, textarea, a, .no-drag')) {
        return;
      }
    }

    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();

    const initialX = currentPosRef.current ? currentPosRef.current.x : Math.round(rect.left);
    const initialY = currentPosRef.current ? currentPosRef.current.y : Math.round(rect.top);
    const initialW = currentSizeRef.current ? currentSizeRef.current.width : Math.round(rect.width);
    const initialH = currentSizeRef.current ? currentSizeRef.current.height : Math.round(rect.height);

    const initialPos = { x: initialX, y: initialY };
    const initialSize = { width: initialW, height: initialH };

    // Update state & refs immediately so isCustomPlaced is active
    setPos(initialPos);
    setSize(initialSize);
    currentPosRef.current = initialPos;
    currentSizeRef.current = initialSize;

    // Lock element inline styles and cancel CSS keyframe animations
    modalRef.current.style.animation = 'none';
    modalRef.current.style.left = `${initialX}px`;
    modalRef.current.style.top = `${initialY}px`;
    modalRef.current.style.width = `${initialW}px`;
    modalRef.current.style.height = `${initialH}px`;
    modalRef.current.style.transform = 'none';
    modalRef.current.style.willChange = 'left, top, width, height';

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    interactionStateRef.current = {
      active: true,
      type,
      startX: clientX,
      startY: clientY,
      originX: initialX,
      originY: initialY,
      originWidth: initialW,
      originHeight: initialH,
      lastX: initialX,
      lastY: initialY,
      lastW: initialW,
      lastH: initialH,
    };

    setIsInteracting(true);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }, [onFocus, onPointerMove, onPointerUp]);

  // Clean up any lingering window listeners and rAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  if (!isOpen) return null;

  // Fullscreen Mode
  if (isFullscreen) {
    return (
    <ModalWindowContext.Provider value={{ startInteraction }}>
      <div
        ref={modalRef}
        onClick={onFocus}
        className="fixed inset-0 flex flex-col bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100 overflow-hidden select-auto animate-fade-in pointer-events-auto is-fullscreen-window"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 60000 }}
      >
        {!noHeader && (
          <header 
            className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md shrink-0 select-none"
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
    </ModalWindowContext.Provider>
    );
  }

  // Resizer Handle
  const Resizer = () => (
    <div
      onMouseDown={(e) => startInteraction(e, 'resize')}
      onTouchStart={(e) => startInteraction(e, 'resize')}
      className="absolute bottom-1 right-1 w-6 h-6 cursor-nwse-resize z-40 flex items-end justify-end p-1 select-none text-gray-400 hover:text-primary transition-colors touch-none"
      title="Arrastra para redimensionar"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 15L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 15L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );

  const isCustomPlaced = pos !== null && size !== null;

  // Single persistent DOM root: NEVER unmounts or remounts children!
  const computedStyle: React.CSSProperties = isInteracting ? {
    position: 'fixed',
    margin: 0,
    zIndex: zIndex ?? 50,
  } : (isCustomPlaced ? {
    position: 'fixed',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    transform: 'none',
    margin: 0,
    zIndex: zIndex ?? 50,
  } : {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    margin: 0,
    zIndex: zIndex ?? 50,
  });

  return (
    <ModalWindowContext.Provider value={{ startInteraction }}>
    <>
      {/* Invisible backdrop during active drag/resize so iframes & inputs don't intercept pointer events */}
      {isInteracting && (
        <div 
          className="fixed inset-0 select-none pointer-events-auto"
          style={{ 
            zIndex: 999999, 
            cursor: interactionStateRef.current.type === 'resize' ? 'nwse-resize' : 'move',
            userSelect: 'none'
          }}
        />
      )}

      <div
        ref={modalRef}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
        onMouseDown={() => onFocus?.()}
        style={computedStyle}
        className={`
          ${!frameless ? `bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}` : 'relative flex flex-col'}
          ${!isCustomPlaced ? (className || 'w-[92vw] max-w-3xl h-[80vh]') : ''}
          ${!isCustomPlaced ? 'animate-deploy' : ''}
          pointer-events-auto select-auto
        `}
      >
        {frameless ? (
          <>

            {children}
          </>
        ) : (
          <>
            {!noHeader && (
              <header 
                onMouseDown={isDraggable ? (e) => startInteraction(e, 'drag') : undefined}
                onTouchStart={isDraggable ? (e) => startInteraction(e, 'drag') : undefined}
                className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-900/60 backdrop-blur-md shrink-0 select-none ${isDraggable ? 'cursor-move touch-none' : 'cursor-default'}`}
                onDoubleClick={() => {
                  if (allowFullscreen) {
                    setIsFullscreen(true);
                  } else if (isCustomPlaced) {
                    // Reset to center
                    setPos(null);
                    setSize(null);
                    currentPosRef.current = null;
                    currentSizeRef.current = null;
                    if (modalRef.current) {
                      modalRef.current.style.left = '50%';
                      modalRef.current.style.top = '50%';
                      modalRef.current.style.width = '';
                      modalRef.current.style.height = '';
                      modalRef.current.style.transform = 'translate(-50%, -50%)';
                    }
                    onStateChange?.({ pos: { x: 0, y: 0 }, size: { width: 0, height: 0 } });
                  }
                }}
                title={isDraggable ? (allowFullscreen ? "Arrastra para mover • Doble clic para pantalla completa" : "Arrastra para mover • Doble clic para centrar") : undefined}
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
    </>
    </ModalWindowContext.Provider>
  );
};

export const ModalWindow = memo(ModalWindowComponent);
export default ModalWindow;
