import React, { useState, useRef, useEffect } from 'react';
import MicrophoneIcon from './icons/MicrophoneIcon';

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
  
  useEffect(() => {
    // This effect runs only once to set up the recognition engine
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'es-ES';
        recognition.interimResults = false;

        recognition.onstart = () => {
            setText(''); // Clear text right when listening starts
            setIsListening(true);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');
            if (transcript) { setText(transcript); }
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
        if(isListening) {
            recognitionRef.current?.stop();
        }
    }
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
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[50000] p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-primary-dark dark:text-primary text-center mb-4">
          Nueva Tarea
        </h2>
        
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="¿Tienes algo en mente, pollito?"
            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none pr-12"
            rows={1}
          />
          {isSpeechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-secondary-lighter dark:hover:bg-gray-700'
              }`}
              aria-label={isListening ? 'Detener dictado' : 'Dictar tarea'}
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
                onClick={onClose}
                className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-full px-5 py-2.5 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200"
            >
                Cancelar
            </button>
            <button
                onClick={handleSubmit}
                className="w-full bg-primary text-white font-bold rounded-full px-5 py-2.5 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={!text.trim()}
            >
                Guardar Tarea
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;