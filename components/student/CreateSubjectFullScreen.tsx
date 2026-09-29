import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { renderSubjectIcon } from './subjectIcons';
import { SubjectIconPickerModal } from './SubjectIconPickerModal';

export interface SubjectScheduleSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
}

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
    schedules: Array<{
      day: string;
      start_time: string;
      end_time: string;
    }>;
  }) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { id: 'Lunes', label: 'Lunes', short: 'Lu' },
  { id: 'Martes', label: 'Martes', short: 'Ma' },
  { id: 'Miércoles', label: 'Miércoles', short: 'Mi' },
  { id: 'Jueves', label: 'Jueves', short: 'Ju' },
  { id: 'Viernes', label: 'Viernes', short: 'Vi' },
  { id: 'Sábado', label: 'Sábado', short: 'Sa' },
  { id: 'Domingo', label: 'Domingo', short: 'Do' }
];

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

  // Multi-schedule slots state: each day can have independent start and end times, and multiple slots for the same day
  const [scheduleSlots, setScheduleSlots] = useState<SubjectScheduleSlot[]>([
    { id: 'slot-1', day: 'Lunes', start_time: '08:00', end_time: '10:00' },
    { id: 'slot-2', day: 'Miércoles', start_time: '08:00', end_time: '10:00' },
    { id: 'slot-3', day: 'Viernes', start_time: '08:00', end_time: '10:00' },
  ]);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddSlot = () => {
    const lastSlot = scheduleSlots[scheduleSlots.length - 1];
    const newSlot: SubjectScheduleSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      day: lastSlot ? lastSlot.day : 'Lunes',
      start_time: lastSlot ? lastSlot.start_time : '08:00',
      end_time: lastSlot ? lastSlot.end_time : '10:00',
    };
    setScheduleSlots([...scheduleSlots, newSlot]);
  };

  const handleRemoveSlot = (idToRemove: string) => {
    if (scheduleSlots.length <= 1) return;
    setScheduleSlots(scheduleSlots.filter(s => s.id !== idToRemove));
  };

  const handleSlotChange = (id: string, field: keyof SubjectScheduleSlot, value: string) => {
    setScheduleSlots(scheduleSlots.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const uniqueDays = Array.from(new Set(scheduleSlots.map(s => s.day)));
      const firstSlot = scheduleSlots[0] || { start_time: '08:00', end_time: '10:00' };

      await onSave({
        name: name.trim(),
        code: code.trim() || undefined,
        professor: professor.trim() || undefined,
        room: room.trim() || undefined,
        color,
        icon_name: iconName,
        days: uniqueDays.length > 0 ? uniqueDays : ['Lunes'],
        start_time: firstSlot.start_time || '08:00',
        end_time: firstSlot.end_time || '10:00',
        schedules: scheduleSlots.map(s => ({
          day: s.day,
          start_time: s.start_time,
          end_time: s.end_time
        }))
      });

      // Reset form
      setName('');
      setCode('');
      setProfessor('');
      setRoom('');
      setColor('#0d9488');
      setIconName('Hammer');
      setScheduleSlots([
        { id: 'slot-1', day: 'Lunes', start_time: '08:00', end_time: '10:00' },
        { id: 'slot-2', day: 'Miércoles', start_time: '08:00', end_time: '10:00' },
        { id: 'slot-3', day: 'Viernes', start_time: '08:00', end_time: '10:00' },
      ]);
      onClose();
    } catch (err) {
      console.error("Error creating subject:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview formatting for schedules
  const previewScheduleText = () => {
    if (scheduleSlots.length === 0) return 'Sin horarios configurados';
    if (scheduleSlots.length <= 2) {
      return scheduleSlots.map(s => {
        const shortDay = DAYS_OF_WEEK.find(d => d.id === s.day)?.short || s.day.substring(0, 2);
        return `${shortDay} ${s.start_time} - ${s.end_time}`;
      }).join(' · ');
    }
    const daysSummary = Array.from(new Set(scheduleSlots.map(s => {
      return DAYS_OF_WEEK.find(d => d.id === s.day)?.short || s.day.substring(0, 2);
    }))).join(' · ');
    return `${scheduleSlots.length} horarios (${daysSummary})`;
  };

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
                  {previewScheduleText()}
                </p>
                {code && (
                  <p className="text-[11px] font-mono font-semibold" style={{ color: color }}>
                    {code}
                  </p>
                )}
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

            {/* Grid 2 Columnas: Código y Profesor (Sin iconos en los inputs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Código
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Ej: EST-201"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Profesor / Docente
                </label>
                <input
                  type="text"
                  value={professor}
                  onChange={e => setProfessor(e.target.value)}
                  placeholder="Ej: Dr. Carlos Pérez"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Aula (Sin icono en el input) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Aula / Salón
              </label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="Ej: Edificio B - Aula 302"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* 3. HORARIOS PERSONALIZADOS (Permite múltiples horarios por día con horas independientes) */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Horarios de Clase
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Define horas de inicio y fin para cada día o añade varios turnos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir horario</span>
              </button>
            </div>

            {/* List of schedule slots */}
            <div className="space-y-3">
              {scheduleSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="p-3.5 bg-gray-50 dark:bg-zinc-900/70 border border-gray-200/80 dark:border-white/10 rounded-2xl space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Día {scheduleSlots.length > 1 ? `#${index + 1}` : ''}
                      </label>
                      <select
                        value={slot.day}
                        onChange={e => handleSlotChange(slot.id, 'day', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white cursor-pointer"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {scheduleSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mt-4 cursor-pointer"
                        title="Eliminar este horario"
                        aria-label="Eliminar horario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Hours Row (Start and End independently) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={e => handleSlotChange(slot.id, 'start_time', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Hora Fin
                      </label>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={e => handleSlotChange(slot.id, 'end_time', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. BOTÓN CREAR MATERIA */}
          <div className="pt-2">
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
