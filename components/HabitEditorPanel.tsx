import React, { useState, useEffect, useRef } from 'react';
import { Habit, HabitFrequency, FrequencyType, HabitCategory, HabitTimeOfDay, HabitType, HabitDifficulty } from '../types';
import CloseIcon from './icons/CloseIcon';

export interface HabitFormData {
  name: string;
  emoji: string;
  frequency: HabitFrequency;
  category?: HabitCategory | string | null;
  time_of_day?: HabitTimeOfDay | null;
  habit_type?: HabitType | null;
  target_value?: number | null;
  target_unit?: string | null;
  difficulty?: HabitDifficulty | null;
  reminder_time?: string | null;
  reminder_enabled?: boolean | null;
}

interface HabitEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HabitFormData) => void;
  habitToEdit: Habit | null;
}

const weekdayLabels = [
  { label: 'Dom', index: 0 },
  { label: 'Lun', index: 1 },
  { label: 'Mar', index: 2 },
  { label: 'Mié', index: 3 },
  { label: 'Jue', index: 4 },
  { label: 'Vie', index: 5 },
  { label: 'Sáb', index: 6 }
];

const CATEGORIES: { id: HabitCategory; label: string; icon: string; color: string }[] = [
  { id: 'Salud', label: 'Salud', icon: '❤️', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'Productividad', label: 'Productividad', icon: '⚡', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'Mente', label: 'Mente', icon: '🧠', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'Finanzas', label: 'Finanzas', icon: '💰', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'Rutina', label: 'Rutina', icon: '☀️', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'Personal', label: 'Personal', icon: '🌱', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  { id: 'Fitness', label: 'Fitness', icon: '🏃', color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  { id: 'Estudio', label: 'Estudio', icon: '📚', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'Relaciones', label: 'Relaciones', icon: '🤝', color: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
  { id: 'Otro', label: 'Otro', icon: '✨', color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
];

const TIME_OPTIONS: { id: HabitTimeOfDay; label: string; icon: string; desc: string }[] = [
  { id: 'anytime', label: 'Cualquiera', icon: '🕒', desc: 'Todo el día' },
  { id: 'morning', label: 'Mañana', icon: '🌅', desc: 'Antes de 12:00' },
  { id: 'afternoon', label: 'Tarde', icon: '☀️', desc: '12:00 - 18:00' },
  { id: 'night', label: 'Noche', icon: '🌙', desc: 'Después de 18:00' },
];

const DIFFICULTY_OPTIONS: { id: HabitDifficulty; label: string; desc: string; color: string }[] = [
  { id: 'easy', label: 'Ligero', desc: 'Fácil de iniciar', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'medium', label: 'Moderado', desc: 'Esfuerzo estándar', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'hard', label: 'Intenso', desc: 'Requiere disciplina', color: 'text-rose-600 dark:text-rose-400' },
];

const EMOJI_CATEGORIES = [
  {
    name: 'Salud y Fitness',
    emojis: ['💧', '🏃', '🚴', '🧘', '🥗', '💤', '🍎', '💊', '🚶', '🏋️', '🛏️', '🥑', '🥦', '🏊', '🍵', '🚿']
  },
  {
    name: 'Mente y Aprendizaje',
    emojis: ['📚', '✍️', '🧠', '🎯', '🎨', '🎸', '📖', '🎧', '💻', '💡', '📝', '⚡', '🎹', '♟️', '🗣️', '🔍']
  },
  {
    name: 'Rutina y Bienestar',
    emojis: ['☀️', '🌙', '🪴', '🧹', '☕', '🍳', '🧼', '🎒', '🐕', '🔑', '⏰', '✨', '🧘‍♂️', '🪥', '🧺', '📵']
  },
  {
    name: 'Finanzas y Organización',
    emojis: ['💰', '📊', '📈', '💳', '👛', '🧾', '📅', '🗂️', '💼', '📌', '🎯', '🏷️']
  }
];

const COMMON_UNITS = ['minutos', 'veces', 'páginas', 'ml', 'vasos', 'km', 'horas', 'calorías'];

const HabitEditorPanel: React.FC<HabitEditorPanelProps> = ({ isOpen, onClose, onSave, habitToEdit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [category, setCategory] = useState<HabitCategory>('Salud');
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>('anytime');
  const [habitType, setHabitType] = useState<HabitType>('boolean');
  const [targetValue, setTargetValue] = useState<number>(2000);
  const [targetUnit, setTargetUnit] = useState<string>('ml');
  const [difficulty, setDifficulty] = useState<HabitDifficulty>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  
  // Frequency state
  const [freqType, setFreqType] = useState<FrequencyType>('daily');
  const [specificDays, setSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);
  const [intervalDays, setIntervalDays] = useState<number>(2);
  const [intervalStartDate, setIntervalStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'frequency' | 'options'>('basics');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name || '');
        setEmoji(habitToEdit.emoji || '💧');
        setCategory((habitToEdit.category as HabitCategory) || 'Salud');
        setTimeOfDay(habitToEdit.time_of_day || 'anytime');
        setHabitType(habitToEdit.habit_type || 'boolean');
        setTargetValue(habitToEdit.target_value || 10);
        setTargetUnit(habitToEdit.target_unit || 'minutos');
        setDifficulty(habitToEdit.difficulty || 'medium');
        setReminderEnabled(Boolean(habitToEdit.reminder_enabled));
        setReminderTime(habitToEdit.reminder_time || '08:00');

        const freq = habitToEdit.frequency || { type: 'daily' };
        setFreqType(freq.type);
        if (freq.type === 'specific_days') {
          setSpecificDays(freq.days || [1, 2, 3, 4, 5]);
        } else if (freq.type === 'times_per_week') {
          setTimesPerWeek(freq.count || 3);
        } else if (freq.type === 'interval') {
          setIntervalDays(freq.days || 2);
          setIntervalStartDate(freq.startDate || new Date().toISOString().split('T')[0]);
        }
      } else {
        setName('');
        setEmoji('💧');
        setCategory('Salud');
        setTimeOfDay('anytime');
        setHabitType('boolean');
        setTargetValue(2000);
        setTargetUnit('ml');
        setDifficulty('medium');
        setReminderEnabled(false);
        setReminderTime('08:00');
        setFreqType('daily');
        setSpecificDays([1, 2, 3, 4, 5]);
        setTimesPerWeek(3);
        setIntervalDays(2);
        setIntervalStartDate(new Date().toISOString().split('T')[0]);
      }
      setIsEmojiPickerOpen(false);
      setActiveTab('basics');
    }
  }, [isOpen, habitToEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  if (!isOpen) return null;

  const toggleWeekday = (dayIndex: number) => {
    setSpecificDays(prev => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev; // At least one day
        return prev.filter(d => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalFrequency: HabitFrequency;
    switch (freqType) {
      case 'daily':
        finalFrequency = { type: 'daily' };
        break;
      case 'specific_days':
        finalFrequency = { type: 'specific_days', days: specificDays.length > 0 ? specificDays : [0, 1, 2, 3, 4, 5, 6] };
        break;
      case 'times_per_week':
        finalFrequency = { type: 'times_per_week', count: Math.max(1, Math.min(7, timesPerWeek)) };
        break;
      case 'interval':
        finalFrequency = {
          type: 'interval',
          days: Math.max(1, intervalDays),
          startDate: intervalStartDate || new Date().toISOString().split('T')[0]
        };
        break;
      default:
        finalFrequency = { type: 'daily' };
    }

    onSave({
      name: name.trim(),
      emoji,
      frequency: finalFrequency,
      category,
      time_of_day: timeOfDay,
      habit_type: habitType,
      target_value: habitType === 'quantitative' ? Number(targetValue) || 1 : null,
      target_unit: habitType === 'quantitative' ? targetUnit.trim() : null,
      difficulty,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminderTime : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {habitToEdit ? 'Editar Hábito' : 'Nuevo Hábito'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'basics'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            1. Básico y Tipo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('frequency')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'frequency'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            2. Frecuencia
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'options'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            3. Horario y Alerta
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'basics' && (
            <div className="space-y-5 animate-fade-in">
              {/* Name & Emoji */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Nombre del Hábito
                </label>
                <div className="flex gap-2">
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="w-12 h-11 flex items-center justify-center text-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-primary/20"
                      title="Seleccionar emoji"
                    >
                      {emoji}
                    </button>

                    {isEmojiPickerOpen && (
                      <div className="absolute top-14 left-0 z-50 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 max-h-64 overflow-y-auto">
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.name} className="mb-3 last:mb-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                              {cat.name}
                            </span>
                            <div className="grid grid-cols-6 gap-1.5 mt-1">
                              {cat.emojis.map(e => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => {
                                    setEmoji(e);
                                    setIsEmojiPickerOpen(false);
                                  }}
                                  className="h-9 flex items-center justify-center text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Beber 2L de agua, Meditar, Leer..."
                    required
                    autoFocus
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Categoría
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                          isSelected
                            ? `${cat.color} font-semibold ring-2 ring-primary/20`
                            : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de Hábito (Simple vs Cuantitativo) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Tipo de Registro
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHabitType('boolean')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      habitType === 'boolean'
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                      <span>✓</span>
                      <span>Simple (Sí/No)</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Check rápido para marcar como cumplido.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHabitType('quantitative')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      habitType === 'quantitative'
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                      <span>📊</span>
                      <span>Cuantitativo (Meta)</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Progreso numérico medible (litros, min, págs).
                    </p>
                  </button>
                </div>

                {habitType === 'quantitative' && (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Meta Diaria
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={targetValue}
                          onChange={e => setTargetValue(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Unidad de medida
                        </label>
                        <input
                          type="text"
                          value={targetUnit}
                          onChange={e => setTargetUnit(e.target.value)}
                          placeholder="ml, min, páginas, km..."
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_UNITS.map(unit => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setTargetUnit(unit)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border ${
                            targetUnit === unit
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dificultad */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Nivel de Esfuerzo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDifficulty(opt.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        difficulty === opt.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className={`text-xs font-bold ${opt.color}`}>{opt.label}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frequency' && (
            <div className="space-y-5 animate-fade-in">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                ¿Con qué frecuencia deseas realizarlo?
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'daily', label: 'Diariamente', desc: 'Todos los días' },
                  { id: 'specific_days', label: 'Días Específicos', desc: 'Días seleccionados' },
                  { id: 'times_per_week', label: 'Meta Semanal', desc: 'X veces por semana' },
                  { id: 'interval', label: 'Intervalo', desc: 'Cada N días' },
                ].map(freq => (
                  <button
                    key={freq.id}
                    type="button"
                    onClick={() => setFreqType(freq.id as FrequencyType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      freqType === freq.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">{freq.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{freq.desc}</div>
                  </button>
                ))}
              </div>

              {/* Frecuencia: Días Específicos */}
              {freqType === 'specific_days' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Selecciona los días aplicables:
                  </span>
                  <div className="flex justify-between gap-1 pt-1">
                    {weekdayLabels.map(day => {
                      const isSelected = specificDays.includes(day.index);
                      return (
                        <button
                          key={day.index}
                          type="button"
                          onClick={() => toggleWeekday(day.index)}
                          className={`w-10 h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Frecuencia: Veces por semana */}
              {freqType === 'times_per_week' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Objetivo por semana:
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {timesPerWeek} {timesPerWeek === 1 ? 'vez' : 'veces'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={timesPerWeek}
                    onChange={e => setTimesPerWeek(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>1 vez</span>
                    <span>4 veces</span>
                    <span>7 días</span>
                  </div>
                </div>
              )}

              {/* Frecuencia: Intervalo */}
              {freqType === 'interval' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Repetir cada</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={intervalDays}
                      onChange={e => setIntervalDays(Number(e.target.value))}
                      className="w-16 px-2 py-1.5 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">días</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={intervalStartDate}
                      onChange={e => setIntervalStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-5 animate-fade-in">
              {/* Momento del Día */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Momento Ideal del Día
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTimeOfDay(opt.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        timeOfDay === opt.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 font-semibold'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className="text-base mb-0.5">{opt.icon}</div>
                      <div className="text-xs text-gray-900 dark:text-gray-100">{opt.label}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recordatorio */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        Recordatorio Diario
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Recibe una notificación para no olvidar este hábito
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={e => setReminderEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>

                {reminderEnabled && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Hora del recordatorio:
                    </span>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex gap-1">
              {activeTab !== 'basics' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'options' ? 'frequency' : 'basics')}
                  className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  ← Anterior
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              {activeTab !== 'options' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'basics' ? 'frequency' : 'options')}
                  className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {habitToEdit ? 'Guardar Cambios' : 'Crear Hábito'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitEditorPanel;
