import React, { useState, useEffect } from 'react';
import CloseIcon from './icons/CloseIcon';
import BellIcon from './icons/BellIcon';
import { ProjectInvitation } from '../types';
import { 
  Check, X, Users, Mail, Clock, Sparkles, Megaphone, 
  ShieldCheck, CheckCheck, Trash2, Info, ArrowRight, Bell 
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

  // Optional backward compatibility
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
  const { isOpen, onClose, isMobile, invitations = [], onAcceptInvitation, onDeclineInvitation } = props;
  const [activeTab, setActiveTab] = useState<'all' | 'invitations' | 'announcements'>('all');
  
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

  if (!isOpen) return null;

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const pastInvitations = invitations.filter(inv => inv.status !== 'pending');
  const unreadAnnouncementsCount = announcements.filter(a => !a.read).length;
  const totalUnread = pendingInvitations.length + unreadAnnouncementsCount;

  const handleMarkAllAsRead = () => {
    setAnnouncements(prev => prev.map(a => ({ ...a, read: true })));
  };

  const handleToggleAnnouncementRead = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, read: !a.read } : a));
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const panelContent = (
    <div className="flex flex-col h-full max-h-[85vh] w-full bg-white dark:bg-[#1a1b1e] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
      
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#151618] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-gray-900 dark:text-white flex items-center gap-2">
                Centro de Notificaciones
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Invitaciones y novedades del sistema
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Action bar & Sub-tabs */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex bg-gray-200/70 dark:bg-gray-800/80 p-1 rounded-xl text-xs font-medium flex-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span>Todas</span>
              {totalUnread > 0 && (
                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'invitations'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Proyectos</span>
              {pendingInvitations.length > 0 && (
                <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingInvitations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Novedades</span>
              {unreadAnnouncementsCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>
          </div>

          {unreadAnnouncementsCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              title="Marcar todas como leídas"
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-xs flex items-center gap-1 shrink-0"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1b1e]">
        <div className="w-full space-y-4">
          
          {/* SECTION 1: PROJECT INVITATIONS */}
          {(activeTab === 'all' || activeTab === 'invitations') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Invitaciones a Proyectos
                </h4>
                {pendingInvitations.length > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {pendingInvitations.length} pendiente{pendingInvitations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {pendingInvitations.length === 0 ? (
                activeTab === 'invitations' && (
                  <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <Mail className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sin invitaciones pendientes</p>
                    <p className="text-xs text-gray-400 mt-1">Las invitaciones a proyectos compartidos llegarán aquí.</p>
                  </div>
                )
              ) : (
                pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-blue-50/40 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/40 shadow-sm flex flex-col gap-3 transition-all hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                        style={{ backgroundColor: inv.project_color || '#3B82F6' }}
                      >
                        {inv.project_emoji || '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 uppercase tracking-wide">
                            Invitación
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-gray-900 dark:text-white truncate mt-1">
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

                    <div className="flex gap-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                      <button
                        onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar
                      </button>
                      <button
                        onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Past Invitations */}
              {pastInvitations.length > 0 && activeTab === 'invitations' && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Historial de Invitaciones
                  </h5>
                  <div className="space-y-2">
                    {pastInvitations.map(inv => (
                      <div key={inv.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex items-center justify-between text-xs">
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

          {/* SECTION 2: SYSTEM ANNOUNCEMENTS & CREATOR NEWS */}
          {(activeTab === 'all' || activeTab === 'announcements') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" /> Actualizaciones y Novedades
                </h4>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Sparkles className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No hay más novedades del sistema</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => handleToggleAnnouncementRead(ann.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      !ann.read
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/40 shadow-sm'
                        : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-90'
                    }`}
                  >
                    {!ann.read && (
                      <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500" />
                    )}

                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                        ann.tag === 'Actualización'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : ann.tag === 'Novedad'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                      }`}>
                        {ann.tag}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        • {ann.author}
                      </span>
                    </div>

                    <h5 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                      {ann.title}
                    </h5>

                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                      {ann.content}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50 text-[10px] text-gray-400">
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
          )}

        </div>
      </main>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90000] animate-fade-in" onClick={onClose}></div>
        <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-[#1a1b1e] rounded-t-3xl shadow-2xl flex flex-col z-[90001] animate-slide-up" onClick={e => e.stopPropagation()}>
          {panelContent}
        </div>
      </>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[90000]" onClick={onClose}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-auto w-full max-w-md bg-white dark:bg-[#1a1b1e] shadow-2xl rounded-2xl flex flex-col transition-transform duration-300 transform animate-pop-in border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {panelContent}
      </div>
    </div>
  );
};

export default NotificationsPanel;
