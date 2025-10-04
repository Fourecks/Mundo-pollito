import React, { useState, useRef, useEffect } from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationManagerProps {
  permission: NotificationPermission;
  requestPermission: () => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ permission, requestPermission }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIconColor = () => {
    if (permission === 'granted') return 'text-primary dark:text-primary-dark';
    if (permission === 'denied') return 'text-red-500 dark:text-red-400';
    return 'text-gray-700 dark:text-gray-300';
  };
  
  const handleRequest = () => {
    requestPermission();
    setIsOpen(false);
  };

  const getPopoverContent = () => {
    switch (permission) {
      case 'granted':
        return (
          <div>
            <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Notificaciones Activadas</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">Recibirás recordatorios para tus tareas programadas.</p>
          </div>
        );
      case 'denied':
        return (
          <div>
            <h4 className="font-bold text-red-500 dark:text-red-400 text-center mb-2">Notificaciones Bloqueadas</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Para recibir recordatorios, habilita las notificaciones para este sitio en los ajustes de tu navegador.</p>
          </div>
        );
      case 'default':
      default:
        return (
          <div>
            <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Activar Recordatorios</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">Permite las notificaciones para recibir avisos de tus tareas importantes.</p>
            <button
              onClick={handleRequest}
              className="w-full bg-primary text-white font-bold rounded-lg px-4 py-2 shadow-sm hover:bg-primary-dark transition-colors duration-200"
            >
              Activar
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${getIconColor()}`}
        aria-label="Configurar notificaciones"
      >
        <BellIcon className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-2 z-10 w-64 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right"
        >
          {getPopoverContent()}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;