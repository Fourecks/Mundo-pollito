import React, { useState, useRef, useEffect } from 'react';
import BellIcon from './icons/BellIcon';
import { supabase } from '../supabaseClient';
import { config } from '../config';

// This logic will try to read Render's env var first, and if it doesn't exist,
// it will fall back to the Gemini editor's env var (which doesn't have the VITE_ prefix),
// and finally to the local config file.
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || (process.env as any).VAPID_PUBLIC_KEY || config.VAPID_PUBLIC_KEY;

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

const NotificationManager: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Initial check for subscription status and support.
    useEffect(() => {
        const checkInitialState = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) {
                setIsSupported(false);
                setSubscriptionLoading(false);
                return;
            }

            try {
                setPermission(Notification.permission);
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.error("Error checking notification status:", error);
                setIsSubscribed(false);
            } finally {
                setSubscriptionLoading(false);
            }
        };

        checkInitialState();
    }, []);

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
        setSubscriptionLoading(true);
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

            setIsSubscribed(true);
            setPermission('granted');
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            setPermission(Notification.permission);
            setIsSubscribed(false);
        }
        setSubscriptionLoading(false);
        setIsOpen(false);
    };

    const unsubscribeUser = async () => {
        setSubscriptionLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                // First remove from DB, then unsubscribe locally
                await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
                await subscription.unsubscribe();
                setIsSubscribed(false);
            }
        } catch (err) {
            console.error('Error unsubscribing', err);
        }
        setSubscriptionLoading(false);
        setIsOpen(false);
    };

    const getIconColor = () => {
        if (isSubscribed) return 'text-primary dark:text-primary-dark';
        if (permission === 'denied') return 'text-red-500 dark:text-red-400';
        if (!isSupported) return 'text-gray-400 dark:text-gray-500';
        return 'text-gray-700 dark:text-gray-300';
    };

    const getPopoverContent = () => {
        if (!isSupported) {
            if (!window.isSecureContext) {
                 return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Las notificaciones requieren una conexión segura (HTTPS).</p>;
            }
            return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Las notificaciones no son compatibles con este navegador.</p>;
        }
        if (subscriptionLoading) {
            return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Comprobando estado...</p>;
        }
        if (isSubscribed) {
            return (
                <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Notificaciones Activadas</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">¡Recibirás recordatorios en este dispositivo!</p>
                    <button onClick={unsubscribeUser} className="w-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold rounded-lg px-4 py-2 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">Desactivar</button>
                </div>
            );
        }
        if (permission === 'denied') {
            return (
                <div>
                    <h4 className="font-bold text-red-500 dark:text-red-400 text-center mb-2">Notificaciones Bloqueadas</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Para recibir recordatorios, necesitas habilitar las notificaciones para este sitio en los ajustes de tu navegador.</p>
                </div>
            );
        }
        return (
            <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Activar Recordatorios</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">Permite las notificaciones para recibir avisos de tus tareas, ¡incluso con la app cerrada!</p>
                <button onClick={subscribeUser} className="w-full bg-primary text-white font-bold rounded-lg px-4 py-2 shadow-sm hover:bg-primary-dark transition-colors">
                    Activar en este dispositivo
                </button>
            </div>
        );
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(prev => !prev)}
                className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${getIconColor()}`}
                aria-label="Configurar notificaciones"
                disabled={!isSupported && !isOpen}
            >
                <BellIcon className="h-6 w-6" />
            </button>

            {isOpen && (
                <div ref={menuRef} className="absolute top-full right-0 mt-2 z-10 w-64 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right">
                    {getPopoverContent()}
                </div>
            )}
        </div>
    );
};

export default NotificationManager;