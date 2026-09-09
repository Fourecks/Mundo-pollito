import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CloseIcon from './icons/CloseIcon';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (text: string) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const prevIsOpen = useRef(isOpen);
  
  useEffect(() => {
    // Just check for support on mount
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        setIsSpeechSupported(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setText('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
    
    // Stop recognition if the modal is closed while listening.
    if (!isOpen && isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    // Update the ref for the next render cycle.
    prevIsOpen.current = isOpen;
  }, [isOpen, isListening]);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > 200) { // Max height
        textarea.style.height = '200px';
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [text]);
  
  const handleMicClick = () => {
    if (!isSpeechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'es-ES';
    recognition.interimResults = true;

    // Guarda el texto actual y añade un espacio si no está vacío
    const baseText = text ? text + (text.endsWith(' ') ? '' : ' ') : '';
    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      setText(baseText + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert('El permiso para usar el micrófono fue denegado. Por favor, habilítalo en la configuración de tu navegador.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null; // Clean up
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting recognition:", e);
      setIsListening(false);
    }
  };

  const handleSubmit = () => {
    if (text.trim() === '') return;
    onAddTask(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center pt-3 sm:pt-6 px-3 sm:px-4 pb-20 z-[100010] overflow-y-auto animate-fade-in"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-5 w-full max-w-md mx-auto transform transition-all duration-200 max-h-[92vh] flex flex-col my-1 sm:my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Native Drag Handle */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Nueva Tarea
            </h2>
            <p className="text-xs text-zinc-500">
              Añade una tarea rápida a tu lista
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <CloseIcon />
          </button>
        </div>
        
        <div className="relative w-full mb-4">
          <textarea
            ref={textareaRef}
            value={text || ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="¿Qué tienes pendiente hoy?..."
            className="w-full bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-3.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all resize-none pr-12 text-sm placeholder:text-zinc-400 min-h-[80px]"
            rows={2}
          />
          {isSpeechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 animate-pulse'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
              aria-label={isListening ? 'Detener dictado' : 'Dictar tarea'}
            >
              <MicrophoneIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            disabled={!text.trim()}
          >
            Guardar Tarea
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default AddTaskModal;
