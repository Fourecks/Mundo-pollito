
import React from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationManagerProps {
    isSubscribed: boolean;
    isPermissionBlocked: boolean;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ isSubscribed, isPermissionBlocked }) => {
    
    const handlePermissionClick = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }
        
        // Directly request the native browser prompt. This is more reliable than
        // the slidedown prompt, which can sometimes fail silently. The app's
        // event listeners will handle the permission change automatically.
        window.OneSignal.push(() => {
            window.OneSignal.Notifications.requestPermission();
        });
    };

    const handleTestNotificationClick = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }

        console.log("Sending test notification now...");
        window.OneSignal.push(() => {
            // Using a simpler, immediate notification call for reliability.
            window.OneSignal.Notifications.sendSelfNotification(
                "¡Notificación de Prueba! 🐣",
                "Si ves esto, ¡las notificaciones funcionan!",
                window.location.href,
                'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png'
            );
        });
    };

    let statusText = 'Estado: Desconocido';
    let buttonTitle = 'Activar notificaciones';
    let iconColor = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary';
    let iconElement = <BellIcon className="h-6 w-6" />;

    if (isPermissionBlocked) {
        statusText = 'Estado: Bloqueado';
        buttonTitle = 'Notificaciones bloqueadas. Revise la configuración de su navegador.';
        iconColor = 'text-red-400 dark:text-red-500 cursor-not-allowed';
        iconElement = (
            <div className="relative">
                <BellIcon className="h-6 w-6" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </div>
        );
    } else if (isSubscribed) {
        statusText = 'Estado: Suscrito';
        buttonTitle = 'Suscrito a notificaciones';
        iconColor = 'text-primary dark:text-primary';
    } else {
        statusText = 'Estado: No suscrito';
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
                {isSubscribed && !isPermissionBlocked && (
                    <button
                        onClick={handleTestNotificationClick}
                        className="bg-secondary text-white font-bold rounded-full px-4 py-2 text-xs shadow-md hover:bg-secondary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 animate-pop-in"
                        title="Enviar una notificación de prueba inmediata"
                    >
                        Probar
                    </button>
                )}
                <button
                    onClick={handlePermissionClick}
                    disabled={isPermissionBlocked || isSubscribed}
                    className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 ${isSubscribed || isPermissionBlocked ? '' : 'hover:scale-110'} ${iconColor}`}
                    aria-label={buttonTitle}
                    title={buttonTitle}
                >
                    {iconElement}
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">{statusText}</p>
        </div>
    );
};

export default NotificationManager;
