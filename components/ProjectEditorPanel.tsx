import React, { useState, useEffect, useMemo } from 'react';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import {
  FolderPlus,
  FolderEdit,
  X,
  Check,
  Smile,
  Sparkles,
  Ban,
  Search,
  Palette,
  Tag,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Project } from '../types';

interface ProjectEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string | null, color: string | null) => void;
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

const QUICK_PROJECT_SUGGESTIONS = [
  { name: 'Trabajo & Clientes', emoji: '💼', color: '#3b82f6' },
  { name: 'Estudio & Cursos', emoji: '📚', color: '#8b5cf6' },
  { name: 'Metas Personales', emoji: '🎯', color: '#10b981' },
  { name: 'Hogar & Finanzas', emoji: '🏠', color: '#f59e0b' },
  { name: 'Desarrollo Web', emoji: '💻', color: '#06b6d4' },
  { name: 'Salud & Gym', emoji: '🏋️', color: '#ef4444' },
];

const ProjectEditorPanel: React.FC<ProjectEditorPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>('🎯');
  const [color, setColor] = useState<string | null>(PROJECT_COLORS[0].hex);
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [emojiSearch, setEmojiSearch] = useState<string>('');
  const [showFullPicker, setShowFullPicker] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name || '');
        setEmoji(projectToEdit.emoji || null);
        setColor(projectToEdit.color || PROJECT_COLORS[0].hex);
      } else {
        setName('');
        setEmoji('🎯');
        setColor(PROJECT_COLORS[0].hex);
      }
      setShowFullPicker(false);
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
      onSave(name.trim(), emoji, color);
    }
  };

  const applyQuickSuggestion = (sug: typeof QUICK_PROJECT_SUGGESTIONS[0]) => {
    setName(sug.name);
    setEmoji(sug.emoji);
    setColor(sug.color);
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
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col z-[60001] overflow-hidden border border-gray-200/80 dark:border-gray-800 animate-scale-up max-h-[92vh] text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <header className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 flex-shrink-0 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-gray-800/40">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-all duration-300 ring-4 ring-black/5 dark:ring-white/5 flex-shrink-0"
              style={{
                backgroundColor: `${currentColor}18`,
                color: currentColor,
                borderColor: `${currentColor}40`,
              }}
            >
              {emoji ? (
                <span className="text-2xl">{emoji}</span>
              ) : projectToEdit ? (
                <FolderEdit size={22} style={{ color: currentColor }} />
              ) : (
                <FolderPlus size={22} style={{ color: currentColor }} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white leading-tight">
                {projectToEdit ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Organiza tus tareas en un espacio visual dedicado
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
          className="flex-grow p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6"
        >
          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-800/30 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/50 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: currentColor }}
                />
                Vista previa en tiempo real
              </span>
              <span className="text-[10px] bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-semibold px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-800">
                Tarjeta de Proyecto
              </span>
            </div>

            {/* Simulated Project Card */}
            <div
              className="bg-white dark:bg-gray-900 p-4 rounded-2xl border shadow-sm flex items-center gap-3.5 transition-all duration-300"
              style={{ borderColor: `${currentColor}40` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-xs transition-transform duration-300 transform group-hover:scale-105"
                style={{
                  backgroundColor: `${currentColor}15`,
                  border: `1.5px solid ${currentColor}30`,
                }}
              >
                {emoji || '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-gray-900 dark:text-white truncate">
                  {name.trim() || 'Nombre del proyecto...'}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: '35%', backgroundColor: currentColor }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold shrink-0">
                    0/0 Tareas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Name Field */}
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
              placeholder="Ej: Rediseño Web, Campaña de Verano, Tesis..."
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
              style={{
                borderColor: name.trim() ? `${currentColor}80` : undefined,
              }}
              autoFocus
            />

            {/* Quick Suggestions Chips (only when empty or typing new project) */}
            {!projectToEdit && (
              <div className="mt-2.5">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 block mb-1.5 flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  Sugerencias rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROJECT_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => applyQuickSuggestion(sug)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <span>{sug.emoji}</span>
                      <span>{sug.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emoji Selector Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Icono / Emoji</span>
                {emoji && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                    {emoji} Seleccionado
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {emoji && (
                  <button
                    type="button"
                    onClick={() => setEmoji(null)}
                    className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Ban size={12} />
                    <span>Sin emoji</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowFullPicker(!showFullPicker)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Smile size={13} />
                  <span>
                    {showFullPicker ? 'Ver atajos' : 'Catálogo completo'}
                  </span>
                </button>
              </div>
            </div>

            {showFullPicker ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <EmojiPicker
                  onEmojiClick={(data) => setEmoji(data.emoji)}
                  theme={
                    document.documentElement.classList.contains('dark')
                      ? EmojiTheme.DARK
                      : EmojiTheme.LIGHT
                  }
                  width="100%"
                  height={280}
                  lazyLoadEmojis={true}
                  searchPlaceHolder="Buscar emoji en el catálogo..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            ) : (
              <div className="bg-gray-50/80 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 space-y-3">
                {/* Search Bar inside Emoji Selector */}
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={emojiSearch}
                    onChange={(e) => setEmojiSearch(e.target.value)}
                    placeholder="Buscar emoji (ej: meta, casa, trabajo, dinero)..."
                    className="w-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700/80 rounded-xl pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 shadow-2xs"
                  />
                  {emojiSearch && (
                    <button
                      type="button"
                      onClick={() => setEmojiSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={14} />
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
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
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
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar p-0.5">
                  {filteredEmojis.length > 0 ? (
                    filteredEmojis.map((item) => {
                      const isSelected = emoji === item.char;
                      return (
                        <button
                          key={item.char}
                          type="button"
                          onClick={() => setEmoji(item.char)}
                          title={item.name}
                          className={`w-9 h-9 text-xl rounded-xl flex items-center justify-center transition-all transform ${
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
                    <div className="col-span-full py-6 text-center text-xs text-gray-400">
                      No se encontraron emojis para "{emojiSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Color Selector Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Color del Proyecto
              </label>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: currentColor }}
                />
                <span>{currentColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Color Swatches Grid + Custom Picker */}
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-2.5 bg-gray-50/80 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800">
              {PROJECT_COLORS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`h-9 w-9 rounded-xl transition-all duration-200 flex items-center justify-center relative shadow-xs group ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-offset-gray-900 dark:ring-white scale-110 z-10'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={16}
                        className="text-white drop-shadow-md"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}

              {/* Custom Color Input Wheel */}
              <div
                className="relative h-9 w-9 rounded-xl overflow-hidden shadow-xs hover:scale-105 transition-all flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 cursor-pointer group"
                title="Elegir color personalizado"
              >
                <Palette size={16} className="text-white drop-shadow-xs" />
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
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
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
