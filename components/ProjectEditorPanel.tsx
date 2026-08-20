import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderPlus,
  FolderEdit,
  X,
  Check,
  Search,
  Palette,
  CheckCircle2,
  Calendar,
  Flag,
  User,
  AlignLeft,
  Clock,
  Trash2,
} from 'lucide-react';
import { Project, Priority } from '../types';

export interface ProjectFormData {
  name: string;
  emoji: string | null;
  color: string | null;
  description?: string | null;
  target_date?: string | null;
  start_date?: string | null;
  priority?: Priority;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  lead?: string | null;
}

interface ProjectEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  projectToEdit: Project | null;
}

// Preset color palette matching Pollito Productivo design system
const PROJECT_COLORS = [
  { hex: '#3b82f6', name: 'Azul Real' },
  { hex: '#0284c7', name: 'Azul Océano' },
  { hex: '#06b6d4', name: 'Cian Turquesa' },
  { hex: '#14b8a6', name: 'Menta Fresca' },
  { hex: '#10b981', name: 'Verde Esmeralda' },
  { hex: '#f59e0b', name: 'Ámbar Cálido' },
  { hex: '#f97316', name: 'Naranja Sol' },
  { hex: '#ef4444', name: 'Rojo Coral' },
  { hex: '#ec4899', name: 'Rosa Pastel' },
  { hex: '#d946ef', name: 'Fucsia Neón' },
  { hex: '#8b5cf6', name: 'Púrpura Místico' },
  { hex: '#6366f1', name: 'Índigo Profundo' },
  { hex: '#64748b', name: 'Gris Pizarra' },
  { hex: '#1e293b', name: 'Negro Noche' },
];

interface EmojiItem {
  char: string;
  name: string;
  tags: string[];
}

interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    label: 'Destacados',
    icon: '⭐',
    emojis: [
      { char: '🎯', name: 'Objetivo / Meta', tags: ['meta', 'target', 'objetivo', 'plan'] },
      { char: '📁', name: 'Carpeta', tags: ['carpeta', 'folder', 'archivo'] },
      { char: '🚀', name: 'Cohete / Lanzamiento', tags: ['cohete', 'rocket', 'lanzamiento', 'startup'] },
      { char: '⭐', name: 'Estrella', tags: ['estrella', 'star', 'favorito', 'prioridad'] },
      { char: '💼', name: 'Maletín / Trabajo', tags: ['trabajo', 'work', 'oficina', 'empresa'] },
      { char: '📚', name: 'Libros / Estudio', tags: ['libros', 'estudio', 'escuela', 'lectura'] },
      { char: '🏠', name: 'Hogar / Casa', tags: ['casa', 'hogar', 'home', 'familia'] },
      { char: '🔥', name: 'Fuego / Urgente', tags: ['fuego', 'fire', 'urgente', 'hot'] },
      { char: '💡', name: 'Idea / Bombilla', tags: ['idea', 'bombilla', 'innovacion', 'creativo'] },
      { char: '🎨', name: 'Arte / Diseño', tags: ['arte', 'diseno', 'pintura', 'creativo'] },
      { char: '📝', name: 'Notas / Tareas', tags: ['notas', 'lista', 'escribir', 'tareas'] },
      { char: '🏆', name: 'Trofeo / Éxito', tags: ['trofeo', 'exito', 'premio', 'ganar'] },
      { char: '🌿', name: 'Planta / Salud', tags: ['planta', 'bienestar', 'salud', 'vida'] },
      { char: '☕', name: 'Café / Descanso', tags: ['cafe', 'coffee', 'break', 'mañana'] },
      { char: '🛠️', name: 'Herramientas / Dev', tags: ['herramientas', 'codigo', 'dev', 'soporte'] },
      { char: '✨', name: 'Chispas / Mágico', tags: ['chispas', 'magic', 'especial', 'nuevo'] },
      { char: '💻', name: 'Laptop / Programación', tags: ['laptop', 'pc', 'codigo', 'web'] },
      { char: '📊', name: 'Gráfico / Finanzas', tags: ['grafico', 'ventas', 'finanzas', 'stats'] },
      { char: '⚡', name: 'Rayo / Rápido', tags: ['rayo', 'energia', 'fast', 'potencia'] },
      { char: '💰', name: 'Dinero / Presupuesto', tags: ['dinero', 'money', 'presupuesto', 'pago'] },
    ],
  },
  {
    id: 'work',
    label: 'Trabajo & Negocios',
    icon: '💼',
    emojis: [
      { char: '💼', name: 'Maletín', tags: ['trabajo', 'oficina'] },
      { char: '📁', name: 'Carpeta', tags: ['carpeta', 'proyectos'] },
      { char: '📊', name: 'Gráficos', tags: ['graficos', 'analisis', 'reporte'] },
      { char: '📈', name: 'Crecimiento', tags: ['crecimiento', 'ventas', 'metrica'] },
      { char: '💻', name: 'Computadora', tags: ['laptop', 'software', 'ti'] },
      { char: '⚙️', name: 'Configuración', tags: ['engranaje', 'sistema', 'proceso'] },
      { char: '📌', name: 'Chincheta', tags: ['fijado', 'importante', 'nota'] },
      { char: '✉️', name: 'Correo', tags: ['email', 'mensaje', 'contacto'] },
      { char: '📅', name: 'Calendario', tags: ['fechas', 'agenda', 'evento'] },
      { char: '🧠', name: 'Cerebro / Estrategia', tags: ['ideas', 'mente', 'pensar'] },
      { char: '🏢', name: 'Edificio / Oficina', tags: ['empresa', 'corporativo'] },
      { char: '🤝', name: 'Acuerdo', tags: ['sociedad', 'cliente', 'trato'] },
      { char: '📱', name: 'Móvil / App', tags: ['app', 'movil', 'ios', 'android'] },
      { char: '🧾', name: 'Factura / Control', tags: ['recibo', 'contabilidad'] },
      { char: '🖊️', name: 'Firma / Contrato', tags: ['lapiz', 'documento'] },
      { char: '🗂️', name: 'Archivador', tags: ['ficheros', 'organizacion'] },
    ],
  },
  {
    id: 'goals',
    label: 'Metas & Éxito',
    icon: '🎯',
    emojis: [
      { char: '🎯', name: 'Diana / Blanco', tags: ['meta', 'focus', 'objetivo'] },
      { char: '🚀', name: 'Despegue', tags: ['lanzar', 'futuro', 'crecer'] },
      { char: '🏁', name: 'Meta / Carrera', tags: ['final', 'logro', 'finish'] },
      { char: '🏆', name: 'Copa / Campeón', tags: ['ganador', 'reconocimiento'] },
      { char: '⭐', name: 'Estrella', tags: ['destacado', 'calidad'] },
      { char: '🔥', name: 'Racha', tags: ['fuego', 'constancia', 'fuerza'] },
      { char: '💎', name: 'Diamante', tags: ['valor', 'calidad', 'premium'] },
      { char: '🌟', name: 'Brillo', tags: ['exito', 'destacar'] },
      { char: '🥇', name: 'Medalla de Oro', tags: ['primer-lugar', 'triunfo'] },
      { char: '⚡', name: 'Energía', tags: ['fuerza', 'motivacion'] },
      { char: '💪', name: 'Fuerza', tags: ['ejercicio', 'voluntad'] },
      { char: '🌱', name: 'Brote', tags: ['inicio', 'habito', 'crecer'] },
      { char: '👑', name: 'Corona', tags: ['lider', 'reino', 'top'] },
      { char: '🏅', name: 'Medalla', tags: ['premio', 'reconocimiento'] },
    ],
  },
  {
    id: 'study',
    label: 'Estudio & Ciencia',
    icon: '📚',
    emojis: [
      { char: '📚', name: 'Pila de Libros', tags: ['lectura', 'estudio', 'materias'] },
      { char: '🎓', name: 'Graduación', tags: ['universidad', 'titulo', 'curso'] },
      { char: '📖', name: 'Libro Abierto', tags: ['aprender', 'lectura'] },
      { char: '✍️', name: 'Escribir', tags: ['tarea', 'redaccion', 'notas'] },
      { char: '🔬', name: 'Microscopio', tags: ['ciencia', 'investigacion'] },
      { char: '🧪', name: 'Tubo de Ensayo', tags: ['quimica', 'experimento'] },
      { char: '📐', name: 'Regla / Geometría', tags: ['matematicas', 'diseno'] },
      { char: '🎨', name: 'Paleta de Arte', tags: ['dibujo', 'diseno', 'creatividad'] },
      { char: '🎵', name: 'Música', tags: ['instrumento', 'sonido', 'audio'] },
      { char: '🗣️', name: 'Idiomas / Discurso', tags: ['hablar', 'idiomas', 'ingles'] },
      { char: '🧩', name: 'Lógica / Puzzle', tags: ['problemas', 'retos'] },
      { char: '🏫', name: 'Escuela', tags: ['colegio', 'clases'] },
    ],
  },
  {
    id: 'life',
    label: 'Vida & Personal',
    icon: '🏠',
    emojis: [
      { char: '🏠', name: 'Casa / Hogar', tags: ['hogar', 'familia', 'limpieza'] },
      { char: '🌿', name: 'Naturaleza', tags: ['plantas', 'jardin', 'verde'] },
      { char: '🏋️', name: 'Gimnasio', tags: ['gym', 'fitness', 'deporte'] },
      { char: '🍎', name: 'Nutrición / Manzana', tags: ['comida', 'dieta', 'salud'] },
      { char: '✈️', name: 'Viajes / Avión', tags: ['vacaciones', 'vuelo', 'trip'] },
      { char: '🛒', name: 'Compras', tags: ['supermercado', 'tienda'] },
      { char: '💖', name: 'Corazón', tags: ['amor', 'bienestar', 'cuidado'] },
      { char: '☕', name: 'Café', tags: ['mañana', 'relax'] },
      { char: '🍕', name: 'Cocina / Comida', tags: ['recetas', 'cena'] },
      { char: '🎮', name: 'Videojuegos', tags: ['gaming', 'ocio', 'juegos'] },
      { char: '🎬', name: 'Cine / Series', tags: ['peliculas', 'entretenimiento'] },
      { char: '💰', name: 'Ahorro / Finanzas', tags: ['banco', 'presupuesto'] },
      { char: '🧘', name: 'Meditación', tags: ['zen', 'paz', 'yoga'] },
      { char: '🚴', name: 'Ciclismo / Deporte', tags: ['bici', 'aire-libre'] },
      { char: '🐾', name: 'Mascotas', tags: ['perro', 'gato', 'animales'] },
    ],
  },
  {
    id: 'tech',
    label: 'Código & Tech',
    icon: '💻',
    emojis: [
      { char: '💻', name: 'Programación', tags: ['codigo', 'dev', 'software'] },
      { char: '🤖', name: 'Inteligencia Artificial', tags: ['ai', 'robot', 'tech'] },
      { char: '⌨️', name: 'Teclado', tags: ['typing', 'escritura'] },
      { char: '🌐', name: 'Web / Internet', tags: ['red', 'sitio-web', 'online'] },
      { char: '🔒', name: 'Seguridad / Cripto', tags: ['password', 'seguro'] },
      { char: '🔌', name: 'API / Conexión', tags: ['backend', 'plug'] },
      { char: '📡', name: 'Servidor / Nube', tags: ['cloud', 'server'] },
      { char: '👾', name: 'Desarrollo de Juegos', tags: ['game-dev', 'pixel'] },
      { char: '💾', name: 'Base de Datos', tags: ['guardar', 'database'] },
    ],
  },
];

