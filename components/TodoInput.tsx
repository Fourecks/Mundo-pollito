import React, { useState, useRef, useEffect } from 'react';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface TodoInputProps {
  onAddTodo: (text: string) => void;
}

const TodoInput: React.FC<TodoInputProps> = ({ onAddTodo }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Just check for support on mount
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    }
  }, []);

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
    onAddTodo(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to base height to allow shrinking, then calculate scroll height
      textarea.style.height = '48px'; 
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.max(newHeight, 48)}px`;
    }
  }, [text]);


  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-2 items-start">
      <div className="relative flex-grow">
        <textarea
          ref={textareaRef}
          value={text || ''}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="¿Tienes algo en mente, pollito?"
          className="w-full bg-white/80 dark:bg-gray-800/50 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none overflow-hidden pr-12"
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
      <button
        type="submit"
        className="bg-primary text-white font-bold rounded-full px-5 py-2.5 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0"
      >
        Añadir
      </button>
    </form>
  );
};

export default TodoInput;
