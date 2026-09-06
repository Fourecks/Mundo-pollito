import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { Background, ParticleType, AmbientSoundType, ThemeColors, SupabaseUser, PushNotificationPreferences, NotificationEventType } from '../types';

import { 
  User, X, Upload, Trash2, Star, Image as ImageIconLucide, 
  Video as VideoIconLucide, Volume2, CloudOff, Snowflake, 
  CloudRain, Stars, Circle, Zap, TreePine, Coffee, Waves, 
  VolumeX, LogOut, Palette, Sparkles, Smile, Battery, 
  ChevronRight, Bell, Clock, Send, Users, AtSign, CheckCircle2, AlertCircle, Radio,
  Keyboard, Laptop, Monitor, Command, Search, Check, HelpCircle
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { UnsplashGallery } from './UnsplashGallery';
import { DEFAULT_PUSH_PREFERENCES, syncPreferencesToOneSignal, sendSampleNotificationForEvent } from '../services/pushNotificationService';

interface CustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
  colors: ThemeColors;
  progressEmoji?: string;
  onProgressEmojiChange?: (emoji: string) => void;
  onThemeColorChange: (colorName: keyof ThemeColors, value: string) => void;
  onReset: () => void;
  activeBackground: Background | null;
  userBackgrounds: Background[];
  onSelectBackground: (background: Background | null) => void;
  onAddBackground: (file: File) => void;
  onDeleteBackground: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  backgroundsLoading: boolean;
  particleType: ParticleType;
  setParticleType: (type: ParticleType) => void;
  ambientSound: { type: AmbientSoundType; volume: number };
  setAmbientSound: (sound: { type: AmbientSoundType; volume: number }) => void;
  enableBatterySaver: boolean;
  setEnableBatterySaver: (enabled: boolean) => void;
  batteryStatus: any;
  currentUser?: SupabaseUser;
  onLogout?: () => void;

  dailyEncouragementHour?: number | null;
  onSetDailyEncouragement?: (hour: number | null) => void;
  dailySummaryHour?: number | null;
  onSetDailySummary?: (hour: number | null) => void;
  pushPreferences?: PushNotificationPreferences;
  onUpdatePushPreferences?: (preferences: PushNotificationPreferences) => void;
  isSubscribed?: boolean;
  isPermissionBlocked?: boolean;
  onToggleSubscription?: () => void;
  onSendTestNotification?: (eventType?: NotificationEventType) => void;
}

