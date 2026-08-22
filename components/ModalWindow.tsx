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

  // Position and size state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeInteraction, setActiveInteraction] = useState<'drag' | 'resize' | null>(null);

  // Real-time tracking refs to avoid stale closure issues during mouse events
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const interactionRef = useRef({
    type: null as 'drag' | 'resize' | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    originWidth: 0,
    originHeight: 0,
  });

  // Sync state with incoming props
  useEffect(() => {
    if (isOpen) {
      if (
        windowState?.pos && 
        windowState?.size && 
        typeof windowState.size.width === 'number' && 
        typeof windowState.size.height === 'number' &&
        windowState.size.width >= 150 && 
        windowState.size.height >= 100
      ) {
        // Clamp saved coordinates safely
        const safeWidth = Math.min(window.innerWidth - 40, Math.max(minWidth, windowState.size.width));
        const safeHeight = Math.min(window.innerHeight - 40, Math.max(minHeight, windowState.size.height));
        const safeX = Math.max(10, Math.min(window.innerWidth - safeWidth - 10, windowState.pos.x));
        const safeY = Math.max(10, Math.min(window.innerHeight - safeHeight - 10, windowState.pos.y));
        
        setPos({ x: safeX, y: safeY });
        setSize({ width: safeWidth, height: safeHeight });
      }
    }
  }, [isOpen, windowState, minWidth, minHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { type, startX, startY, originX, originY, originWidth, originHeight } = interactionRef.current;
    if (!type) return;

    if (type === 'drag') {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const currentWidth = sizeRef.current?.width || originWidth || 500;
      const currentHeight = sizeRef.current?.height || originHeight || 400;

      // Keep window within reachable bounds of the viewport
      const minVisibleHeaderX = 80;
      const newX = Math.max(-currentWidth + minVisibleHeaderX, Math.min(window.innerWidth - minVisibleHeaderX, originX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 50, originY + deltaY));

      const newPos = { x: Math.round(newX), y: Math.round(newY) };
      setPos(newPos);
      posRef.current = newPos;
    } else if (type === 'resize') {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const minW = Math.max(200, minWidth || 320);
      const minH = Math.max(120, minHeight || 200);

      const maxW = Math.max(minW, window.innerWidth - (posRef.current?.x ?? 0) - 10);
      const maxH = Math.max(minH, window.innerHeight - (posRef.current?.y ?? 0) - 10);

      const newW = Math.round(Math.min(maxW, Math.max(minW, originWidth + deltaX)));
      const newH = Math.round(Math.min(maxH, Math.max(minH, originHeight + deltaY)));

      const newSize = { width: newW, height: newH };
      setSize(newSize);
      sizeRef.current = newSize;
    }
  }, [minWidth, minHeight]);

  const handleMouseUp = useCallback(() => {
    const activeType = interactionRef.current.type;
    interactionRef.current.type = null;
    setActiveInteraction(null);

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    // Persist final position & size if modified
    if (activeType && posRef.current && sizeRef.current) {
      onStateChange?.({
        pos: posRef.current,
        size: sizeRef.current,
      });
    }
  }, [handleMouseMove, onStateChange]);

  const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLElement>, type: 'drag' | 'resize') => {
    onFocus?.();
    e.stopPropagation();

    if (type === 'drag') {
      const target = e.target as HTMLElement;
      // Do not initiate drag when clicking buttons, inputs or elements with no-drag class
      if (target.closest('button, input, select, textarea, a, .no-drag')) {
        return;
      }
    }

    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();

    // Use current bounding rect if pos/size were not explicitly set yet
    const currentX = posRef.current?.x ?? Math.round(rect.left);
    const currentY = posRef.current?.y ?? Math.round(rect.top);
    const currentW = sizeRef.current?.width ?? Math.round(rect.width);
    const currentH = sizeRef.current?.height ?? Math.round(rect.height);

    // Immediately snap state to fixed coordinates so transition from center to absolute is seamless
    const currentPos = { x: currentX, y: currentY };
    const currentSize = { width: currentW, height: currentH };
    setPos(currentPos);
    setSize(currentSize);
    posRef.current = currentPos;
    sizeRef.current = currentSize;

    interactionRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      originX: currentX,
      originY: currentY,
      originWidth: currentW,
      originHeight: currentH,
    };

    setActiveInteraction(type);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onFocus, handleMouseMove, handleMouseUp]);

  // Clean up global listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  // Fullscreen Mode
  if (isFullscreen) {
    return (
      <div
        ref={modalRef}
        onClick={onFocus}
        className="fixed inset-0 flex flex-col bg-white dark:bg-[#121214] text-gray-900 dark:text-gray-100 overflow-hidden select-auto animate-fade-in pointer-events-auto"
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
    );
  }

  // Resizer Handle
  const Resizer = () => (
    <div
      onMouseDown={(e) => handleInteractionStart(e, 'resize')}
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

  const hasCustomTransform = pos !== null && size !== null;

  return (
    <>
      {/* Invisible overlay during drag/resize to prevent losing pointer events over iframes/inputs */}
      {activeInteraction && (
        <div 
          className="fixed inset-0 select-none pointer-events-auto"
          style={{ 
            zIndex: 999999, 
            cursor: activeInteraction === 'resize' ? 'nwse-resize' : 'move',
            userSelect: 'none'
          }}
        />
      )}

      {/* When not interacted, render in centered layout overlay with pointer-events-none on backdrop */}
      {!hasCustomTransform ? (
        <div
          className="fixed inset-0 p-3 sm:p-5 flex items-center justify-center pointer-events-none"
          aria-modal="true"
          role="dialog"
          style={{ zIndex: zIndex ?? 50 }}
        >
          <div
            ref={modalRef}
            onClick={(e) => {
              e.stopPropagation();
              onFocus?.();
            }}
            onMouseDown={() => onFocus?.()}
            className={`
              ${!frameless ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden' : 'relative flex flex-col'}
              ${className || 'w-full max-w-3xl h-[80vh]'}
              animate-deploy relative pointer-events-auto
            `}
          >
            {frameless ? (
              children
            ) : (
              <>
                {!noHeader && (
                  <header 
                    onMouseDown={isDraggable ? (e) => handleInteractionStart(e, 'drag') : undefined}
                    className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-900/60 backdrop-blur-md shrink-0 select-none ${isDraggable ? 'cursor-move' : 'cursor-default'}`}
                    onDoubleClick={() => {
                      if (allowFullscreen) setIsFullscreen(true);
                    }}
                    title={isDraggable ? (allowFullscreen ? "Arrastra para mover libremente • Doble clic para maximizar" : "Arrastra para mover libremente") : undefined}
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
        </div>
      ) : (
        /* Free floating mode with exact coordinates */
        <div
          ref={modalRef}
          onClick={(e) => {
            e.stopPropagation();
            onFocus?.();
          }}
          onMouseDown={() => onFocus?.()}
          style={{
            position: 'fixed',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            margin: 0,
            zIndex: zIndex ?? 50,
          }}
          className={`
            ${!frameless ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden' : 'relative flex flex-col'}
            relative pointer-events-auto
          `}
        >
          {frameless ? (
            children
          ) : (
            <>
              {!noHeader && (
                <header 
                  onMouseDown={isDraggable ? (e) => handleInteractionStart(e, 'drag') : undefined}
                  className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-900/60 backdrop-blur-md shrink-0 select-none ${isDraggable ? 'cursor-move' : 'cursor-default'}`}
                  onDoubleClick={() => {
                    if (allowFullscreen) {
                      setIsFullscreen(true);
                    } else {
                      // Reset to center
                      setPos(null);
                      setSize(null);
                      onStateChange?.({ pos: { x: 0, y: 0 }, size: { width: 0, height: 0 } });
                    }
                  }}
                  title={isDraggable ? (allowFullscreen ? "Arrastra para mover libremente • Doble clic para maximizar" : "Arrastra para mover libremente • Doble clic para centrar") : undefined}
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
      )}
    </>
  );
};

export default ModalWindow;
