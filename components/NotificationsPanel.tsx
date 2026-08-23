import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import { ProjectInvitation, PushNotificationPreferences } from '../types';
import { 
    Check, 
    X, 
    Users, 
    Mail, 
    Clock, 
    AtSign, 
    CheckSquare, 
    MessageSquare, 
    Radio, 
    Send, 
    ShieldCheck, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle, 
    Layers,
    UserPlus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    DEFAULT_PUSH_PREFERENCES, 
    NotificationEventType, 
    sendSampleNotificationForEvent,
    syncPreferencesToOneSignal 
} from '../services/pushNotificationService';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  invitations?: ProjectInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  onDeclineInvitation?: (invitationId: string) => Promise<void>;

  pushPreferences?: PushNotificationPreferences;
  onUpdatePushPreferences?: (preferences: PushNotificationPreferences) => void;

  isSubscribed?: boolean;
  isPermissionBlocked?: boolean;
  onToggleSubscription?: () => void;

  dailyEncouragementHour: number | null;
  onSetDailyEncouragement: (hour: number | null) => void;

  dailySummaryHour: number | null;
  onSetDailySummary: (hour: number | null) => void;

  onSendTestNotification?: (eventType?: NotificationEventType) => void;
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
            className="w-full bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
        >
            <option value="">Desactivado</option>
            {hours.map(h => (
                <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
            ))}
        </select>
    );
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
    const { 
        isOpen, 
        onClose, 
        isMobile, 
        invitations = [], 
        onAcceptInvitation, 
        onDeclineInvitation,
        pushPreferences = DEFAULT_PUSH_PREFERENCES,
        onUpdatePushPreferences,
        isSubscribed = false,
        isPermissionBlocked = false,
        onToggleSubscription
    } = props;

    const [activeTab, setActiveTab] = useState<'invitations' | 'events' | 'routine'>(
        invitations.some(i => i.status === 'pending') ? 'invitations' : 'events'
    );
    const [testEventSelected, setTestEventSelected] = useState<NotificationEventType>('taskReminders');
    const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
    const [isSyncingWithOneSignal, setIsSyncingWithOneSignal] = useState(false);

    if (!isOpen) return null;

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    const pastInvitations = invitations.filter(inv => inv.status !== 'pending');

    const handleToggleEventPreference = async (key: keyof PushNotificationPreferences) => {
        const updated: PushNotificationPreferences = {
            ...pushPreferences,
            [key]: !pushPreferences[key]
        };

        if (onUpdatePushPreferences) {
            onUpdatePushPreferences(updated);
        }

        // Sync with OneSignal tags in real-time
        setIsSyncingWithOneSignal(true);
        try {
            await syncPreferencesToOneSignal(updated);
            setTestFeedback({
                type: 'success',
                message: `Preferencia de ${key === 'projectMembers' ? 'Miembros' : key === 'taskReminders' ? 'Tareas' : 'Menciones'} actualizada en OneSignal.`
            });
            setTimeout(() => setTestFeedback(null), 3000);
        } catch (err) {
            console.debug('Error syncing with OneSignal:', err);
        } finally {
            setIsSyncingWithOneSignal(false);
        }
    };

    const handleTriggerTest = async () => {
        setTestFeedback(null);
        if (!isSubscribed) {
            setTestFeedback({
                type: 'warning',
                message: 'Debes activar la suscripción a notificaciones push primero.'
            });
            return;
        }

        // Check if the selected event is enabled
        const isAllowed = 
            testEventSelected === 'general' ||
            (testEventSelected === 'projectMembers' && pushPreferences.projectMembers) ||
            (testEventSelected === 'taskReminders' && pushPreferences.taskReminders) ||
            (testEventSelected === 'channelMentions' && pushPreferences.channelMentions);

        if (!isAllowed) {
            setTestFeedback({
                type: 'warning',
                message: `El evento "${testEventSelected === 'projectMembers' ? 'Nuevos miembros' : testEventSelected === 'taskReminders' ? 'Recordatorios de tareas' : 'Menciones en canales'}" está desactivado en tus preferencias.`
            });
            return;
        }

        try {
            const res = await sendSampleNotificationForEvent(testEventSelected, pushPreferences);
            if (res.sent) {
                setTestFeedback({
                    type: 'success',
                    message: `¡Notificación de prueba enviada! ("${res.title}")`
                });
            } else {
                setTestFeedback({
                    type: 'error',
                    message: res.reason || 'No se pudo enviar la notificación.'
                });
            }
        } catch (err: any) {
            setTestFeedback({
                type: 'error',
                message: err?.message || 'Error al ejecutar prueba.'
            });
        }
        setTimeout(() => setTestFeedback(null), 4000);
    };

    const panelContent = (
        <div className="flex flex-col h-full max-h-[85vh]">
            <header className="flex-shrink-0 p-3.5 text-center relative border-b border-gray-200/80 dark:border-gray-800 flex flex-col items-center justify-center gap-2.5">
                <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <BellIcon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                                Centro de Notificaciones
                            </h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                Integrado con OneSignal Push
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 transition-colors"
                        aria-label="Cerrar"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Sub-tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl w-full text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'events'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Eventos Push</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'invitations'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Invitaciones</span>
                        {pendingInvitations.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {pendingInvitations.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('routine')}
                        className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'routine'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Rutina</span>
                    </button>
                </div>
            </header>

            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                {/* OneSignal Global Subscription Status Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    isPermissionBlocked
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-900 dark:text-red-200'
                        : isSubscribed
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isPermissionBlocked ? 'bg-red-500' : isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`} />
                        <div className="truncate">
                            <p className="font-bold text-[11px] leading-tight">
                                {isPermissionBlocked
                                    ? 'Permiso Bloqueado en Navegador'
                                    : isSubscribed
                                    ? 'Push OneSignal: Activado'
                                    : 'Push OneSignal: Desactivado'}
                            </p>
                            <p className="text-[10px] opacity-80 truncate">
                                {isPermissionBlocked
                                    ? 'Permite las notificaciones en la URL'
                                    : isSubscribed
                                    ? 'Recibiendo alertas en este navegador'
                                    : 'Activa para recibir alertas instantáneas'}
                            </p>
                        </div>
                    </div>
                    {onToggleSubscription && !isPermissionBlocked && (
                        <button
                            onClick={onToggleSubscription}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-sm ${
                                isSubscribed
                                    ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {isSubscribed ? 'Pausar' : 'Activar'}
                        </button>
                    )}
                </div>

                {/* Feedback Toast */}
                {testFeedback && (
                    <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
                        testFeedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                            : testFeedback.type === 'warning'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
                    }`}>
                        {testFeedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span className="flex-1 font-medium">{testFeedback.message}</span>
                    </div>
                )}

                {/* TAB 1: EVENT PREFERENCES (OneSignal Tags) */}
                {activeTab === 'events' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Tipos de Eventos Push
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    Elige qué acciones te enviarán alertas a través de OneSignal.
                                </p>
                            </div>
                            {isSyncingWithOneSignal && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono animate-pulse">
                                    Sincronizando...
                                </span>
                            )}
                        </div>

                        {/* Event 1: Nuevos miembros en proyectos */}
                        <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm transition-all hover:border-blue-400/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Nuevos miembros en proyectos
                                            {pushPreferences.projectMembers && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
                                                    OneSignal Tag: ON
                                                </span>
                                            )}
                                        </h5>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                            Avisar cuando se invite o ingrese un nuevo colaborador a tus espacios de trabajo.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggleEventPreference('projectMembers')}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        pushPreferences.projectMembers ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                    role="switch"
                                    aria-checked={pushPreferences.projectMembers}
                                    title={pushPreferences.projectMembers ? 'Desactivar evento' : 'Activar evento'}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            pushPreferences.projectMembers ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Event 2: Recordatorios de tareas */}
                        <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm transition-all hover:border-blue-400/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Recordatorios de tareas
                                            {pushPreferences.taskReminders && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded font-semibold border border-amber-200 dark:border-amber-800">
                                                    OneSignal Tag: ON
                                                </span>
                                            )}
                                        </h5>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                            Notificaciones automáticas al aproximarse fechas límite o al activarse recordatorios personalizados.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggleEventPreference('taskReminders')}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        pushPreferences.taskReminders ? 'bg-amber-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                    role="switch"
                                    aria-checked={pushPreferences.taskReminders}
                                    title={pushPreferences.taskReminders ? 'Desactivar evento' : 'Activar evento'}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            pushPreferences.taskReminders ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Event 3: Menciones en canales */}
                        <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm transition-all hover:border-blue-400/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <AtSign className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Menciones en canales
                                            {pushPreferences.channelMentions && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                                                    OneSignal Tag: ON
                                                </span>
                                            )}
                                        </h5>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                            Alertas cuando alguien te mencione (@nombre o @todos) en los canales de chat y debates.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggleEventPreference('channelMentions')}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        pushPreferences.channelMentions ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                    role="switch"
                                    aria-checked={pushPreferences.channelMentions}
                                    title={pushPreferences.channelMentions ? 'Desactivar evento' : 'Activar evento'}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            pushPreferences.channelMentions ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Test Notification Section */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <Send className="w-3 h-3 text-blue-500" /> Probar Notificación Push
                                </label>
                                <span className="text-[10px] text-gray-400 font-mono">OneSignal v16</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={testEventSelected}
                                    onChange={e => setTestEventSelected(e.target.value as NotificationEventType)}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="taskReminders">⏰ Recordatorio de Tarea</option>
                                    <option value="projectMembers">👥 Nuevo Miembro en Proyecto</option>
                                    <option value="channelMentions">💬 Mención en Canal</option>
                                    <option value="general">🔔 Notificación General</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleTriggerTest}
                                    className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm shrink-0 flex items-center gap-1"
                                >
                                    <Send className="w-3 h-3" /> Probar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: INVITATIONS */}
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
                                                {inv.created_at ? (() => {
                                                    try {
                                                        const p = parseISO(inv.created_at);
                                                        return isNaN(p.getTime()) ? '' : format(p, "d 'de' MMMM, HH:mm", { locale: es });
                                                    } catch { return ''; }
                                                })() : ''}
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

                {/* TAB 3: ROUTINE (Daily Encouragement & Daily Summary) */}
                {activeTab === 'routine' && (
                    <div className="space-y-4">
                        {/* Dosis Diaria */}
                        <div className="bg-white/80 dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
                                    <BellIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100">Dosis de Ánimo Matutina</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Saludo motivacional diario para empezar tu jornada.</p>
                                </div>
                            </div>
                            <HourSelector selectedHour={props.dailyEncouragementHour} onChange={props.onSetDailyEncouragement} minHour={5} maxHour={11} />
                        </div>
                        
                        {/* Resumen Diario */}
                        <div className="bg-white/80 dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                                    <ClipboardListIcon />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100">Resumen Diario de Tareas</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Recibe una síntesis de tus tareas pendientes y progreso.</p>
                                </div>
                            </div>
                            <HourSelector selectedHour={props.dailySummaryHour} onChange={props.onSetDailySummary} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90000] animate-fade-in" onClick={onClose}></div>
                <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col z-[90001] animate-slide-up" onClick={e => e.stopPropagation()}>
                    {panelContent}
                </div>
            </>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90000]" onClick={onClose}>
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-auto w-full max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/70 dark:border-gray-800 shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 transform animate-pop-in overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {panelContent}
            </div>
        </div>
    );
};

export default NotificationsPanel;
