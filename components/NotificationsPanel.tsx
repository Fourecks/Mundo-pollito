import React, { useState, useEffect } from 'react';
import { 
  Check, X, Users, Mail, Clock, Megaphone, 
  CheckCheck, Trash2, Bell, ArrowRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProjectInvitation } from '../types';

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
  tag: 'Actualización' | 'Aviso' | 'Nota';
  date: string;
  read: boolean;
}

const DEFAULT_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Actualización del Módulo de Proyectos',
    content: 'Se han incorporado mejoras en la sincronización de tareas, sincronización de miembros con avatares e indicadores de presencia en tiempo real.',
    tag: 'Actualización',
    date: new Date().toISOString(),
    read: false,
  },
  {
    id: 'ann-2',
    title: 'Centro de Ajustes y Notificaciones',
    content: 'Puedes configurar tus horarios de resúmenes diarios y dosis de ánimo desde el menú de configuración general.',
    tag: 'Nota',
    date: new Date(Date.now() - 3600000 * 6).toISOString(),
    read: true,
  }
];

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  invitations = [],
  onAcceptInvitation,
  onDeclineInvitation
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'requests'>('notifications');
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('pollito_system_announcements_minimal');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ANNOUNCEMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pollito_system_announcements_minimal', JSON.stringify(announcements));
    } catch (e) {}
  }, [announcements]);

  if (!isOpen) return null;

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const unreadCount = announcements.filter(a => !a.read).length + pendingInvitations.length;

  const handleMarkAllRead = () => {
    setAnnouncements(prev => prev.map(a => ({ ...a, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, read: !a.read } : a));
  };

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[90000] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity animate-fade-in" 
        onClick={onClose} 
      />

      {/* Side Drawer Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md h-full bg-white dark:bg-[#141414] shadow-2xl border-l border-gray-200/80 dark:border-gray-800/80 flex flex-col z-10 animate-slide-left">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Centro de Actividad</h2>
              <p className="text-[11px] text-gray-400 font-normal">Notificaciones y solicitudes de equipo</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#121212] flex items-center justify-between">
          <div className="flex gap-1 bg-gray-200/60 dark:bg-gray-800/70 p-1 rounded-xl w-full">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'notifications'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Notificaciones</span>
              {announcements.filter(a => !a.read).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold flex items-center justify-center">
                  {announcements.filter(a => !a.read).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Solicitudes</span>
              {pendingInvitations.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Avisos del Sistema</span>
                {announcements.some(a => !a.read) && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Marcar todo leído
                  </button>
                )}
              </div>

              {announcements.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No hay notificaciones recientes.
                </div>
              ) : (
                announcements.map(ann => (
                  <div
                    key={ann.id}
                    onClick={() => handleToggleRead(ann.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                      !ann.read
                        ? 'bg-gray-50/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800'
                        : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-gray-800/60 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {ann.tag}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {format(parseISO(ann.date), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                      {ann.title}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                      {ann.content}
                    </p>

                    <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ann.id);
                        }}
                        className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS / INVITATIONS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Invitaciones a Proyectos</span>
                <span className="text-[11px] text-gray-400">{pendingInvitations.length} pendientes</span>
              </div>

              {pendingInvitations.length === 0 ? (
                <div className="py-16 text-center">
                  <Mail className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sin solicitudes pendientes</p>
                  <p className="text-[11px] text-gray-400 mt-1">Las invitaciones para colaborar en equipos aparecerán aquí.</p>
                </div>
              ) : (
                pendingInvitations.map(inv => (
                  <div 
                    key={inv.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 border border-gray-200/50 dark:border-gray-800"
                        style={{ backgroundColor: inv.project_color ? `${inv.project_color}15` : '#f3f4f6' }}
                      >
                        {inv.project_emoji || '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {inv.project_name}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate">
                          De: <span className="text-gray-800 dark:text-gray-200 font-medium">{inv.inviter_name || inv.inviter_email || inv.sender_email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                        className="flex-1 py-1.5 px-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar
                      </button>
                      <button
                        onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                        className="flex-1 py-1.5 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#121212] text-[11px] text-gray-400 flex items-center justify-between">
          <span>Pollito Productivo</span>
          <span>Sincronizado</span>
        </div>

      </div>
    </div>
  );
};

export default NotificationsPanel;
