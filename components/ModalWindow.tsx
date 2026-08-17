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
  minWidth = 280,
  minHeight = 140,
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

  useEffect(() => {
    if (isOpen) {
      if (windowState?.pos && windowState?.size) {
        setPos(windowState.pos);
        setSize(windowState.size);
        setHasInteracted(true);
      } else {
        // Reset state for re-centering on next open
        setHasInteracted(false);
        setPos({ x: 0, y: 0 });
        setSize({ width: 0, height: 0 });
      }
    }
  }, [isOpen, windowState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionInfo.current.isDragging) {
      const dx = e.clientX - interactionInfo.current.startX;
      const dy = e.clientY - interactionInfo.current.startY;
      setPos({
        x: interactionInfo.current.modalX + dx,
        y: interactionInfo.current.modalY + dy,
      });
    } else if (interactionInfo.current.isResizing) {
      const dw = e.clientX - interactionInfo.current.startX;
      const dh = e.clientY - interactionInfo.current.startY;
      const minW = minWidth ?? 280;
      const minH = minHeight ?? 140;
      setSize({
        width: Math.max(minW, interactionInfo.current.startWidth + dw),
        height: Math.max(minH, interactionInfo.current.startHeight + dh),
      });
    }
  }, [minWidth, minHeight]);

  const handleMouseUp = useCallback(() => {
    if (interactionInfo.current.isDragging || interactionInfo.current.isResizing) {
        onStateChange?.({ pos: lastPos.current, size: lastSize.current });
    }
    interactionInfo.current.isDragging = false;
    interactionInfo.current.isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, onStateChange]);
  
  const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLElement>, type: 'drag' | 'resize') => {
      onFocus?.();
      e.stopPropagation();
      e.preventDefault();

      let currentPos = pos;
      let currentSize = size;
      
      if (!hasInteracted) {
          if (!modalRef.current) return;
          const rect = modalRef.current.getBoundingClientRect();
          currentPos = { x: rect.left, y: rect.top };
          currentSize = { width: rect.width, height: rect.height };
          setPos(currentPos);
          setSize(currentSize);
          setHasInteracted(true);
      }

      if (type === 'drag') {
          interactionInfo.current = {
            ...interactionInfo.current,
            isDragging: true,
            isResizing: false,
            startX: e.clientX,
            startY: e.clientY,
            modalX: currentPos.x,
            modalY: currentPos.y,
          };
      } else { // resize
          interactionInfo.current = {
            ...interactionInfo.current,
            isResizing: true,
            isDragging: false,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: currentSize.width,
            startHeight: currentSize.height,
          };
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  }, [pos, size, hasInteracted, onFocus, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  if (!isOpen) return null;
  
  const modalStyle: React.CSSProperties = isFullscreen ? {
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
  } : hasInteracted ? {
      position: 'fixed',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      margin: 0, // Override any margin-based centering
  } : {};
  
  const Resizer = () => (
    <div
      onMouseDown={(e) => handleInteractionStart(e, 'resize')}
      className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize z-10 p-1"
    >
       <svg className="w-full h-full text-gray-400/60 dark:text-gray-500/60" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" >
            <path d="M11 15L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 15L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
       </svg>
    </div>
  );

  return (
    <div
      className={`fixed inset-0 ${isFullscreen ? 'p-0' : 'p-1 sm:p-4'} ${(!hasInteracted && !isFullscreen) ? 'flex items-center justify-center' : ''} pointer-events-none`}
      aria-modal="true"
      role="dialog"
      style={{ zIndex: isFullscreen ? 80000 : zIndex }}
    >
      <div
        ref={modalRef}
        onMouseDown={isDraggable && !isFullscreen ? (e) => {
          if ((e.target as HTMLElement).closest('.drag-handle')) {
            handleInteractionStart(e as React.MouseEvent<HTMLElement>, 'drag');
          }
          onFocus?.();
        } : onFocus}
        style={modalStyle}
        className={`
          ${!frameless ? 'bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl flex flex-col' : ''}
          ${!frameless && !isFullscreen ? 'rounded-3xl shadow-2xl' : ''}
          ${isFullscreen ? 'rounded-none shadow-none w-full h-full' : ''}
          ${(!hasInteracted && !isFullscreen) && 'animate-deploy'}
          ${(!hasInteracted && !isFullscreen) ? className : ''}
          ${(hasInteracted || isFullscreen) && !frameless ? 'max-h-none max-w-none' : ''}
          relative pointer-events-auto
        `}
        onClick={e => e.stopPropagation()}
      >
        {frameless ? (
          children
        ) : (
          <>
            {!noHeader && (
              <header 
                className="flex items-center justify-between p-2 border-b border-secondary-light/30 dark:border-gray-700/50 flex-shrink-0 drag-handle animate-fade-in select-none"
                style={{ cursor: isDraggable && !isFullscreen ? 'move' : 'default' }}
                onDoubleClick={() => {
                  if (hasInteracted) {
                    setHasInteracted(false);
                    setPos({ x: 0, y: 0 });
                    setSize({ width: 0, height: 0 });
                    onStateChange?.({ pos: { x: 0, y: 0 }, size: { width: 0, height: 0 } });
                  }
                }}
                title={isDraggable ? "Arrastra para mover • Doble clic para restaurar posición y tamaño inicial" : undefined}
              >
                <h2 className="text-lg font-bold text-primary-dark dark:text-primary truncate pl-2">{title}</h2>
                <div className="flex items-center gap-1">
                  {allowFullscreen && (
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors cursor-pointer"
                      aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                      {isFullscreen ? (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 14h6v6M20 14h-6v6M4 10h6V4M20 10h-6V4" />
                        </svg>
                      ) : (
                        <ExpandIcon />
                      )}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-primary-light/50 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors cursor-pointer"
                    aria-label="Cerrar ventana"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </header>
            )}
            <main className={`flex-grow flex flex-col min-h-0 relative ${overflowVisible ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
              {children}
            </main>
          </>
        )}
        {isResizable && !isFullscreen && <Resizer />}
      </div>
    </div>
  );
};

export default ModalWindow;