

import React, { useState } from 'react';
import BellIcon from './icons/BellIcon';
import IosShareIcon from './icons/IosShareIcon';

type Permission = "default" | "denied" | "granted";

interface NotificationManagerProps {
    permission: Permission;
    isSubscribed: boolean;
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches;

const IosInstallPrompt: React.FC<{onClose: () => void}> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80000] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center max-w-sm w-full animate-pop-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-primary-dark dark:text-primary">Habilitar Notificaciones</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Para recibir recordatorios en tu iPhone, primero debes añadir esta aplicación a tu pantalla de inicio.</p>
                <div className="text-left text-sm space-y-3 mt-4 text-gray-700 dark:text-gray-200">
                    <p>1. Toca el botón de Compartir <IosShareIcon className="h-5 w-5 inline-block -mt-1" /> en la barra de herramientas de Safari.</p>
                    <p>2. Desliza hacia arriba y selecciona <span className="font-semibold">"Añadir a la pantalla de inicio"</span>.</p>
                    <p>3. Abre la aplicación desde tu pantalla de inicio y vuelve a tocar la campana.</p>
                </div>
                 <button onClick={onClose} className="mt-6 w-full bg-primary text-white font-bold rounded-full px-4 py-2 shadow-sm hover:bg-primary-dark transition-colors">
                    Entendido
                </button>
            </div>
        </div>
    );
};

const NotificationManager: React.FC<NotificationManagerProps> = ({ permission, isSubscribed }) => {
    const [showIosPrompt, setShowIosPrompt] = useState(false);
    
    const handleBellClick = () => {
        if (isIOS() && !isStandalone()) {
            setShowIosPrompt(true);
            return;
        }
        
        window.OneSignal.push(function() {
             // `this` is the safely scoped SDK instance here.
             this.Notifications.requestPermission();
        });
    };
    
    const getButtonState = () => {
        if (permission === 'denied') {
            return {
                label: "Bloqueadas",
                iconColor: "text-red-500",
                disabled: true,
                title: "Las notificaciones están bloqueadas en la configuración de tu navegador."
            };
        }
        if (permission === 'granted' && isSubscribed) {
            return {
                label: "Activadas",
                iconColor: "text-primary",
                disabled: true,
                title: "Las notificaciones están activas para este dispositivo."
            };
        }
        return {
            label: "Activar",
            iconColor: "text-gray-700 dark:text-gray-300",
            disabled: false,
            title: "Activar notificaciones"
        };
    };

    const { label, iconColor, disabled, title } = getButtonState();

    return (
        <div className="relative">
            <button
                onClick={handleBellClick}
                disabled={disabled}
                className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${iconColor}`}
                aria-label={title}
                title={title}
            >
                <BellIcon className="h-6 w-6" />
            </button>
            {showIosPrompt && <IosInstallPrompt onClose={() => setShowIosPrompt(false)} />}
        </div>
    );
};

export default NotificationManager;