const CustomizationPanel: React.FC<CustomizationPanelProps> = (props) => {
  const { 
    isOpen, onClose, isMobile, currentUser, onLogout,
    colors, onThemeColorChange, onReset,
    progressEmoji, onProgressEmojiChange,
    activeBackground, userBackgrounds, onSelectBackground, onAddBackground, onDeleteBackground, onToggleFavorite, backgroundsLoading,
    particleType, setParticleType, ambientSound, setAmbientSound, enableBatterySaver, setEnableBatterySaver,
    batteryStatus,
    dailyEncouragementHour, onSetDailyEncouragement,
    dailySummaryHour, onSetDailySummary,
    pushPreferences = DEFAULT_PUSH_PREFERENCES,
    onUpdatePushPreferences,
    isSubscribed = false,
    isPermissionBlocked = false,
    onToggleSubscription
  } = props;
  
  const [activeTab, setActiveTab] = useState<'account' | 'colors' | 'shortcuts' | 'notifications' | 'backgrounds' | 'ambience' | 'emoji'>('account');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgSubTab, setBgSubTab] = useState<'unsplash' | 'custom'>('unsplash');
  const [view, setView] = useState<'all' | 'favorites'>('all');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const detectedIsMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac'>(detectedIsMac ? 'mac' : 'windows');
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const tabs = [
    { id: 'account', label: 'Cuenta', icon: User },
    { id: 'colors', label: 'Apariencia', icon: Palette },
    { id: 'shortcuts', label: 'Atajos', icon: Keyboard },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'backgrounds', label: 'Fondos', icon: ImageIconLucide },
    { id: 'ambience', label: 'Efectos', icon: Sparkles },
    { id: 'emoji', label: 'Emoji', icon: Smile },
  ] as const;

  const particleOptions = [
    { type: 'none', icon: CloudOff, label: 'Ninguno' },
    { type: 'snow', icon: Snowflake, label: 'Nieve' },
    { type: 'rain', icon: CloudRain, label: 'Lluvia' },
    { type: 'stars', icon: Stars, label: 'Estrellas' },
    { type: 'bubbles', icon: Circle, label: 'Burbujas' },
    { type: 'sparks', icon: Zap, label: 'Chispas' },
  ] as const;

  const soundOptions = [
    { type: 'none', icon: VolumeX, label: 'Ninguno' },
    { type: 'rain', icon: CloudRain, label: 'Lluvia' },
    { type: 'forest', icon: TreePine, label: 'Bosque' },
    { type: 'coffee_shop', icon: Coffee, label: 'Cafetería' },
    { type: 'ocean', icon: Waves, label: 'Olas del Mar' },
  ] as const;

  const avatarUrl = currentUser?.user_metadata?.avatar_url;
  const fullName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Usuario';
  const email = currentUser?.email || '';

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="flex items-center gap-5 pb-8 border-b border-gray-100 dark:border-gray-800">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Perfil" className="w-16 h-16 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-800" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800">
                  <User className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex flex-col items-start justify-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white leading-snug">{fullName}</h2>
                <p className="text-[14px] text-gray-500 dark:text-gray-400">{email}</p>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center py-5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[15px] font-medium text-gray-700 dark:text-gray-200">Nombre</span>
                <span className="text-[15px] text-gray-500 dark:text-gray-400">{fullName}</span>
              </div>
              <div className="flex justify-between items-center py-5 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[15px] font-medium text-gray-700 dark:text-gray-200">Cuenta de email</span>
                <span className="text-[15px] text-gray-500 dark:text-gray-400">{email}</span>
              </div>
              
              <div className="pt-8">
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-[140px] py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors text-[14px] flex justify-center items-center shadow-sm"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        );

      case 'colors':
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Apariencia</h3>
            <div className="space-y-0">
              {Object.entries(colors).map(([colorName, colorValue]) => (
                <div key={colorName} className="flex justify-between items-center py-5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-[15px] font-medium text-gray-700 dark:text-gray-200 capitalize">
                    {colorName.replace('-', ' ')}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[14px] text-gray-500 uppercase tracking-wide">{colorValue}</span>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm">
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) => onThemeColorChange(colorName as keyof ThemeColors, e.target.value)}
                        className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-8">
                <button onClick={onReset} className="w-[200px] py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors text-[14px]">
                  Restaurar colores
                </button>
              </div>
            </div>
          </div>
        );

      case 'shortcuts': {
        const shortcutCategories = [
          {
            id: 'windows_management',
            name: 'Gestión y Multitarea de Ventanas',
            items: [
              { title: 'Cambiar a Ventana Siguiente', desc: 'Avanza y enfoca cíclicamente la siguiente ventana abierta', win: ['Alt', '→'], mac: ['⌥ Option', '→'], winAlt: ['Alt', ']'], macAlt: ['⌥ Option', '} / ]'] },
              { title: 'Cambiar a Ventana de Atrás', desc: 'Alterna el foco a la ventana inmediatamente detrás de la actual', win: ['Alt', '←'], mac: ['⌥ Option', '←'], winAlt: ['Alt', '['], macAlt: ['⌥ Option', '{ / ['] },
              { title: 'Restaurar Última Minimizada', desc: 'Desminimiza y trae al frente la última ventana minimizada', win: ['Alt', 'U'], mac: ['⌥ Option', 'U'], winAlt: ['Alt', '⇧ Shift', 'Z'], macAlt: ['⌘ Cmd', '⇧ Shift', 'Z'] },
              { title: 'Minimizar Ventana Activa', desc: 'Oculta la ventana que tienes enfocada en este momento', win: ['Alt', 'W'], mac: ['⌥ Option', 'W'], winAlt: null, macAlt: ['⌘ Cmd', 'M'] },
              { title: 'Cerrar Ventana Activa', desc: 'Cierra por completo la ventana actual enfocada', win: ['Alt', 'Q'], mac: ['⌥ Option', 'Q'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'W'] },
              { title: 'Mostrar Escritorio / Ocultar Todo', desc: 'Minimiza todas las ventanas abiertas o las restaura si ya están ocultas', win: ['Alt', '0'], mac: ['⌥ Option', '0'], winAlt: ['Alt', '⇧ Shift', 'D'], macAlt: ['⌥ Option', '⇧ Shift', 'D'] },
            ]
          },
          {
            id: 'modules',
            name: 'Módulos y Aplicaciones',
            items: [
              { title: 'Nueva Tarea Rápida', desc: 'Abre la lista de tareas y enfoca directamente el campo de entrada', win: ['Alt', 'A'], mac: ['⌥ Option', 'A'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'A'] },
              { title: 'Lista de Tareas', desc: 'Abre o enfoca la ventana de tareas y subtareas', win: ['Alt', 'T'], mac: ['⌥ Option', 'T'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'T'] },
              { title: 'Calendario y Agenda', desc: 'Accede a la vista mensual, semanal y eventos del día', win: ['Alt', 'C'], mac: ['⌥ Option', 'C'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'C'] },
              { title: 'Bloc de Notas', desc: 'Abre el editor de notas y documentos enriquecidos', win: ['Alt', 'N'], mac: ['⌥ Option', 'N'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'N'] },
              { title: 'Hábitos y Rutinas', desc: 'Seguimiento visual de hábitos diarios y rachas activas', win: ['Alt', 'H'], mac: ['⌥ Option', 'H'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'H'] },
              { title: 'Finanzas y Gastos', desc: 'Control de ingresos, transacciones y presupuestos', win: ['Alt', 'F'], mac: ['⌥ Option', 'F'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'F'] },
              { title: 'Espacio de Proyectos', desc: 'Gestión de proyectos, carpetas y materias académicas', win: ['Alt', 'P'], mac: ['⌥ Option', 'P'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'P'] },
              { title: 'Temporizador Pomodoro', desc: 'Abre la ventana de concentración y control de descansos', win: ['Alt', 'O'], mac: ['⌥ Option', 'O'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'O'] },
              { title: 'Reproductor de Música', desc: 'Abre la ventana de música ambiental lo-fi y generador de sonidos', win: ['Alt', 'M'], mac: ['⌥ Option', 'M'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'M'] },
              { title: 'Módulo de Estudio', desc: 'Abre el espacio de estudio guiado con técnicas activas', win: ['Alt', 'E'], mac: ['⌥ Option', 'E'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'E'] },
              { title: 'Informe de Progreso', desc: 'Visualiza tus estadísticas de productividad y rendimiento', win: ['Alt', 'R'], mac: ['⌥ Option', 'R'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'R'] }
            ]
          },
          {
            id: 'productivity',
            name: 'Productividad y Sistema',
            items: [
              { title: 'Paleta de Comandos Universal', desc: 'Búsqueda instantánea y ejecución de cualquier acción', win: ['Ctrl', 'K'], mac: ['⌘ Cmd', 'K'], winAlt: ['Ctrl', 'P'], macAlt: ['⌘ Cmd', 'P'] },
              { title: 'Iniciar / Pausar Pomodoro', desc: 'Alterna el temporizador de concentración desde cualquier lugar', win: ['Alt', 'Espacio'], mac: ['⌥ Option', 'Espacio'], winAlt: null, macAlt: null },
              { title: 'Alternar Modo Enfoque Zen', desc: 'Oculta elementos de distracción para una concentración total', win: ['Alt', 'Z'], mac: ['⌥ Option', 'Z'], winAlt: ['Alt', '⇧ Shift', 'F'], macAlt: ['⌥ Option', '⇧ Shift', 'F'] },
              { title: 'Alternar Tema Claro / Oscuro', desc: 'Cambia al instante entre la interfaz clara y oscura', win: ['Alt', 'D'], mac: ['⌥ Option', 'D'], winAlt: null, macAlt: ['⌘ Cmd', '⇧ Shift', 'D'] },
              { title: 'Ajustes y Personalización', desc: 'Abre este panel de preferencias y configuración', win: ['Alt', 'S'], mac: ['⌘ Cmd', ','], winAlt: ['Alt', ','], macAlt: ['⌥ Option', 'S'] },
            ]
          },
          {
            id: 'editor',
            name: 'Editor de Notas y Formato de Texto',
            items: [
              { title: 'Guardar Nota Inmediatamente', desc: 'Fuerza el guardado instantáneo sin esperar el auto-guardado', win: ['Ctrl', 'S'], mac: ['⌘ Cmd', 'S'], winAlt: null, macAlt: null },
              { title: 'Deshacer Cambio', desc: 'Revierte la última edición realizada en la nota actual', win: ['Ctrl', 'Z'], mac: ['⌘ Cmd', 'Z'], winAlt: null, macAlt: null },
              { title: 'Rehacer Cambio', desc: 'Reaplica la acción que acabas de deshacer', win: ['Ctrl', 'Y'], mac: ['⌘ Cmd', '⇧ Shift', 'Z'], winAlt: ['Ctrl', '⇧ Shift', 'Z'], macAlt: ['⌘ Cmd', 'Y'] },
              { title: 'Formato Negrita', desc: 'Aplica o retira el estilo de negrita del texto seleccionado', win: ['Ctrl', 'B'], mac: ['⌘ Cmd', 'B'], winAlt: null, macAlt: null },
              { title: 'Formato Cursiva', desc: 'Aplica o retira la cursiva del texto seleccionado', win: ['Ctrl', 'I'], mac: ['⌘ Cmd', 'I'], winAlt: null, macAlt: null },
              { title: 'Formato Subrayado', desc: 'Aplica o retira el subrayado del texto seleccionado', win: ['Ctrl', 'U'], mac: ['⌘ Cmd', 'U'], winAlt: null, macAlt: null },
              { title: 'Formato Tachado', desc: 'Aplica o retira el tachado del texto seleccionado', win: ['Ctrl', '⇧ Shift', 'X'], mac: ['⌘ Cmd', '⇧ Shift', 'X'], winAlt: null, macAlt: null },
            ]
          }
        ];

        const query = shortcutSearch.toLowerCase().trim();
        const filteredCategories = shortcutCategories.map(cat => {
          const items = cat.items.filter(item => {
            if (!query) return true;
            return (
              item.title.toLowerCase().includes(query) ||
              item.desc.toLowerCase().includes(query) ||
              item.win.join(' ').toLowerCase().includes(query) ||
              item.mac.join(' ').toLowerCase().includes(query)
            );
          });
          return { ...cat, items };
        }).filter(cat => cat.items.length > 0);

        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    Atajos de Teclado
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowShortcutHelp(prev => !prev)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all border cursor-pointer ${
                      showShortcutHelp
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                        : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="¿Cómo funcionan los atajos y teclas modificadoras?"
                    aria-label="Ayuda sobre atajos"
                  >
                    ?
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Selecciona tu sistema operativo para ver las combinaciones activas.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar atajo..."
                  value={shortcutSearch}
                  onChange={e => setShortcutSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-gray-300 dark:focus:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none transition-all"
                />
                {shortcutSearch && (
                  <button 
                    onClick={() => setShortcutSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Minimalist & Elegant Platform Selector Cards + Question Help */}
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Windows / PC Card */}
                <button
                  type="button"
                  onClick={() => setSelectedOS('windows')}
                  className={`group relative p-2.5 sm:p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                    selectedOS === 'windows'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-zinc-50/60 hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Monitor className={`w-4 h-4 shrink-0 transition-colors ${
                      selectedOS === 'windows'
                        ? 'text-white dark:text-zinc-950'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                    }`} />
                    <span className="text-xs sm:text-[13px] font-medium tracking-tight truncate">
                      Windows / Linux
                    </span>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded-md transition-colors ${
                    selectedOS === 'windows'
                      ? 'bg-white/15 dark:bg-zinc-900/10 text-white dark:text-zinc-900 font-medium'
                      : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    Alt · Ctrl
                  </span>
                </button>

                {/* macOS Card */}
                <button
                  type="button"
                  onClick={() => setSelectedOS('mac')}
                  className={`group relative p-2.5 sm:p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                    selectedOS === 'mac'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-zinc-50/60 hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Command className={`w-4 h-4 shrink-0 transition-colors ${
                      selectedOS === 'mac'
                        ? 'text-white dark:text-zinc-950'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                    }`} />
                    <span className="text-xs sm:text-[13px] font-medium tracking-tight truncate">
                      macOS
                    </span>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded-md transition-colors ${
                    selectedOS === 'mac'
                      ? 'bg-white/15 dark:bg-zinc-900/10 text-white dark:text-zinc-900 font-medium'
                      : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    ⌥ Opt · ⌘ Cmd
                  </span>
                </button>
              </div>

              {/* Helpful Guide when Question Mark (?) is clicked */}
              {showShortcutHelp && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      ¿Cómo funcionan los atajos?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowShortcutHelp(false)}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Los atajos responden globalmente en todo momento mientras interactúas con la app (salvo mientras estés redactando dentro de un campo de texto o nota).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50">
                      <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">En Windows / Linux</div>
                      <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Usa <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">Alt</kbd> para ventanas y navegación, y <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">Ctrl</kbd> para edición.
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50">
                      <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">En macOS (Apple)</div>
                      <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                        La tecla <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">⌥ Option</kbd> sustituye a Alt. Para alternar ventanas en teclado en español usa <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">⌥ + → / ←</kbd> o corchetes/llaves con o sin Shift (<kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">⌥ + &#125; / ]</kbd>), o <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[9.5px]">⌘ + `</kbd>.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shortcuts Listing */}
            <div className="space-y-6 pb-4">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No se encontraron atajos para "{shortcutSearch}"
                </div>
              ) : (
                filteredCategories.map(cat => (
                  <div key={cat.id} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
                      {cat.name}
                    </h4>

                    <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#151618] divide-y divide-gray-100 dark:divide-zinc-800/80 shadow-xs">
                      {cat.items.map((item, idx) => {
                        const keys = selectedOS === 'mac' ? item.mac : item.win;
                        const altKeys = selectedOS === 'mac' ? item.macAlt : item.winAlt;

                        return (
                          <div 
                            key={idx} 
                            className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100">
                                {item.title}
                              </p>
                              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 line-clamp-2">
                                {item.desc}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-start sm:self-center">
                              {/* Primary Keys */}
                              <div className="flex items-center gap-1">
                                {keys.map((k, ki) => (
                                  <React.Fragment key={ki}>
                                    {ki > 0 && <span className="text-xs text-gray-400 dark:text-zinc-600 font-bold px-0.5">+</span>}
                                    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 sm:h-7 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold font-mono rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 shadow-xs">
                                      {k}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>

                              {/* Alternative keys if available */}
                              {altKeys && (
                                <div className="flex items-center gap-1 pl-1 text-[10px] text-gray-400 dark:text-zinc-500">
                                  <span>ó</span>
                                  {altKeys.map((k, ki) => (
                                    <React.Fragment key={ki}>
                                      {ki > 0 && <span className="text-[9px] text-gray-400 dark:text-zinc-600 font-bold">+</span>}
                                      <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 sm:h-6 px-1.5 text-[10px] sm:text-[11px] font-semibold font-mono rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">
                                        {k}
                                      </kbd>
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'notifications':
        const hours = Array.from({ length: 24 }, (_, i) => i);
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200 space-y-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notificaciones</h3>

            {/* OneSignal Subscription Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                isPermissionBlocked
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-900 dark:text-red-200'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <div>
                        <p className="font-bold text-[13px]">OneSignal Push: {isSubscribed ? 'Activo' : 'Inactivo'}</p>
                        <p className="text-[11px] text-gray-500">
                            {isSubscribed ? 'Recibiendo notificaciones reales en producción' : 'Activa para recibir alertas instantáneas'}
                        </p>
                    </div>
                </div>
                {onToggleSubscription && !isPermissionBlocked && (
                    <button
                        onClick={onToggleSubscription}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity"
                    >
                        {isSubscribed ? 'Pausar' : 'Activar'}
                    </button>
                )}
            </div>

            {/* Routines & Daily Hours */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Rutinas Diarias</h4>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div>
                        <h5 className="font-medium text-sm text-gray-900 dark:text-white">Dosis de Ánimo Matutina</h5>
                        <p className="text-xs text-gray-500">Saludo motivacional diario para empezar tu jornada.</p>
                    </div>
                    <select
                        value={dailyEncouragementHour === null || dailyEncouragementHour === undefined ? '' : dailyEncouragementHour}
                        onChange={e => onSetDailyEncouragement?.(e.target.value === '' ? null : Number(e.target.value))}
                        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                    >
                        <option value="">Desactivado</option>
                        {hours.filter(h => h >= 5 && h <= 11).map(h => (
                            <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
                        ))}
                    </select>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div>
                        <h5 className="font-medium text-sm text-gray-900 dark:text-white">Resumen Diario de Tareas</h5>
                        <p className="text-xs text-gray-500">Recibe una síntesis de tus tareas pendientes y progreso.</p>
                    </div>
                    <select
                        value={dailySummaryHour === null || dailySummaryHour === undefined ? '' : dailySummaryHour}
                        onChange={e => onSetDailySummary?.(e.target.value === '' ? null : Number(e.target.value))}
                        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                    >
                        <option value="">Desactivado</option>
                        {hours.map(h => (
                            <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Event Preferences */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Preferencias de Alertas</h4>
                {[
                    { key: 'projectMembers', label: 'Nuevos miembros en proyectos', desc: 'Avisar cuando se invite o ingrese un colaborador' },
                    { key: 'taskReminders', label: 'Recordatorios de tareas', desc: 'Notificaciones automáticas al aproximarse fechas límite' },
                    { key: 'channelMentions', label: 'Menciones en canales', desc: 'Alertas cuando alguien te mencione en debates y chats' }
                ].map(pref => {
                    const active = pushPreferences?.[pref.key as keyof PushNotificationPreferences] ?? true;
                    return (
                        <div key={pref.key} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-4">
                            <div>
                                <h5 className="font-medium text-sm text-gray-900 dark:text-white">{pref.label}</h5>
                                <p className="text-xs text-gray-500">{pref.desc}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (onUpdatePushPreferences && pushPreferences) {
                                        const updated = { ...pushPreferences, [pref.key]: !active };
                                        onUpdatePushPreferences(updated);
                                        syncPreferencesToOneSignal(updated).catch(() => {});
                                    }
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    active ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                                role="switch"
                                aria-checked={active}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    );
                })}
            </div>
          </div>
        );

      case 'backgrounds':
        const filteredBackgrounds = view === 'favorites' ? userBackgrounds.filter(bg => bg.is_favorite) : userBackgrounds;
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Fondos de pantalla</h3>
              {bgSubTab === 'custom' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={backgroundsLoading || userBackgrounds.length >= 3}
                  title={userBackgrounds.length >= 3 ? 'Límite alcanzado (máximo 3 fondos)' : 'Subir nuevo fondo'}
                  className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium transition-colors text-[13px] flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <Upload size={14} /> {userBackgrounds.length >= 3 ? 'Límite 3/3' : 'Subir Fondo'}
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { onAddBackground(e.target.files[0]); e.target.value = ''; } }} accept="image/*,video/mp4,video/webm" className="hidden" />
            </div>

            <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setBgSubTab('unsplash')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  bgSubTab === 'unsplash'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Unsplash (Galería)</span>
              </button>
              <button
                onClick={() => setBgSubTab('custom')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  bgSubTab === 'custom'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <ImageIconLucide className="w-3.5 h-3.5 text-indigo-500" />
                <span>Mis Fondos ({userBackgrounds.length})</span>
              </button>
            </div>

            {bgSubTab === 'unsplash' ? (
              <div className="flex-1 overflow-hidden">
                <UnsplashGallery
                  activeBackground={activeBackground}
                  onSelectBackground={onSelectBackground}
                />
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex gap-6 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <button onClick={() => setView('all')} className={`text-[14px] font-medium transition-colors ${view === 'all' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-2 -mb-[9px]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Todos</button>
                  <button onClick={() => setView('favorites')} className={`text-[14px] font-medium transition-colors ${view === 'favorites' ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-2 -mb-[9px]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Favoritos</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1 pb-4">
                  {backgroundsLoading && userBackgrounds.length === 0 ? (
                    <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : filteredBackgrounds.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-[15px]">No hay fondos {view === 'favorites' && 'favoritos'}.</div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBackgrounds.map(bg => (
                        <div key={bg.id} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 cursor-pointer border border-gray-100 dark:border-gray-800" onClick={() => onSelectBackground(activeBackground?.id === bg.id ? null : bg)}>
                          {activeBackground?.id === bg.id && <div className="absolute inset-0 border-2 border-gray-900 dark:border-white rounded-xl z-20 pointer-events-none" />}
                          
                          {bg.type === 'video' ? (
                            <video src={bg.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" loading="lazy" />
                          )}
                          
                          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-md text-gray-800 dark:text-white z-10 shadow-sm">
                            {bg.type === 'video' ? <VideoIconLucide size={12} strokeWidth={2.5}/> : <ImageIconLucide size={12} strokeWidth={2.5}/>}
                          </div>

                          <div className={`absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10 ${activeBackground?.id === bg.id ? 'opacity-0 hover:opacity-100' : ''}`}>
                            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(bg.id); }} className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-sm ${bg.is_favorite ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'}`}>
                              <Star size={16} className={bg.is_favorite ? 'fill-current' : ''} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteBackground(bg.id); }} className="p-2.5 rounded-full bg-white/90 text-red-500 hover:bg-white backdrop-blur-md transition-all shadow-sm">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'ambience':
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Efectos y Sonido</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[14px] font-medium text-gray-700 dark:text-gray-300 block mb-3">Partículas en pantalla</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {particleOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setParticleType(opt.type as ParticleType)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-[14px] font-medium transition-all ${
                        particleType === opt.type
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <opt.icon size={18} className={particleType === opt.type ? 'text-gray-900 dark:text-white' : 'opacity-60'} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[14px] font-medium text-gray-700 dark:text-gray-300 block mb-3">Sonido ambiente</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {soundOptions.map((sound) => (
                    <button
                      key={sound.type}
                      onClick={() => setAmbientSound({ type: sound.type as AmbientSoundType, volume: ambientSound.volume })}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-[14px] font-medium transition-all ${
                        ambientSound.type === sound.type
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <sound.icon size={18} className={ambientSound.type === sound.type ? 'text-gray-900 dark:text-white' : 'opacity-60'} />
                      {sound.label}
                    </button>
                  ))}
                </div>
                {ambientSound.type !== 'none' && (
                  <div className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <Volume2 size={18} className="text-gray-500" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambientSound.volume}
                      onChange={(e) => setAmbientSound({ type: ambientSound.type, volume: parseFloat(e.target.value) })}
                      className="flex-1 accent-gray-900 dark:accent-white cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 font-mono w-8 text-right">{Math.round(ambientSound.volume * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'emoji':
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Emoji de progreso</h3>
                <p className="text-xs text-gray-500 mt-0.5">Elige el emoji que representa tus logros y completados.</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
                <span className="text-xl">{progressEmoji || '🚀'}</span>
                <span className="text-xs text-gray-500">Actual</span>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px] overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1b1e]">
              <EmojiPicker 
                width="100%"
                height="100%"
                onEmojiClick={(emojiData) => onProgressEmojiChange?.(emojiData.emoji)}
                theme={document.documentElement.classList.contains('dark') ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                searchPlaceHolder="Buscar emoji..."
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const panelContent = (
    <div className="flex flex-col md:flex-row h-full w-full bg-white dark:bg-[#1a1b1e] overflow-hidden">
      {isMobile && (
        <div className="flex justify-end p-4 shrink-0 drag-handle cursor-move">
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="w-full md:w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-[#151618]">
        {!isMobile && (
          <div className="p-6 pb-2 drag-handle cursor-move flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-wide">Ajustes</h2>
            <button onClick={onClose} className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors rounded-full">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="flex md:flex-col p-4 md:p-4 gap-1.5 overflow-x-auto custom-scrollbar md:overflow-visible">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all text-[14px] whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#1a1b1e] text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 border border-transparent'
              }`}
            >
              <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} className={activeTab === tab.id ? 'text-gray-900 dark:text-white' : 'opacity-70'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative bg-white dark:bg-[#1a1b1e]">
        {renderContent()}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md" 
          onClick={onClose} 
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg h-[88vh] bg-white dark:bg-[#1a1b1e] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-200/60 dark:border-gray-800 z-10"
        >
          {panelContent}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md pointer-events-auto" 
        onClick={onClose} 
      />
      <motion.div
        drag
        dragHandle=".drag-handle"
        dragMomentum={false}
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-[860px] h-[650px] max-h-[88vh] relative pointer-events-auto shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden bg-white dark:bg-[#1a1b1e] border border-gray-200/80 dark:border-gray-800"
      >
        {panelContent}
      </motion.div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          if (onLogout) onLogout();
        }}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default CustomizationPanel;
