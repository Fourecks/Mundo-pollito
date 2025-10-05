import React, { useState, useRef, useEffect } from 'react';
import BellIcon from './icons/BellIcon';
import { supabase } from '../supabaseClient';
import { config } from '../config';

// This logic will try to read Render's env var first, and if it doesn't exist,
// it will fall back to the value from the config file for the Gemini editor.
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || config.VAPID_PUBLIC_KEY;

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
    const [permission, setPermission] = useState<NotificationPermission>('default');
    
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                swRegistrationRef.current = registration;
                setPermission(Notification.permission);
                
                registration.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription);
                    setSubscriptionLoading(false);
                });
            });
        } else {
            setSubscriptionLoading(false);
        }
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
        if (!swRegistrationRef.current) return;
        
        try {
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            const subscription = await swRegistrationRef.current.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });
            
            // Enviar la suscripción a Supabase
            const { error } = await supabase.from('push_subscriptions').insert({ subscription: subscription.toJSON() });
            
            if (error) {
                // Si la suscripción ya existe, no es un error crítico.
                if (error.code !== '23505') { // '23505' is unique_violation
                    throw error;
                }
            }

            setIsSubscribed(true);
            setPermission('granted');
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            setPermission(Notification.permission);
        }
        setIsOpen(false);
    };

    const unsubscribeUser = async () => {
        if (!swRegistrationRef.current) return;

        try {
            const subscription = await swRegistrationRef.current.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Eliminar la suscripción de Supabase
                await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
                setIsSubscribed(false);
            }
        } catch (err) {
            console.error('Error unsubscribing', err);
        }
        setIsOpen(false);
    };

    const getIconColor = () => {
        if (isSubscribed) return 'text-primary dark:text-primary-dark';
        if (permission === 'denied') return 'text-red-500 dark:text-red-400';
        return 'text-gray-700 dark:text-gray-300';
    };

    const getPopoverContent = () => {
        if (!('serviceWorker' in navigator && 'PushManager' in window)) {
            return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Las notificaciones no son compatibles con este navegador.</p>;
        }
        if (subscriptionLoading) {
            return <p className="text-sm text-center text-gray-600 dark:text-gray-300">Comprobando estado...</p>;
        }
        if (isSubscribed) {
            return (
                <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Notificaciones Activadas</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">Recibirás recordatorios en este dispositivo, ¡incluso con la app cerrada!</p>
                    <button onClick={unsubscribeUser} className="w-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold rounded-lg px-4 py-2 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">Desactivar</button>
                </div>
            );
        }
        if (permission === 'denied') {
            return (
                <div>
                    <h4 className="font-bold text-red-500 dark:text-red-400 text-center mb-2">Notificaciones Bloqueadas</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Para recibir recordatorios, habilita las notificaciones para este sitio en los ajustes de tu navegador.</p>
                </div>
            );
        }
        return (
            <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-center mb-2">Activar Recordatorios</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">Permite las notificaciones para recibir avisos de tus tareas incluso con la app cerrada.</p>
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
