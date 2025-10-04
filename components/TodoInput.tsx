import React, { useState, useRef, useEffect } from 'react';

interface TodoInputProps {
  onAddTodo: (text: string) => void;
}

const TodoInput: React.FC<TodoInputProps> = ({ onAddTodo }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      textarea.style.height = 'auto'; // Reset height to recalculate
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);


  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-2 items-start">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="¿Qué necesitas hacer?"
        className="flex-grow bg-white/80 dark:bg-gray-800/50 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none overflow-hidden"
        rows={1}
      />
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