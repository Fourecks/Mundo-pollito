import React from 'react';
import IosShareIcon from './icons/IosShareIcon';
import CloseIcon from './icons/CloseIcon';
import ChickenIcon from './ChickenIcon';

interface InstallPwaBannerProps {
  isIos: boolean;
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ isIos, show, onInstall, onDismiss }) => {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed bottom-24 left-4 right-4 mx-auto max-w-md z-[80000] bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-4 animate-pop-in"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 p-3 bg-primary-light/50 dark:bg-primary/20 rounded-xl text-primary-dark dark:text-primary">
          <ChickenIcon className="w-8 h-8" />
        </div>
        <div className="flex-grow">
          <h2 id="pwa-install-title" className="font-bold text-primary-dark dark:text-primary">¡Lleva a Pollito contigo!</h2>
          {isIos ? (
            <p id="pwa-install-description" className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Para instalar la app, toca <IosShareIcon className="h-4 w-4 inline-block" /> y luego 'Añadir a la pantalla de inicio'.
            </p>
          ) : (
            <p id="pwa-install-description" className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Instala la aplicación en tu pantalla de inicio para un acceso más rápido.
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {!isIos && (
                <button
                    onClick={onInstall}
                    className="bg-primary text-white font-bold rounded-full px-4 py-2 text-sm shadow-md hover:bg-primary-dark transition-colors"
                >
                    Instalar
                </button>
            )}
            <button
                onClick={onDismiss}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Cerrar"
            >
                <CloseIcon />
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaBanner;