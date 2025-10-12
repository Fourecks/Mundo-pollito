import React, { useState, useEffect, useRef } from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationManagerProps {
    isSubscribed: boolean;
    isPermissionBlocked: boolean;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ isSubscribed, isPermissionBlocked }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // --- Optimistic UI State ---
    const [optimisticSubscribed, setOptimisticSubscribed] = useState(isSubscribed);
    const [isToggling, setIsToggling] = useState(false);

    // Sync local state when the real prop from App.tsx changes
    useEffect(() => {
        setOptimisticSubscribed(isSubscribed);
        // Once the real state arrives, we know the toggle operation is complete.
        if (isToggling) {
            setIsToggling(false);
        }
    }, [isSubscribed]);


    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleBellClick = () => {
        setIsDropdownOpen(prev => !prev);
    };
    
    const handleSubscriptionToggle = () => {
        if (isPermissionBlocked || !window.OneSignal || isToggling) {
            return;
        }

        // 1. Start toggling state and provide immediate visual feedback
        setIsToggling(true);
        setOptimisticSubscribed(current => !current);

        // 2. Call the actual OneSignal SDK method
        window.OneSignal.push(() => {
            // The logic is based on the REAL state (isSubscribed), not the optimistic one
            if (isSubscribed) {
                window.OneSignal.User.PushSubscription.optOut();
            } else {
                window.OneSignal.Notifications.requestPermission();
            }
        });
        // The useEffect hook listening to `isSubscribed` will set isToggling back to false
        // once the operation is confirmed.
    };

    const handleTestNotificationClick = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }

        window.OneSignal.push(() => {
            window.OneSignal.Notifications.sendSelfNotification(
                "¡Notificación de Prueba! 🐣", // Title
                "Si ves esto, ¡las notificaciones funcionan correctamente!", // Message
                window.location.href, // URL to open
                'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png' // Icon
            );
        });
    };

    let iconColor = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary';
    let iconElement = <BellIcon className="h-6 w-6" />;
    let statusText = 'Desactivadas';

    if (isPermissionBlocked) {
        iconColor = 'text-red-400 dark:text-red-500 cursor-not-allowed';
        statusText = 'Bloqueadas';
        iconElement = (
            <div className="relative">
                <BellIcon className="h-6 w-6" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </div>
        );
    } else if (optimisticSubscribed) { // Use optimistic state for UI
        iconColor = 'text-primary dark:text-primary';
        statusText = 'Activadas';
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={handleBellClick}
                className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${iconColor}`}
                aria-label="Administrar notificaciones"
            >
                {iconElement}
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right z-10">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Notificaciones</h4>
                        <label htmlFor="notif-toggle" className={`cursor-pointer ${isPermissionBlocked || isToggling ? 'cursor-not-allowed' : ''}`}>
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    id="notif-toggle" 
                                    className="sr-only" 
                                    checked={optimisticSubscribed}
                                    onChange={handleSubscriptionToggle}
                                    disabled={isPermissionBlocked || isToggling}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${optimisticSubscribed ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${optimisticSubscribed ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estado: <span className="font-semibold">{isToggling ? 'Cambiando...' : statusText}</span>
                    </p>

                    {isPermissionBlocked && (
                         <p className="text-xs text-red-500 dark:text-red-400 mt-2 p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                            Debes cambiar los permisos en la configuración de tu navegador.
                        </p>
                    )}

                    {optimisticSubscribed && !isToggling && (
                        <button
                            onClick={handleTestNotificationClick}
                            className="w-full mt-4 bg-secondary text-white font-bold rounded-full px-4 py-2 text-xs shadow-md hover:bg-secondary-dark transition-colors duration-200"
                        >
                            Enviar Notificación de Prueba
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationManager;
