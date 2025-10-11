import React from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationManagerProps {
    isSubscribed: boolean;
    isPermissionBlocked: boolean;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ isSubscribed, isPermissionBlocked }) => {
    
    const handleNotificationClick = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }
        
        // The .push() method queues the function call until the SDK is fully initialized.
        // This prevents race conditions where the button is clicked before init completes.
        window.OneSignal.push(() => {
            window.OneSignal.Notifications.requestPermission();
        });
    };

    let buttonTitle = 'Activar notificaciones';
    let iconColor = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary';
    let iconElement = <BellIcon className="h-6 w-6" />;

    if (isPermissionBlocked) {
        buttonTitle = 'Las notificaciones están bloqueadas en tu navegador';
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
        buttonTitle = 'Estás suscrito a las notificaciones';
        iconColor = 'text-primary dark:text-primary';
    }

    return (
        <button
            onClick={handleNotificationClick}
            disabled={isPermissionBlocked || isSubscribed}
            className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 ${isSubscribed || isPermissionBlocked ? '' : 'hover:scale-110'} ${iconColor}`}
            aria-label={buttonTitle}
            title={buttonTitle}
        >
            {iconElement}
        </button>
    );
};

export default NotificationManager;