import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import { ProjectInvitation } from '../types';
import { 
    Check, 
    X, 
    Users, 
    Mail, 
    Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  currentUserEmail?: string | null;
  invitations?: ProjectInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  onDeclineInvitation?: (invitationId: string) => Promise<void>;
  pushPreferences?: any;
  onUpdatePushPreferences?: any;
  isSubscribed?: boolean;
  isPermissionBlocked?: boolean;
  onToggleSubscription?: any;
  dailyEncouragementHour?: number | null;
  onSetDailyEncouragement?: (hour: number | null) => void;
  dailySummaryHour?: number | null;
  onSetDailySummary?: (hour: number | null) => void;
  onSendTestNotification?: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
    const { 
        isOpen, 
        onClose, 
        currentUserEmail,
        invitations = [], 
        onAcceptInvitation, 
        onDeclineInvitation
    } = props;

    // Only show invitations where the current user is the recipient (not the sender)
    const userEmail = (currentUserEmail || '').toLowerCase().trim();
    const receivedInvitations = invitations.filter(inv => {
        const invitee = (inv.invitee_email || inv.receiver_email || '').toLowerCase().trim();
        const sender = (inv.sender_email || inv.inviter_email || '').toLowerCase().trim();
        
        // If current user is sender and NOT receiver, do not show as received
        if (sender === userEmail && invitee !== userEmail) return false;
        
        // If current user is invitee/receiver, show it
        if (invitee === userEmail) return true;
        
        // Fallback: if no userEmail set, show pending
        return !userEmail;
    });

    const pendingInvitations = receivedInvitations.filter(inv => inv.status === 'pending');
    const pastInvitations = receivedInvitations.filter(inv => inv.status !== 'pending');

    const [activeTab, setActiveTab] = useState<'notifications' | 'invitations'>(
        pendingInvitations.length > 0 ? 'invitations' : 'notifications'
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[90000] flex justify-end bg-black/30 backdrop-blur-sm" 
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="w-full max-w-sm h-full bg-white dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <header className="flex-shrink-0 p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BellIcon className="w-4 h-4 text-gray-500" />
                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                        Notificaciones
                                    </h3>
                                </div>
                                <button 
                                    onClick={onClose} 
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('notifications')}
                                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                        activeTab === 'notifications'
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Actividad
                                </button>
                                <button
                                    onClick={() => setActiveTab('invitations')}
                                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'invitations'
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    Solicitudes
                                    {pendingInvitations.length > 0 && (
                                        <span className="text-[10px] px-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {pendingInvitations.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </header>

                        {/* Main Content Area */}
                        <main className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                            {/* TAB: NOTIFICATIONS */}
                            {activeTab === 'notifications' && (
                                <div className="text-center py-10 text-gray-400 text-xs">
                                    No hay actividad reciente.
                                </div>
                            )}

                            {/* TAB: INVITATIONS */}
                            {activeTab === 'invitations' && (
                                <div className="space-y-3">
                                    {pendingInvitations.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-xs">
                                            No hay solicitudes pendientes.
                                        </div>
                                    ) : (
                                        pendingInvitations.map((inv) => (
                                            <div
                                                key={inv.id}
                                                className="bg-white dark:bg-[#111] p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm"
                                                        style={{ backgroundColor: inv.project_color || '#3B82F6' }}
                                                    >
                                                        {inv.project_emoji || '📁'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                                                            {inv.project_name}
                                                        </h5>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                            Invitado por {inv.inviter_name || inv.inviter_email || 'usuario'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                                                        className="flex-1 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        <Check className="w-3 h-3" /> Aceptar
                                                    </button>
                                                    <button
                                                        onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                                                        className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" /> Rechazar
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {pastInvitations.length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
                                                Historial
                                            </h5>
                                            <div className="space-y-2">
                                                {pastInvitations.map(inv => (
                                                    <div key={inv.id} className="px-1 py-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="truncate">{inv.project_name}</span>
                                                        <span className="text-[10px] capitalize">{inv.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationsPanel;
