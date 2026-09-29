import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Hash, Check } from 'lucide-react';
import { renderSubjectIcon, SUBJECT_COLOR_PALETTES } from './subjectIcons';
import { SubjectIconPickerModal } from './SubjectIconPickerModal';

interface CreateSubjectFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subjectData: {
    name: string;
    code?: string;
    professor?: string;
    room?: string;
    color: string;
    icon_name: string;
    days: string[];
    start_time: string;
    end_time: string;
  }) => Promise<void>;
}

export const CreateSubjectFullScreen: React.FC<CreateSubjectFullScreenProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [professor, setProfessor] = useState('');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('#0d9488');
  const [iconName, setIconName] = useState('Hammer');
  const [days, setDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const daysList = [
    { id: 'Lunes', label: 'Lu' },
    { id: 'Martes', label: 'Ma' },
    { id: 'Miércoles', label: 'Mi' },
    { id: 'Jueves', label: 'Ju' },
    { id: 'Viernes', label: 'Vi' },
    { id: 'Sábado', label: 'Sa' },
    { id: 'Domingo', label: 'Do' }
  ];

  const toggleDay = (dayId: string) => {
    if (days.includes(dayId)) {
      setDays(days.filter(d => d !== dayId));
    } else {
      setDays([...days, dayId]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim() || undefined,
        professor: professor.trim() || undefined,
        room: room.trim() || undefined,
        color,
        icon_name: iconName,
        days: days.length > 0 ? days : ['Lunes'],
        start_time: startTime || '08:00',
        end_time: endTime || '10:00',
      });
      // Reset form
      setName('');
      setCode('');
      setProfessor('');
      setRoom('');
      setColor('#0d9488');
      setIconName('Hammer');
      setDays(['Lunes', 'Miércoles', 'Viernes']);
      setStartTime('08:00');
      setEndTime('10:00');
      onClose();
    } catch (err) {
      console.error("Error creating subject:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDaysPreview = daysList
    .filter(d => days.includes(d.id))
    .map(d => d.label)
    .join(' · ') || 'Sin días seleccionados';

  return (
    <div className="fixed inset-0 z-[80] bg-white dark:bg-[#0c0c0e] flex flex-col font-sans overflow-hidden">
      {/* TOP APP BAR */}
      <header className="border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#111] px-4 py-3 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

        <h2 className="text-base font-bold text-gray-900 dark:text-white">Nueva Materia</h2>

        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={!name.trim() || isSubmitting}
          className="px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-full text-xs font-bold shadow-xs active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </header>

      {/* SCROLLABLE FORM BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
        <form onSubmit={handleFormSubmit} className="max-w-md mx-auto space-y-6">
          {/* 1. PREVIEW CARD & ICON SELECTOR BUTTON */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Vista previa de la tarjeta
            </label>

            <div className="bg-white dark:bg-[#16141f] rounded-3xl p-4 shadow-sm border border-gray-150/80 dark:border-white/10 flex flex-col justify-between min-h-[145px]">
              {/* Top Row */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-transform active:scale-90 cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color
                  }}
                  title="Cambiar ícono y color"
                >
                  {renderSubjectIcon(iconName, "w-5 h-5")}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <span>Cambiar ícono / color</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subject Title */}
              <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mt-3 mb-1">
                {name || 'Nombre de la Materia'}
              </h4>

              {/* Time & Days */}
              <div className="mt-auto pt-1 space-y-0.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {startTime} — {endTime}
                </p>
                <p className="text-xs font-bold tracking-tight" style={{ color: color }}>
                  {formattedDaysPreview}
                </p>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE LA MATERIA */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Información de la Asignatura
            </h3>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Nombre de la materia <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Sistemas Estructurales II"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-white"
                autoFocus
              />
            </div>

            {/* Grid 2 Columnas: Código y Profesor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Código (Opcional)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="EST-201"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Profesor / Docente (Opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={professor}
                    onChange={e => setProfessor(e.target.value)}
                    placeholder="Ej: Dr. Carlos Pérez"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Aula */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Aula / Salón (Opcional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="Ej: Edificio B - Aula 302"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. HORARIO Y DÍAS DE CLASE */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Horario y Días de Clase
            </h3>

            {/* Selector de Días */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Días de la semana
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {daysList.map(d => {
                  const isSelected = days.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`h-11 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs scale-102'
                          : 'bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horas Inicio y Fin */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Hora de Inicio</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Hora de Fin</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. BOTÓN CREAR MATERIA */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full py-3.5 bg-black text-white dark:bg-white dark:text-black rounded-2xl text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Creando Materia...' : 'Crear Materia'}
            </button>
          </div>
        </form>
      </div>

      {/* ICON & COLOR PICKER MODAL */}
      <SubjectIconPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedIconId={iconName}
        onSelectIcon={id => {
          setIconName(id);
          setIsPickerOpen(false);
        }}
        selectedColor={color}
        onSelectColor={c => setColor(c)}
      />
    </div>
  );
};
