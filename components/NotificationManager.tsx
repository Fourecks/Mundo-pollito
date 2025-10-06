import React, { useState, useRef, useEffect, useCallback } from 'react';
import BellIcon from './icons/BellIcon';
import { supabase } from '../supabaseClient';
import { config } from '../config';

const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || (process.env as any).VAPID_PUBLIC_KEY || config.VAPID_PUBLIC_KEY;

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

type Status = 'loading' | 'unsupported' | 'subscribed' | 'unsubscribed' | 'denied';

const NotificationManager: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<Status>('loading');
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const checkSubscriptionStatus = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
            setStatus('unsupported');
            return;
        }
        
        if (!window.isSecureContext) {
            setStatus('unsupported');
            return;
        }

        try {
            const permission = Notification.permission;
            if (permission === 'denied') {
                setStatus('denied');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                setStatus('subscribed');
            } else {
                setStatus('unsubscribed');
            }
        } catch (error) {
            console.error("Error checking notification status:", error);
            setStatus('unsupported');
        }
    }, []);

    useEffect(() => {
        setStatus('loading');
        checkSubscriptionStatus();
    }, [checkSubscriptionStatus]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const subscribeUser = async () => {
        setIsActionLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });
            
            const { error } = await supabase.from('push_subscriptions').insert({ subscription: subscription.toJSON() });
            
            if (error && error.code !== '23505') { // '23505' is unique_violation
                throw error;
            }

            setStatus('subscribed');
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            if (Notification.permission === 'denied') {
                setStatus('denied');
            } else {
                setStatus('unsubscribed');
            }
        } finally {
            setIsActionLoading(false);
            setIsOpen(false);
        }
    };

    const unsubscribeUser = async () => {
        setIsActionLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
                const unsubscribed = await subscription.unsubscribe();
                if(unsubscribed) setStatus('unsubscribed');
            }
        } catch (err) {
            console.error('Error unsubscribing', err);
        } finally {
            setIsActionLoading(false);
            setIsOpen(false);
        }
    };
    
    const handleBellClick = async () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        const currentPermission = Notification.permission;

        if (currentPermission === 'default') {
            const permissionResult = await Notification.requestPermission();
            if (permissionResult === 'granted') {
                await subscribeUser();
            } else {
                setStatus('denied');
            }
        } else {
            setIsOpen(true);
        }
    };

    const getIconColor = () => {
        switch (status) {
            case 'subscribed':
                return 'text-primary dark:text-primary-dark';
            case 'denied':
                return 'text-red-500 dark:text-red-400';
            case 'unsupported':
                return 'text-gray-400 dark:text-gray-500 line-through';
            default:
                return 'text-gray-700 dark:text-gray-300';
        }
    };
    
    const PopoverContent: React.FC = () => {
        if (isActionLoading || status === 'loading') {
            return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Cargando...</p>;
        }

        switch (status) {
            case 'unsupported':
                return <p className="text-sm text-center text-gray-600 dark:text-gray-300">
                    { !window.isSecureContext
                        ? "Las notificaciones requieren una conexión segura (HTTPS)."
                        : "Las notificaciones no son compatibles con este navegador."
                    }
                </p>;
            case 'subscribed':
                 return (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Notificaciones Activadas</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">¡Recibirás recordatorios en este dispositivo!</p>
                        <button onClick={unsubscribeUser} className="w-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold rounded-lg px-4 py-2 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">Desactivar</button>
                    </div>
                );
            case 'denied':
                 return (
                    <div>
                        <h4 className="font-bold text-red-500 dark:text-red-400 text-center mb-2">Notificaciones Bloqueadas</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Para recibir recordatorios, necesitas habilitar las notificaciones para este sitio en los ajustes de tu navegador.</p>
                    </div>
                );
            case 'unsubscribed':
                return (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Activar Recordatorios</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">Permite las notificaciones para recibir avisos de tus tareas.</p>
                        <button onClick={subscribeUser} className="w-full bg-primary text-white font-bold rounded-lg px-4 py-2 shadow-sm hover:bg-primary-dark transition-colors">
                            Activar en este dispositivo
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleBellClick}
                className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${getIconColor()}`}
                aria-label="Configurar notificaciones"
                disabled={status === 'loading' || status === 'unsupported'}
            >
                <BellIcon className="h-6 w-6" />
            </button>

            {isOpen && (
                <div ref={menuRef} className="absolute top-full right-0 mt-2 z-10 w-64 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right">
                    <PopoverContent />
                </div>
            )}
        </div>
    );
};

export default NotificationManager;
