import React from 'react';
import {
  Hammer,
  Building2,
  Landmark,
  Box,
  Layers,
  Ruler,
  Compass,
  Cpu,
  Terminal,
  Code2,
  Wrench,
  Calculator,
  Atom,
  FlaskConical,
  Microscope,
  Dna,
  Stethoscope,
  Brain,
  BookOpen,
  Languages,
  Palette,
  Music,
  Camera,
  Film,
  Globe2,
  Scale,
  GraduationCap,
  Briefcase,
  PieChart,
  TrendingUp,
  Trophy,
  MessageSquare,
  Lightbulb,
  FileSpreadsheet,
  Paintbrush,
  Sparkles,
  Search,
  Check
} from 'lucide-react';

export interface SubjectIconOption {
  id: string;
  name: string;
  category: 'Técnico' | 'Ciencias' | 'Salud' | 'Humanidades' | 'Artes' | 'Economía' | 'General';
  icon: React.ComponentType<{ className?: string }>;
}

export const SUBJECT_ICONS: SubjectIconOption[] = [
  // Técnico & Arquitectura
  { id: 'Hammer', name: 'Martillo / Taller', category: 'Técnico', icon: Hammer },
  { id: 'Building2', name: 'Arquitectura / Estructuras', category: 'Técnico', icon: Building2 },
  { id: 'Landmark', name: 'Diseño / Interiores', category: 'Técnico', icon: Landmark },
  { id: 'Box', name: 'Proyectos / 3D', category: 'Técnico', icon: Box },
  { id: 'Layers', name: 'Materiales / Modelado', category: 'Técnico', icon: Layers },
  { id: 'Ruler', name: 'Geometría / Medidas', category: 'Técnico', icon: Ruler },
  { id: 'Compass', name: 'Dibujo Técnico', category: 'Técnico', icon: Compass },
  { id: 'Cpu', name: 'Hardware / Circuitos', category: 'Técnico', icon: Cpu },
  { id: 'Code2', name: 'Programación', category: 'Técnico', icon: Code2 },
  { id: 'Terminal', name: 'Sistemas / Redes', category: 'Técnico', icon: Terminal },
  { id: 'Wrench', name: 'Mecánica / Mantenimiento', category: 'Técnico', icon: Wrench },

  // Ciencias & Matemáticas
  { id: 'Calculator', name: 'Matemáticas / Cálculo', category: 'Ciencias', icon: Calculator },
  { id: 'Atom', name: 'Física / Energía', category: 'Ciencias', icon: Atom },
  { id: 'FlaskConical', name: 'Química / Laboratorio', category: 'Ciencias', icon: FlaskConical },
  { id: 'Microscope', name: 'Biología / Botánica', category: 'Ciencias', icon: Microscope },
  { id: 'Dna', name: 'Genética / Bioquímica', category: 'Ciencias', icon: Dna },

  // Salud & Medicina
  { id: 'Stethoscope', name: 'Medicina / Salud', category: 'Salud', icon: Stethoscope },
  { id: 'Brain', name: 'Psicología / Neuro', category: 'Salud', icon: Brain },

  // Humanidades & Idiomas
  { id: 'BookOpen', name: 'Literatura / Lectura', category: 'Humanidades', icon: BookOpen },
  { id: 'Languages', name: 'Idiomas / Lingüística', category: 'Humanidades', icon: Languages },
  { id: 'Scale', name: 'Derecho / Leyes', category: 'Humanidades', icon: Scale },
  { id: 'Globe2', name: 'Geografía / Historia', category: 'Humanidades', icon: Globe2 },

  // Artes & Multimedia
  { id: 'Palette', name: 'Artes / Pintura', category: 'Artes', icon: Palette },
  { id: 'Paintbrush', name: 'Diseño Gráfico', category: 'Artes', icon: Paintbrush },
  { id: 'Music', name: 'Música / Audio', category: 'Artes', icon: Music },
  { id: 'Camera', name: 'Fotografía / Medios', category: 'Artes', icon: Camera },
  { id: 'Film', name: 'Cine / Audiovisuales', category: 'Artes', icon: Film },

  // Economía & Negocios
  { id: 'Briefcase', name: 'Administración / Negocios', category: 'Economía', icon: Briefcase },
  { id: 'PieChart', name: 'Finanzas / Contabilidad', category: 'Economía', icon: PieChart },
  { id: 'TrendingUp', name: 'Economía / Marketing', category: 'Economía', icon: TrendingUp },
  { id: 'FileSpreadsheet', name: 'Estadística / Datos', category: 'Economía', icon: FileSpreadsheet },

  // General
  { id: 'GraduationCap', name: 'General / Académico', category: 'General', icon: GraduationCap },
  { id: 'Trophy', name: 'Deporte / Ed. Física', category: 'General', icon: Trophy },
  { id: 'Lightbulb', name: 'Filosofía / Ideas', category: 'General', icon: Lightbulb },
  { id: 'MessageSquare', name: 'Comunicación / Debate', category: 'General', icon: MessageSquare },
  { id: 'Sparkles', name: 'Creatividad / Tesis', category: 'General', icon: Sparkles }
];

