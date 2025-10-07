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
    
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const checkStatus = useCallback(async (isInitialCheck = false) => {
        if (!isInitialCheck) setStatus('loading');
        
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY || !window.isSecureContext) {
                setStatus('unsupported');
                return;
            }

            const permission = Notification.permission;
            if (permission === 'denied') {
                setStatus('denied');
                return;
            }
            
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setStatus(subscription ? 'subscribed' : 'unsubscribed');
                return;
            }
            
            // If permission is 'default'
            setStatus('unsubscribed');

        } catch (error) {
            console.error("Error checking notification status:", error);
            setStatus('unsupported');
        }
    }, []);

    useEffect(() => {
        checkStatus(true);
    }, [checkStatus]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const subscribeUser = async () => {
        setIsActionLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not logged in.");

            const registration = await navigator.serviceWorker.ready;
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
            
            const { error } = await supabase.from('push_subscriptions').upsert([{ 
                subscription: subscription.toJSON(),
                user_id: user.id,
                endpoint: subscription.endpoint,
            }], { onConflict: 'endpoint' });

            if (error) throw error;

            setStatus('subscribed');
        } catch (err) {
            console.error('Failed to subscribe user:', err);
            setStatus(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
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
                await subscription.unsubscribe();
            }
            setStatus('unsubscribed');
        } catch (err) {
            console.error('Error unsubscribing:', err);
        } finally {
            setIsActionLoading(false);
            setIsOpen(false);
        }
    };
    
    const handleBellClick = async () => {
        // The button is never truly disabled, so this click handler is the source of truth.
        const currentPermission = Notification.permission;

        if (currentPermission === 'default') {
            // Directly request permission instead of opening a popover.
            const permissionResult = await Notification.requestPermission();
            if (permissionResult === 'granted') {
                await subscribeUser();
            } else {
                setStatus('denied');
            }
            return;
        }
        
        // For 'granted' or 'denied', toggle the popover.
        if (!isOpen) {
            await checkStatus(); // Refresh status before showing
        }
        setIsOpen(!isOpen);
    };

    const getIconColor = () => {
        switch (status) {
            case 'subscribed': return 'text-primary dark:text-primary-dark';
            case 'denied': return 'text-red-500 dark:text-red-400';
            case 'unsupported': return 'text-gray-400 dark:text-gray-500';
            default: return 'text-gray-700 dark:text-gray-300';
        }
    };
    
    const PopoverContent: React.FC = () => {
        if (isActionLoading || status === 'loading') {
            return <div className="flex justify-center items-center h-24"><div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div></div>;
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
                disabled={status === 'unsupported'}
            >
                {status === 'loading'
                  ? <div className="w-6 h-6 border-2 border-gray-400/50 border-t-gray-400 rounded-full animate-spin"></div>
                  : <BellIcon className="h-6 w-6" />
                }
            </button>

            {isOpen && (
                <div ref={popoverRef} className="absolute top-full right-0 mt-2 z-[70001] w-64 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 animate-pop-in origin-top-right">
                    <PopoverContent />
                </div>
            )}
        </div>
    );
};

export default NotificationManager;