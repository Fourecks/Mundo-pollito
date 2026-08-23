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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90000]"
          />

          {/* Sliding lateral panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 h-full w-full max-w-md bg-gray-50 dark:bg-[#131416] shadow-2xl z-[90001] border-l border-gray-100 dark:border-gray-800/60 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <header className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#1a1b1e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                    Centro de Notificaciones
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tus solicitudes e información al día
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Scrollable Container for the Two Cards */}
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6">
              
              {/* CARD 1: NOTIFICACIONES (System announcements & news) */}
              <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-md overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#151618] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Notificaciones ({announcements.length})
                    </h4>
                  </div>
                  {unreadAnnouncementsCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar leídas
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-3 divide-y divide-gray-50 dark:divide-gray-800/50 max-h-[40vh] overflow-y-auto custom-scrollbar">
                  {announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No hay notificaciones disponibles.
                    </div>
                  ) : (
                    announcements.map((ann, idx) => (
                      <div
                        key={ann.id}
                        onClick={() => handleToggleAnnouncementRead(ann.id)}
                        className={`pt-3 first:pt-0 pb-1 group cursor-pointer relative transition-all ${
                          !ann.read ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {!ann.read && (
                          <span className="absolute top-4 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}

                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            ann.tag === 'Actualización'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : ann.tag === 'Novedad'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}>
                            {ann.tag}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {ann.author}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs text-gray-900 dark:text-white leading-snug">
                          {ann.title}
                        </h5>

                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                          {ann.content}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
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
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CARD 2: SOLICITUDES (Project Invitations) */}
              <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-md overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#151618] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Solicitudes de Proyecto ({pendingInvitations.length})
                    </h4>
                  </div>
                </div>

                <div className="p-4 space-y-4 max-h-[35vh] overflow-y-auto custom-scrollbar">
                  {pendingInvitations.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <Mail className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No hay solicitudes pendientes</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Las invitaciones a proyectos compartidos aparecerán aquí.</p>
                    </div>
                  ) : (
                    pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 flex flex-col gap-3 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 shadow-sm font-bold"
                            style={{ backgroundColor: inv.project_color || '#3B82F6' }}
                          >
                            {inv.project_emoji || '📁'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                              {inv.project_name}
                            </h5>
                            <p className="text-[10px] text-gray-500 dark:text-gray-300 mt-0.5">
                              De: <span className="font-semibold text-gray-700 dark:text-gray-200">{inv.inviter_name || inv.inviter_email || 'Colaborador'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-blue-100/50 dark:border-blue-900/20">
                          <button
                            onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" /> Aceptar
                          </button>
                          <button
                            onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                            className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" /> Rechazar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
