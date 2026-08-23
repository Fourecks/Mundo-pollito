import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import { ProjectInvitation } from '../types';
import { Check, X, Users, Mail, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  invitations?: ProjectInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  onDeclineInvitation?: (invitationId: string) => Promise<void>;

  dailyEncouragementHour: number | null;
  onSetDailyEncouragement: (hour: number | null) => void;

  dailySummaryHour: number | null;
  onSetDailySummary: (hour: number | null) => void;

  onSendTestNotification: () => void;
}

const HourSelector: React.FC<{ 
    selectedHour: number | null, 
    onChange: (hour: number | null) => void,
    minHour?: number,
    maxHour?: number
}> = ({ selectedHour, onChange, minHour = 0, maxHour = 23 }) => {
    const hours = Array.from({ length: (maxHour - minHour + 1) }, (_, i) => i + minHour);
    
    return (
        <select 
            value={selectedHour === null || selectedHour === undefined ? '' : selectedHour} 
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-on-transparent"
        >
            <option value="">Desactivado</option>
            {hours.map(h => (
                <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
            ))}
        </select>
    );
};


const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
    const { isOpen, onClose, isMobile, invitations = [], onAcceptInvitation, onDeclineInvitation } = props;
    const [activeTab, setActiveTab] = useState<'invitations' | 'settings'>(invitations.some(i => i.status === 'pending') ? 'invitations' : 'invitations');
    
    if (!isOpen) return null;

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    const pastInvitations = invitations.filter(inv => inv.status !== 'pending');

    const panelContent = (
        <div className="flex flex-col h-full max-h-[85vh]">
            <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center justify-between w-full px-2">
                    <h3 className="font-bold text-lg text-primary-dark dark:text-primary flex items-center gap-2">
                        <BellIcon className="w-5 h-5 text-primary" /> Notificaciones
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500">
                        <CloseIcon />
                    </button>
                </div>

                {/* Sub-tabs */}
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl w-full max-w-sm text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'invitations'
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Invitaciones</span>
                        {pendingInvitations.length > 0 && (
                            <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {pendingInvitations.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'settings'
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <BellIcon className="w-3.5 h-3.5" />
                        <span>Ajustes</span>
                    </button>
                </div>
            </header>

            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-sm mx-auto space-y-4">
                    {activeTab === 'invitations' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Invitaciones de Proyecto
                                </h4>
                                {pendingInvitations.length > 0 && (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {pendingInvitations.length} pendiente{pendingInvitations.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {pendingInvitations.length === 0 ? (
                                <div className="text-center py-8 px-4 bg-white/40 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin invitaciones pendientes</p>
                                    <p className="text-xs text-gray-500 mt-1">Las invitaciones enviadas a tu correo aparecerán aquí.</p>
                                </div>
                            ) : (
                                pendingInvitations.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-2xl border border-primary/20 dark:border-gray-700 shadow-md flex flex-col gap-3 transition-all hover:border-primary/40"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                                                style={{ backgroundColor: inv.project_color || '#3B82F6' }}
                                            >
                                                {inv.project_emoji || '📁'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                    {inv.project_name}
                                                </h5>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                    Invitado por: <span className="font-semibold text-gray-900 dark:text-white">{inv.inviter_name || inv.inviter_email || inv.sender_email || 'Usuario'}</span>
                                                </p>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(parseISO(inv.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                            <button
                                                onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Aceptar
                                            </button>
                                            <button
                                                onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                                                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                            >
                                                <X className="w-3.5 h-3.5" /> Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {pastInvitations.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                        Historial
                                    </h5>
                                    <div className="space-y-2">
                                        {pastInvitations.map(inv => (
                                            <div key={inv.id} className="p-3 bg-white/50 dark:bg-gray-800/40 rounded-xl flex items-center justify-between text-xs">
                                                <div className="truncate pr-2">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{inv.project_name}</p>
                                                    <p className="text-[10px] text-gray-400">De: {inv.inviter_email || inv.sender_email || 'Desconocido'}</p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    inv.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {inv.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            {/* Dosis Diaria */}
                            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                     <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-light/50 dark:bg-secondary/20 text-secondary-dark dark:text-secondary">
                                        <BellIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Dosis de Ánimo</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Recibe un saludo y un texto de ánimo en la mañana.</p>
                                    </div>
                                </div>
                                <HourSelector selectedHour={props.dailyEncouragementHour} onChange={props.onSetDailyEncouragement} minHour={5} maxHour={11} />
                            </div>
                            
                            {/* Resumen Diario */}
                            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl">
                                <div className="flex items-center gap-3 mb-2">
                                     <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-light/50 dark:bg-primary/20 text-primary-dark dark:text-primary">
                                        <ClipboardListIcon />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Resumen Diario</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Recibe un resumen de tus tareas del día.</p>
                                    </div>
                                </div>
                                <HourSelector selectedHour={props.dailySummaryHour} onChange={props.onSetDailySummary} />
                            </div>
                            
                            <button
                                onClick={props.onSendTestNotification}
                                className="w-full mt-4 bg-secondary text-white font-bold rounded-full px-4 py-2.5 text-sm shadow-md hover:bg-secondary-dark transition-colors duration-200"
                            >
                                Enviar Notificación de Prueba
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90000] animate-fade-in" onClick={onClose}></div>
                <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[90001] animate-slide-up" onClick={e => e.stopPropagation()}>
                    {panelContent}
                </div>
            </>
        );
    }
    
     return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90000]" onClick={onClose}>
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-auto w-full max-w-sm bg-secondary-lighter dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 transform animate-pop-in"
                onClick={e => e.stopPropagation()}
            >
                {panelContent}
            </div>
        </div>
    );
};

export default NotificationsPanel;