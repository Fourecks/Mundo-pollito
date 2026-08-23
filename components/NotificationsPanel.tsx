import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectInvitation } from '../types';
import { 
  Check, X, Users, Mail, Clock, Megaphone, 
  CheckCheck, Trash2, Bell, ShieldAlert, ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  
  invitations?: ProjectInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  onDeclineInvitation?: (invitationId: string) => Promise<void>;

  dailyEncouragementHour?: number | null;
  onSetDailyEncouragement?: (hour: number | null) => void;
  dailySummaryHour?: number | null;
  onSetDailySummary?: (hour: number | null) => void;
  onSendTestNotification?: () => void;
}

interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  tag: 'Actualización' | 'Novedad' | 'Anuncio del Creador' | 'Tip';
  author: string;
  date: string;
  read: boolean;
}

const DEFAULT_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ann-1',
    title: '🚀 Módulo de Proyectos v2.5 Liberado',
    content: 'Hemos repotenciado el área de Proyectos: búsqueda instantánea de miembros por correo con autocompletado, gestor de documentos con soporte para Word y Excel organizado por carpetas, referencias directas en chat y hojas de ruta estructuradas por sprints.',
    tag: 'Actualización',
    author: 'Creador del Sistema',
    date: new Date().toISOString(),
    read: false,
  },
  {
    id: 'ann-2',
    title: '⚙️ Nueva Sección de Notificaciones en Ajustes',
    content: 'Ahora puedes configurar los horarios de tu Dosis de Ánimo y Resumen Diario de Tareas directamente desde la ventana de Ajustes (icono de engranaje). Este panel queda dedicado exclusivamente a tus alertas e invitaciones.',
    tag: 'Novedad',
    author: 'Equipo Pollito Productivo',
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    read: false,
  },
  {
    id: 'ann-3',
    title: '💬 Referencias a Documentos en Chat Grupal',
    content: 'Puedes compartir y referenciar archivos subidos al proyecto directamente dentro de las conversaciones de equipo sin duplicar archivos.',
    tag: 'Tip',
    author: 'Creador del Sistema',
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    read: true,
  }
];

const NotificationsPanel: React.FC<NotificationsPanelProps> = (props) => {
  const { isOpen, onClose, invitations = [], onAcceptInvitation, onDeclineInvitation } = props;
  
  const [activeTab, setActiveTab] = useState<'notifications' | 'invitations'>('notifications');

  // Local state for read status of announcements
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('pollito_system_announcements');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ANNOUNCEMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pollito_system_announcements', JSON.stringify(announcements));
    } catch (e) {}
  }, [announcements]);

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const unreadAnnouncementsCount = announcements.filter(a => !a.read).length;

  const handleMarkAllAsRead = () => {
    setAnnouncements(prev => prev.map(a => ({ ...a, read: true })));
  };

  const handleToggleAnnouncementRead = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, read: !a.read } : a));
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[90000]"
          />

          {/* Sliding lateral panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 h-full w-full max-w-md bg-[#fafafa] dark:bg-[#0c0d0e] shadow-2xl z-[90001] border-l border-gray-200/80 dark:border-gray-800/80 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <header className="flex-shrink-0 px-6 py-5 bg-white dark:bg-[#111213] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs tracking-wider text-gray-900 dark:text-gray-100 uppercase">
                  Buzón de Actividad
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Alertas e invitaciones de equipo
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                aria-label="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Segment Selector / Tabs Next to Each Other (A la par) */}
            <div className="flex-shrink-0 px-6 pb-4 bg-white dark:bg-[#111213] border-b border-gray-150 dark:border-gray-800/80 flex gap-2">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 border ${
                  activeTab === 'notifications'
                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Notificaciones
                {unreadAnnouncementsCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 border ${
                  activeTab === 'invitations'
                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Solicitudes
                {pendingInvitations.length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 font-black rounded ${
                    activeTab === 'invitations'
                      ? 'bg-amber-500 text-black'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {pendingInvitations.length}
                  </span>
                )}
              </button>
            </div>

            {/* Main scrollable body */}
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'notifications' ? (
                /* TAB 1: SYSTEM ANNOUNCEMENTS */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/40">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Alertas Recientes ({announcements.length})
                    </span>
                    {unreadAnnouncementsCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] font-bold text-gray-900 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-400 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" /> Todo leído
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-800/50">
                    {announcements.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-xs font-medium">
                        Sin notificaciones pendientes.
                      </div>
                    ) : (
                      announcements.map((ann, idx) => (
                        <div
                          key={ann.id}
                          onClick={() => handleToggleAnnouncementRead(ann.id)}
                          className={`pt-4 first:pt-0 group cursor-pointer relative transition-all ${
                            !ann.read ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          {!ann.read && (
                            <span className="absolute top-4 right-1 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white animate-pulse" />
                          )}

                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.2 rounded uppercase tracking-wider">
                              {ann.tag}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {ann.author}
                            </span>
                          </div>

                          <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100 leading-snug">
                            {ann.title}
                          </h5>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            {ann.content}
                          </p>

                          <div className="flex items-center justify-between mt-2 text-[9px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {format(parseISO(ann.date), "d 'de' MMMM", { locale: es })}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnnouncement(ann.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-500 rounded"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 2: INVITATIONS */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/40">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Invitaciones Pendientes ({pendingInvitations.length})
                    </span>
                  </div>

                  <div className="space-y-4">
                    {pendingInvitations.length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <Mail className="w-6 h-6 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">No hay solicitudes pendientes</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Las invitaciones a tableros compartidos aparecerán en esta sección.</p>
                      </div>
                    ) : (
                      pendingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111213] flex flex-col gap-3 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded text-sm flex items-center justify-center font-bold text-gray-800 dark:text-gray-150 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shrink-0 shadow-xs"
                            >
                              {inv.project_emoji || '📁'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                {inv.project_name}
                              </h5>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                Colaborador: <span className="font-semibold text-gray-700 dark:text-gray-300">{inv.inviter_name || inv.inviter_email || 'Invitado'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                            <button
                              onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                              className="flex-1 py-1.5 px-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                              className="flex-1 py-1.5 px-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