export const SUBJECT_COLOR_PALETTES = [
  { id: 'teal', color: '#0d9488', bg: '#d8f8f2', darkBg: '#0f3a35', darkColor: '#2dd4bf', label: 'Verde Azulado' },
  { id: 'rose', color: '#f43f5e', bg: '#ffe2e5', darkBg: '#3f121d', darkColor: '#fb7185', label: 'Coral / Rosa' },
  { id: 'indigo', color: '#6366f1', bg: '#e6e2ff', darkBg: '#1f1b40', darkColor: '#818cf8', label: 'Lavanda / Índigo' },
  { id: 'sky', color: '#0284c7', bg: '#dff3ff', darkBg: '#0c2d48', darkColor: '#38bdf8', label: 'Celeste / Azul' },
  { id: 'amber', color: '#d97706', bg: '#fef3c7', darkBg: '#3d2406', darkColor: '#fbbf24', label: 'Ámbar / Naranja' },
  { id: 'emerald', color: '#059669', bg: '#d1fae5', darkBg: '#063a28', darkColor: '#34d399', label: 'Esmeralda / Menta' },
  { id: 'purple', color: '#9333ea', bg: '#f3e8ff', darkBg: '#3b0764', darkColor: '#c084fc', label: 'Púrpura' },
  { id: 'zinc', color: '#4b5563', bg: '#f3f4f6', darkBg: '#1f2937', darkColor: '#9ca3af', label: 'Gris Neutro' }
];

export const renderSubjectIcon = (iconName?: string, className = "w-4 h-4") => {
  if (!iconName) return <BookOpen className={className} />;

  const found = SUBJECT_ICONS.find(i => i.id === iconName);
  if (found) {
    const IconComp = found.icon;
    return <IconComp className={className} />;
  }

  // Fallbacks for legacy emojis
  if (iconName === '🔨' || iconName.includes('martillo')) return <Hammer className={className} />;
  if (iconName === '🏛️' || iconName.includes('arquitectura')) return <Landmark className={className} />;
  if (iconName === '📦' || iconName.includes('taller')) return <Box className={className} />;
  if (iconName === '📊' || iconName.includes('teoria') || iconName.includes('estadistica')) return <PieChart className={className} />;
  if (iconName === '📐') return <Ruler className={className} />;
  if (iconName === '🔬' || iconName === '🧪') return <Microscope className={className} />;
  if (iconName === '💻' || iconName === '🖥️') return <Code2 className={className} />;
  if (iconName === '🎨') return <Palette className={className} />;
  if (iconName === '⚖️') return <Scale className={className} />;
  if (iconName === '🩺') return <Stethoscope className={className} />;
  if (iconName === '🧮') return <Calculator className={className} />;
  if (iconName === '📚' || iconName === '📖') return <BookOpen className={className} />;

  return <BookOpen className={className} />;
};
