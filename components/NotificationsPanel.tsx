import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import { ProjectInvitation, PushNotificationPreferences } from '../types';
import { 
    Check, 
    X, 
    Users, 
    Mail, 
    Clock, 
    AtSign, 
    Radio, 
    Send, 
    CheckCircle2, 
    AlertCircle
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
  onSendTestNotification?: (eventType?: NotificationEventType) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
    const { 
        isOpen, 
        onClose, 
        invitations = [], 
        onAcceptInvitation, 
        onDeclineInvitation,
        pushPreferences = DEFAULT_PUSH_PREFERENCES,
        onUpdatePushPreferences,
        isSubscribed = false,
        isPermissionBlocked = false,
        onToggleSubscription
    } = props;

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    const pastInvitations = invitations.filter(inv => inv.status !== 'pending');

    const [activeTab, setActiveTab] = useState<'notifications' | 'invitations'>(
        pendingInvitations.length > 0 ? 'invitations' : 'notifications'
    );
    const [testEventSelected, setTestEventSelected] = useState<NotificationEventType>('taskReminders');
    const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
    const [isSyncingWithOneSignal, setIsSyncingWithOneSignal] = useState(false);

    if (!isOpen) return null;

    const handleToggleEventPreference = async (key: keyof PushNotificationPreferences) => {
        const updated: PushNotificationPreferences = {
            ...pushPreferences,
            [key]: !pushPreferences[key]
        };

        if (onUpdatePushPreferences) {
            onUpdatePushPreferences(updated);
        }

        setIsSyncingWithOneSignal(true);
        try {
            await syncPreferencesToOneSignal(updated);
            setTestFeedback({
                type: 'success',
                message: `Preferencia de ${key === 'projectMembers' ? 'Miembros' : key === 'taskReminders' ? 'Tareas' : 'Menciones'} actualizada.`
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
                message: 'Activa la suscripción push primero en esta sección o en configuración.'
            });
            return;
        }

        const isAllowed = 
            testEventSelected === 'general' ||
            (testEventSelected === 'projectMembers' && pushPreferences.projectMembers) ||
            (testEventSelected === 'taskReminders' && pushPreferences.taskReminders) ||
            (testEventSelected === 'channelMentions' && pushPreferences.channelMentions);

        if (!isAllowed) {
            setTestFeedback({
                type: 'warning',
                message: `El evento "${testEventSelected === 'projectMembers' ? 'Nuevos miembros' : testEventSelected === 'taskReminders' ? 'Recordatorios' : 'Menciones'}" está desactivado.`
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

    return (
        <div className="fixed inset-0 z-[90000] flex justify-end bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 animate-slide-in-right overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-shrink-0 p-4 border-b border-gray-200/80 dark:border-gray-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center justify-center">
                                <BellIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                                    Centro de Notificaciones
                                </h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    OneSignal Production
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                            aria-label="Cerrar"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Two side-by-side selectable cards with rounded borders */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                                activeTab === 'notifications'
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-sm'
                                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold uppercase tracking-wider">Notificaciones</span>
                                <Radio className="w-4 h-4 opacity-80" />
                            </div>
                            <p className="text-[10px] opacity-80 truncate">Alertas y eventos push</p>
                        </button>

                        <button
                            onClick={() => setActiveTab('invitations')}
                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 relative ${
                                activeTab === 'invitations'
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-sm'
                                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold uppercase tracking-wider">Solicitudes</span>
                                <Users className="w-4 h-4 opacity-80" />
                            </div>
                            <div className="flex items-center justify-between w-full">
                                <p className="text-[10px] opacity-80 truncate">Invitaciones</p>
                                {pendingInvitations.length > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        activeTab === 'invitations' ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900' : 'bg-red-500 text-white'
                                    }`}>
                                        {pendingInvitations.length}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                    {/* Subscription Banner */}
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
                                        ? 'Push OneSignal: Activo'
                                        : 'Push OneSignal: Inactivo'}
                                </p>
                                <p className="text-[10px] opacity-80 truncate">
                                    {isPermissionBlocked
                                        ? 'Habilita permisos en la barra de direcciones'
                                        : isSubscribed
                                        ? 'Recibiendo notificaciones reales en producción'
                                        : 'Activa para recibir alertas'}
                                </p>
                            </div>
                        </div>
                        {onToggleSubscription && !isPermissionBlocked && (
                            <button
                                onClick={onToggleSubscription}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-sm ${
                                    isSubscribed
                                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                        : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900'
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

                    {/* TAB: NOTIFICATIONS / EVENTS */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Tipos de Eventos Push
                                </h4>
                                {isSyncingWithOneSignal && (
                                    <span className="text-[10px] text-gray-500 font-mono animate-pulse">
                                        Sincronizando...
                                    </span>
                                )}
                            </div>

                            {/* Event 1 */}
                            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-200/60 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                                                Nuevos miembros en proyectos
                                            </h5>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                Avisar cuando se invite o ingrese un colaborador a tus espacios.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleEventPreference('projectMembers')}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            pushPreferences.projectMembers ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                        role="switch"
                                        aria-checked={pushPreferences.projectMembers}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${
                                                pushPreferences.projectMembers ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Event 2 */}
                            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-200/60 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                                                Recordatorios de tareas
                                            </h5>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                Notificaciones automáticas al aproximarse fechas límite.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleEventPreference('taskReminders')}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            pushPreferences.taskReminders ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                        role="switch"
                                        aria-checked={pushPreferences.taskReminders}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${
                                                pushPreferences.taskReminders ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Event 3 */}
                            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-200/60 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <AtSign className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                                                Menciones en canales
                                            </h5>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                Alertas cuando alguien te mencione en debates y chats.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleEventPreference('channelMentions')}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            pushPreferences.channelMentions ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                        role="switch"
                                        aria-checked={pushPreferences.channelMentions}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${
                                                pushPreferences.channelMentions ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Test Push Trigger */}
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        <Send className="w-3 h-3 text-gray-500" /> Probar Alerta Push
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={testEventSelected}
                                        onChange={e => setTestEventSelected(e.target.value as NotificationEventType)}
                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-gray-400"
                                    >
                                        <option value="taskReminders">⏰ Recordatorio de Tarea</option>
                                        <option value="projectMembers">👥 Nuevo Miembro</option>
                                        <option value="channelMentions">💬 Mención en Canal</option>
                                        <option value="general">🔔 Notificación General</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleTriggerTest}
                                        className="px-3.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm shrink-0 flex items-center gap-1"
                                    >
                                        <Send className="w-3 h-3" /> Probar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: INVITATIONS / SOLICITUDES */}
                    {activeTab === 'invitations' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Invitaciones a Proyectos
                                </h4>
                                {pendingInvitations.length > 0 && (
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                        {pendingInvitations.length} pendiente{pendingInvitations.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {pendingInvitations.length === 0 ? (
                                <div className="text-center py-12 px-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin solicitudes pendientes</p>
                                    <p className="text-xs text-gray-500 mt-1">Las invitaciones de proyectos aparecerán aquí.</p>
                                </div>
                            ) : (
                                pendingInvitations.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                                                style={{ backgroundColor: inv.project_color || '#3B82F6' }}
                                            >
                                                {inv.project_emoji || '📁'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                    {inv.project_name}
                                                </h5>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                    De: <span className="font-semibold text-gray-900 dark:text-white">{inv.inviter_name || inv.inviter_email || inv.sender_email || 'Usuario'}</span>
                                                </p>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(parseISO(inv.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                                            <button
                                                onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                                                className="flex-1 py-2 px-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
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
                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                        Historial
                                    </h5>
                                    <div className="space-y-2">
                                        {pastInvitations.map(inv => (
                                            <div key={inv.id} className="p-3 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl flex items-center justify-between text-xs">
                                                <div className="truncate pr-2">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{inv.project_name}</p>
                                                    <p className="text-[10px] text-gray-400">De: {inv.inviter_email || inv.sender_email || 'Desconocido'}</p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    inv.status === 'accepted' ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
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
                </main>
            </div>
        </div>
    );
};

export default NotificationsPanel;
