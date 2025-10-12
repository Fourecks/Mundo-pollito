
import React, { useState, useEffect, useRef } from 'react';
import BellIcon from './icons/BellIcon';

interface NotificationManagerProps {
    isSubscribed: boolean;
    isPermissionBlocked: boolean;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ isSubscribed, isPermissionBlocked }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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
    
    // Request permission when dropdown is opened for the first time
    useEffect(() => {
        if (isDropdownOpen && !isSubscribed && !isPermissionBlocked) {
            window.OneSignal.push(() => {
                window.OneSignal.Notifications.requestPermission();
            });
        }
    }, [isDropdownOpen, isSubscribed, isPermissionBlocked]);

    const handleToggleClick = () => {
        setIsDropdownOpen(prev => !prev);
    };
    
    const handleSubscriptionToggle = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }

        window.OneSignal.push(async () => {
            const permission = window.OneSignal.Notifications.permission;

            if (permission === 'denied') {
                return; // Should be disabled anyway
            }
            
            const isOptedIn = await window.OneSignal.User.PushSubscription.getOptedIn();

            if (isOptedIn) {
                // Currently subscribed, so opt-out
                window.OneSignal.User.PushSubscription.optOut();
            } else {
                if (permission === 'granted') {
                    // Permission exists, but they opted out. Opt back in.
                    window.OneSignal.User.PushSubscription.optIn();
                } else {
                    // No permission yet, request it.
                    window.OneSignal.Notifications.requestPermission();
                }
            }
            // Close dropdown after action to provide clear feedback
            setIsDropdownOpen(false);
        });
    };

    const handleTestNotificationClick = () => {
        if (!window.OneSignal) {
            console.error("OneSignal SDK not loaded.");
            return;
        }

        window.OneSignal.push(() => {
            window.OneSignal.Notifications.sendSelfNotification(
                "¡Notificación de Prueba! 🐣",
                "Si ves esto, ¡las notificaciones funcionan!",
                window.location.href,
                'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png'
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
    } else if (isSubscribed) {
        iconColor = 'text-primary dark:text-primary';
        statusText = 'Activadas';
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={handleToggleClick}
                className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${iconColor}`}
                aria-label="Administrar notificaciones"
            >
                {iconElement}
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right z-10">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Notificaciones</h4>
                        <label htmlFor="notif-toggle" className={`cursor-pointer ${isPermissionBlocked ? 'cursor-not-allowed' : ''}`}>
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    id="notif-toggle" 
                                    className="sr-only" 
                                    checked={isSubscribed}
                                    onChange={handleSubscriptionToggle}
                                    disabled={isPermissionBlocked}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${isSubscribed ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isSubscribed ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estado: <span className="font-semibold">{statusText}</span>
                    </p>

                    {isPermissionBlocked && (
                         <p className="text-xs text-red-500 dark:text-red-400 mt-2 p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                            Debes cambiar los permisos en la configuración de tu navegador.
                        </p>
                    )}

                    {isSubscribed && (
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