const ProjectEditorPanel: React.FC<ProjectEditorPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<'planning' | 'active' | 'on_hold' | 'completed' | 'archived'>('active');
  const [lead, setLead] = useState('');
  const [emoji, setEmoji] = useState<string | null>('🎯');
  const [color, setColor] = useState<string | null>(PROJECT_COLORS[0].hex);
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [emojiSearch, setEmojiSearch] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name || '');
        setDescription(projectToEdit.description || '');
        setStartDate(
          projectToEdit.start_date
            ? projectToEdit.start_date.split('T')[0]
            : ''
        );
        setTargetDate(
          projectToEdit.target_date
            ? projectToEdit.target_date.split('T')[0]
            : ''
        );
        setPriority(projectToEdit.priority || 'medium');
        setStatus(projectToEdit.status || 'active');
        setLead(projectToEdit.lead || '');
        setEmoji(projectToEdit.emoji || null);
        setColor(projectToEdit.color || PROJECT_COLORS[0].hex);
      } else {
        setName('');
        setDescription('');
        setStartDate('');
        setTargetDate('');
        setPriority('medium');
        setStatus('active');
        setLead('');
        setEmoji('🎯');
        setColor(PROJECT_COLORS[0].hex);
      }
      setEmojiSearch('');
      setActiveCategory('popular');
    }
  }, [isOpen, projectToEdit]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        emoji,
        color,
        description: description.trim() || null,
        start_date: startDate || null,
        target_date: targetDate || null,
        priority,
        status,
        lead: lead.trim() || null,
      });
    }
  };

  // Filter emojis based on search or category
  const filteredEmojis = useMemo(() => {
    const q = emojiSearch.trim().toLowerCase();
    if (q.length > 0) {
      const results: EmojiItem[] = [];
      const seen = new Set<string>();
      EMOJI_CATEGORIES.forEach((cat) => {
        cat.emojis.forEach((item) => {
          if (seen.has(item.char)) return;
          if (
            item.char.includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.tags.some((t) => t.toLowerCase().includes(q))
          ) {
            seen.add(item.char);
            results.push(item);
          }
        });
      });
      return results;
    }

    const currentCatObj = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return currentCatObj ? currentCatObj.emojis : EMOJI_CATEGORIES[0].emojis;
  }, [emojiSearch, activeCategory]);

  if (!isOpen) return null;

  const currentColor = color || PROJECT_COLORS[0].hex;

  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#111] rounded-3xl shadow-2xl flex flex-col z-[90001] overflow-hidden border border-gray-200/80 dark:border-gray-800 animate-scale-up max-h-[92vh] text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <header className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 flex-shrink-0 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-gray-800/40">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all duration-300 ring-4 ring-black/5 dark:ring-white/5 flex-shrink-0"
              style={{
                backgroundColor: `${currentColor}18`,
                color: currentColor,
                borderColor: `${currentColor}40`,
              }}
            >
              {emoji ? (
                <span>{emoji}</span>
              ) : projectToEdit ? (
                <FolderEdit size={22} style={{ color: currentColor }} />
              ) : (
                <FolderPlus size={22} style={{ color: currentColor }} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white leading-tight">
                {projectToEdit ? 'Configuración del Proyecto' : 'Crear Nuevo Proyecto'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {projectToEdit ? 'Edita plazos, estado, prioridad y apariencia' : 'Organiza tus tareas en un espacio visual y configurable'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </header>

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          className="flex-grow p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5"
        >
          {/* Section 1: General Info */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nombre del Proyecto <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-gray-400">
                  {name.length}/50
                </span>
              </div>

              <input
                type="text"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Rediseño Web, Campaña Q3, Tesis..."
                className="w-full bg-white dark:bg-gray-900/80 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
                style={{
                  borderColor: name.trim() ? `${currentColor}80` : undefined,
                }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlignLeft size={13} className="text-gray-400" />
                <span>Descripción del Proyecto</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Objetivo principal, alcance o notas importantes..."
                className="w-full bg-white dark:bg-gray-900/80 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Section 2: Dates & Deadlines */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" />
                <span>Cronograma y Fecha Límite</span>
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Gestión de tiempos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Clock size={12} /> Fecha de Inicio
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => setStartDate('')}
                      className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md"
                      title="Quitar fecha de inicio"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Target / Deadline Date */}
              <div>
                <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <Flag size={12} /> Fecha Límite (Deadline)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-blue-300 dark:border-blue-700 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  {targetDate && (
                    <button
                      type="button"
                      onClick={() => setTargetDate('')}
                      className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md"
                      title="Quitar fecha límite"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Status, Priority & Leader */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Flag size={13} className="text-gray-400" />
                <span>Prioridad</span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'low', label: 'Baja', colorClass: priority === 'low' ? 'bg-blue-500 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
                  { id: 'medium', label: 'Media', colorClass: priority === 'medium' ? 'bg-amber-500 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
                  { id: 'high', label: 'Alta', colorClass: priority === 'high' ? 'bg-red-500 text-white font-bold' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as Priority)}
                    className={`py-1.5 px-2 rounded-xl text-xs transition-all border border-transparent ${p.colorClass}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-gray-400" />
                <span>Estado</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl py-2 px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planning">Planificación</option>
                <option value="active">Activo (En curso)</option>
                <option value="on_hold">En Pausa</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>

            {/* Lead / Leader */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User size={13} className="text-gray-400" />
                <span>Responsable</span>
              </label>
              <input
                type="text"
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                placeholder="Ej: Yo, Juan..."
                className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 4: Emoji Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Icono / Emoji</span>
              </label>
            </div>

            <div className="bg-gray-50/80 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800 space-y-2.5">
              {/* Search Bar inside Emoji Selector */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Buscar emoji (ej: meta, casa, trabajo, dinero)..."
                  className="w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 shadow-2xs"
                />
                {emojiSearch && (
                  <button
                    type="button"
                    onClick={() => setEmojiSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Tabs (Hidden during search) */}
              {!emojiSearch && (
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-xl transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                        activeCategory === cat.id
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-bold border border-gray-200/80 dark:border-gray-600'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                {filteredEmojis.length > 0 ? (
                  filteredEmojis.map((item) => {
                    const isSelected = emoji === item.char;
                    return (
                      <button
                        key={item.char}
                        type="button"
                        onClick={() => setEmoji(item.char)}
                        title={item.name}
                        className={`w-8 h-8 text-lg rounded-xl flex items-center justify-center transition-all transform ${
                          isSelected
                            ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500 shadow-md scale-110 z-10'
                            : 'hover:bg-white dark:hover:bg-gray-700/60 hover:scale-105 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {item.char}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full py-4 text-center text-xs text-gray-400">
                    No se encontraron emojis para "{emojiSearch}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Color Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Color del Proyecto
              </label>
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: currentColor }}
                />
                <span>{currentColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Color Swatches Grid + Custom Picker */}
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-2 bg-gray-50/80 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800">
              {PROJECT_COLORS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`h-8 w-8 rounded-xl transition-all duration-200 flex items-center justify-center relative shadow-xs group ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-offset-gray-900 dark:ring-white scale-110 z-10'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        className="text-white drop-shadow-md"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}

              {/* Custom Color Input Wheel */}
              <div
                className="relative h-8 w-8 rounded-xl overflow-hidden shadow-xs hover:scale-105 transition-all flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 cursor-pointer group"
                title="Elegir color personalizado"
              >
                <Palette size={14} className="text-white drop-shadow-xs" />
                <input
                  type="color"
                  value={color || '#3b82f6'}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <footer className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/80 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all duration-200 hover:opacity-95 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              backgroundColor: currentColor,
              boxShadow: name.trim() ? `0 4px 14px ${currentColor}50` : undefined,
            }}
          >
            <CheckCircle2 size={17} />
            <span>{projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectEditorPanel;
