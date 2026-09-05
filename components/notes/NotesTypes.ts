import { Folder, Note, NoteVersion } from '../../types';

export type NoteView = 'all' | 'favorites' | 'recent' | 'pinned' | 'archived' | 'trash' | 'folder' | 'tag';

export type SortOrder = 'updated' | 'created' | 'title-asc' | 'title-desc';

export interface FontOption {
  name: string;
  value: string;
  preview: string;
  category: string;
}

export interface FontSizeOption {
  label: string;
  value: string;
  sizePx: number;
}

export const FONT_FAMILY_OPTIONS: FontOption[] = [
  { name: 'Predeterminada (Fredoka)', value: "'Fredoka', sans-serif", preview: 'Fredoka Sans', category: 'Sans' },
  { name: 'Moderna (Inter / Sans)', value: "ui-sans-serif, system-ui, sans-serif", preview: 'Inter Sans', category: 'Sans' },
  { name: 'Elegante (Serif / Georgia)', value: "Georgia, 'Times New Roman', serif", preview: 'Georgia Serif', category: 'Serif' },
  { name: 'Caligrafía (Caveat)', value: "'Caveat', cursive", preview: 'Caveat Hand', category: 'Cursive' },
  { name: 'Código (Monospace)', value: "ui-monospace, 'Fira Code', 'Courier New', monospace", preview: 'Mono Code', category: 'Mono' },
  { name: 'Redondeada (Quicksand)', value: "'Quicksand', 'Nunito', sans-serif", preview: 'Quicksand Soft', category: 'Sans' },
  { name: 'Lectura Clara (Lexend)', value: "'Lexend', 'Segoe UI', sans-serif", preview: 'Lexend Clear', category: 'Sans' },
];

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { label: '11px - Minúsculo', value: '1', sizePx: 11 },
  { label: '12px - Muy pequeño', value: '2', sizePx: 12 },
  { label: '14px - Pequeño', value: '3', sizePx: 14 },
  { label: '16px - Normal (Base)', value: '4', sizePx: 16 },
  { label: '18px - Mediano', value: '5', sizePx: 18 },
  { label: '20px - Destacado', value: '6', sizePx: 20 },
  { label: '24px - Subtítulo', value: '7', sizePx: 24 },
  { label: '28px - Título H2', value: '8', sizePx: 28 },
  { label: '32px - Título H1', value: '9', sizePx: 32 },
  { label: '36px - Titular Grande', value: '10', sizePx: 36 },
];

export const COLOR_SWATCHES = [
  { name: 'Por defecto', color: 'inherit' },
  { name: 'Negro Carbón', color: '#1e293b' },
  { name: 'Gris Grafito', color: '#64748b' },
  { name: 'Azul Real', color: '#2563eb' },
  { name: 'Celeste Cielo', color: '#0284c7' },
  { name: 'Verde Esmeralda', color: '#059669' },
  { name: 'Verde Lima', color: '#65a30d' },
  { name: 'Ámbar Cálido', color: '#d97706' },
  { name: 'Rojo Coral', color: '#dc2626' },
  { name: 'Rosa Fucsia', color: '#db2777' },
  { name: 'Púrpura Violeta', color: '#7c3aed' },
  { name: 'Índigo Profundo', color: '#4f46e5' },
];

export const HIGHLIGHT_SWATCHES = [
  { name: 'Sin Resaltado', color: 'transparent', label: 'Ninguno' },
  { name: 'Amarillo Sol', color: '#fef08a', label: 'Amarillo' },
  { name: 'Menta Fresco', color: '#bbf7d0', label: 'Verde' },
  { name: 'Cielo Pastel', color: '#bae6fd', label: 'Celeste' },
  { name: 'Lavanda Suave', color: '#e9d5ff', label: 'Lavanda' },
  { name: 'Rosa Melocotón', color: '#fbcfe8', label: 'Rosa' },
  { name: 'Durazno Cálido', color: '#fed7aa', label: 'Naranja' },
];
