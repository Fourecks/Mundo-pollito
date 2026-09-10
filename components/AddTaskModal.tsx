import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Mic, MicOff, Calendar as CalendarIcon, Flag, Clock, 
  Bell, Repeat, FileText, CheckSquare, Plus, Trash2, Users 
} from 'lucide-react';
import { Priority, Project, RecurrenceRule, Subtask } from '../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (text: string, options?: any) => Promise<void> | void;
  projects?: Project[];
  fixedProjectId?: number | null;
  activeProject?: Project | null;
  initialDate?: string;
  initialAssignee?: string | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddTask,
  projects = [],
  fixedProjectId = null,
  activeProject = null,
  initialDate,
  initialAssignee = ''
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Date and Time states
  const todayStr = new Date().toISOString().split('T')[0];
  const [isUndated, setIsUndated] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [dueDate, setDueDate] = useState(initialDate || todayStr);
  const [endDate, setEndDate] = useState(initialDate || todayStr);

  // Priority state
  const [priority, setPriority] = useState<Priority>('medium');

  // Project affiliation
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    fixedProjectId ?? activeProject?.id ?? null
  );

  // Assignee state (only for advanced projects)
  const [assignee, setAssignee] = useState<string>(initialAssignee || '');

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Horario / Time
  const [hasTime, setHasTime] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Recordatorio / Reminder
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<number>(0);

  // Repetir / Recurrence
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Notas
  const [notes, setNotes] = useState('');

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Determine current project and whether it is advanced
  const currentProject = (fixedProjectId || activeProject) 
    ? (activeProject || projects.find(p => p.id === (fixedProjectId ?? activeProject?.id)))
    : projects.find(p => p.id === selectedProjectId);

  const isCurrentProjectAdvanced = currentProject?.project_mode === 'advanced';

  // Get members of the current advanced project
  const projectMembers = React.useMemo(() => {
    if (!currentProject || currentProject.project_mode !== 'advanced') return [];
    const list = currentProject.members ? [...currentProject.members] : [];
    
    // Include owner/creator if not already in members
    if (currentProject.owner_email && !list.some(m => m.email === currentProject.owner_email)) {
      list.unshift({
        id: 'owner',
        name: currentProject.owner_name || 'Creador',
        email: currentProject.owner_email,
        role: 'owner'
      });
    }
    return list;
  }, [currentProject]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    }
  }, []);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setText('');
      setIsUndated(false);
      setHasEndDate(false);
      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      setDueDate(targetDate);
      setEndDate(targetDate);
      setPriority('medium');
      setSelectedProjectId(fixedProjectId ?? activeProject?.id ?? null);
      setAssignee(initialAssignee || '');
      setShowAdvanced(false);
      setHasTime(false);
      setStartTime('09:00');
      setEndTime('10:00');
      setHasReminder(false);
      setReminderOffset(0);
      setHasRecurrence(false);
      setRecurrenceFreq('daily');
      setNotes('');
      setSubtasks([]);
      setSubtaskInput('');
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  }, [isOpen, fixedProjectId, activeProject?.id, initialDate, initialAssignee]);

  // Handle Speech Recognition
  const handleMicClick = () => {
    if (!isSpeechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'es-ES';
    recognition.interimResults = true;

    const baseText = text ? text + (text.endsWith(' ') ? '' : ' ') : '';
    let finalTranscript = '';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setText(baseText + finalTranscript + interimTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks(prev => [...prev, { id: Date.now(), text: subtaskInput.trim(), completed: false }]);
    setSubtaskInput('');
  };

  const handleToggleSubtask = (id: number) => {
    setSubtasks(prev => prev.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const handleRemoveSubtask = (id: number) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const effectiveProjectId = fixedProjectId ?? selectedProjectId;
    const isAdv = isCurrentProjectAdvanced;

    let subtasksToSave = [...subtasks];
    if (subtaskInput.trim()) {
      subtasksToSave.push({ id: Date.now(), text: subtaskInput.trim(), completed: false });
    }

    const recurrenceToSave: RecurrenceRule = (hasRecurrence && !isUndated)
      ? { frequency: recurrenceFreq, id: crypto.randomUUID() }
      : { frequency: 'none' };

    await onAddTask(text.trim(), {
      projectId: effectiveProjectId,
      isUndated,
      dueDate: isUndated ? null : dueDate,
      endDate: isUndated || !hasEndDate ? undefined : endDate,
      priority,
      assignee: isAdv ? (assignee.trim() || null) : null,
      assigned_to: isAdv ? (assignee.trim() || null) : null,
      startTime: hasTime && !isUndated ? startTime : undefined,
      endTime: hasTime && !isUndated ? endTime : undefined,
      reminder_offset: hasReminder && !isUndated ? reminderOffset : undefined,
      recurrence: recurrenceToSave,
      notes: notes.trim() ? notes.trim() : undefined,
      subtasks: subtasksToSave.length > 0 ? subtasksToSave : undefined,
      kanban_column: 'Por hacer'
    });

    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[100010] overflow-y-auto animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-lg mx-auto flex flex-col my-auto max-h-[90vh] overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              Nueva Tarea
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {currentProject 
                ? `${currentProject.emoji ? `${currentProject.emoji} ` : ''}${currentProject.name}`
                : 'Crea una tarea en tu lista'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* Title and Dictation */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Título de la tarea
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="¿Qué necesitas hacer?"
                rows={2}
                className="w-full box-border px-3.5 py-2.5 pr-11 text-xs sm:text-sm font-medium rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all resize-none"
              />
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300'
                  }`}
                  title="Dictar por voz"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Fecha y Rango de Días */}
          <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Fecha</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer text-zinc-500">
                <input
                  type="checkbox"
                  checked={isUndated}
                  onChange={e => setIsUndated(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Sin fecha</span>
              </label>
            </div>

            {!isUndated && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Tipo de asignación</span>
                  <div className="flex bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setHasEndDate(false)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                        !hasEndDate
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold'
                          : 'text-zinc-500'
                      }`}
                    >
                      Día único
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasEndDate(true);
                        if (!endDate) setEndDate(dueDate);
                      }}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                        hasEndDate
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold'
                          : 'text-zinc-500'
                      }`}
                    >
                      Rango de días
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 block mb-1">
                      {hasEndDate ? 'Fecha de inicio' : 'Fecha'}
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full box-border px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                    />
                  </div>

                  {hasEndDate && (
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 block mb-1">
                        Fecha de término
                      </span>
                      <input
                        type="date"
                        value={endDate}
                        min={dueDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full box-border px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as Priority[]).map(p => {
                const labels: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-2.5 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white font-bold shadow-2xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                    }`}
                  >
                    <Flag className={`w-3 h-3 ${isSelected ? (p === 'high' ? 'text-rose-400 dark:text-rose-600' : p === 'medium' ? 'text-amber-400 dark:text-amber-600' : 'text-zinc-300 dark:text-zinc-600') : 'text-zinc-400'}`} />
                    <span>{labels[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Proyecto (si no está fijo en un proyecto) */}
          {!fixedProjectId && projects.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Proyecto
              </label>
              <select
                value={selectedProjectId || ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedProjectId(val);
                  setAssignee('');
                }}
                className="w-full box-border px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none"
              >
                <option value="">Sin proyecto asociado</option>
                {projects.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.emoji ? `${pr.emoji} ` : ''}{pr.name} {pr.project_mode === 'advanced' ? '(Avanzado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campo "Asignar a" - SOLO SE MUESTRA SI ES UN PROYECTO AVANZADO */}
          {isCurrentProjectAdvanced && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Asignar a (Miembro del proyecto)</span>
              </div>
              <select
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                className="w-full box-border px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
              >
                <option value="">(Sin asignar)</option>
                {projectMembers.map(m => (
                  <option key={m.id || m.email || m.name} value={m.name || m.email}>
                    {m.name || m.email} {m.role ? `(${m.role})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400">
                Selecciona qué miembro del equipo será el responsable de esta tarea.
              </p>
            </div>
          )}

          {/* Toggle Más Opciones */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{showAdvanced ? 'Ocultar opciones adicionales' : '+ Más opciones (horario, recordatorio, notas, subtareas)'}</span>
          </button>

          {/* Opciones Adicionales */}
          {showAdvanced && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Horario */}
              <div className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Añadir Hora</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hasTime}
                    onChange={e => setHasTime(e.target.checked)}
                    disabled={isUndated}
                    className="w-3.5 h-3.5 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                  />
                </div>

                {hasTime && !isUndated && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Inicio</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full box-border bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Fin (opcional)</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full box-border bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recordatorio */}
              <div className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Recordatorio</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hasReminder}
                    onChange={e => setHasReminder(e.target.checked)}
                    disabled={isUndated}
                    className="w-3.5 h-3.5 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                  />
                </div>

                {hasReminder && !isUndated && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <select
                      value={reminderOffset}
                      onChange={e => setReminderOffset(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                    >
                      <option value="0">En el momento de la hora de inicio</option>
                      <option value="10">10 minutos antes</option>
                      <option value="30">30 minutos antes</option>
                      <option value="60">1 hora antes</option>
                      <option value="1440">1 día antes</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Repetir Tarea */}
              <div className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Repetir Tarea</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hasRecurrence}
                    onChange={e => setHasRecurrence(e.target.checked)}
                    disabled={isUndated}
                    className="w-3.5 h-3.5 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                  />
                </div>

                {hasRecurrence && !isUndated && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'daily', label: 'Diario' },
                        { id: 'weekly', label: 'Semanal' },
                        { id: 'monthly', label: 'Mensual' },
                      ].map(freq => (
                        <button
                          key={freq.id}
                          type="button"
                          onClick={() => setRecurrenceFreq(freq.id as any)}
                          className={`py-1.5 text-xs font-medium rounded-xl border transition-all ${
                            recurrenceFreq === freq.id
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white font-bold'
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Notas adicionales</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalles, enlaces o contexto adicional..."
                  rows={2}
                  className="w-full box-border px-3.5 py-2 text-xs rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none resize-none"
                />
              </div>

              {/* Subtareas */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Subtareas</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={e => setSubtaskInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Añadir subtarea..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!subtaskInput.trim()}
                    className="px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold disabled:opacity-40 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {subtasks.map(st => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 text-xs"
                      >
                        <span className="flex-1 truncate">{st.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!text.trim()}
            className="px-5 py-2 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-xl transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            Guardar Tarea
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default AddTaskModal;
