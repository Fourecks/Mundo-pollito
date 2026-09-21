import React, { useState, useEffect } from 'react';
import { Todo, Folder, Note, Project } from '../../types';
import { Subject, AcademicPeriod, Exam, Reading, Goal, Grade, GradeCategory, StudySession, Attendance } from './types';
import { getAll, syncableCreate, syncableUpdate, syncableDelete, ensureDB } from '../../db';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { SubjectWorkspace } from './SubjectWorkspace';
import { AcademicAnalytics } from './AcademicAnalytics';
import { computeGoalProgress } from './utils/goalProgress';
import { calculateGradeSummary } from './utils/gradeCalculator';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, BookOpen, Target, BarChart2, CheckCircle2, Trash2 } from 'lucide-react';

interface StudentModuleProps {
  notes?: Note[];
  folders?: Folder[];
  onAddFolder?: (name: string, projectId?: number, subjectId?: string) => Promise<Folder | null>;
  onUpdateFolder?: (folderId: number, name: string) => Promise<void>;
  onDeleteFolder?: (folderId: number) => Promise<void>;
  onAddNote?: (folderId: number | null, projectId?: number, subjectId?: string) => Promise<Note | null>;
  onUpdateNote?: (note: Note) => Promise<void>;
  onDeleteNote?: (noteId: number, folderId: number | null) => Promise<void>;
}

export const StudentModule: React.FC<StudentModuleProps> = ({
  notes = [],
  folders = [],
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'library' | 'goals' | 'analytics'>('dashboard');
  
  // Mobile navigation states
  const [mobileTab, setMobileTab] = useState<'resumen' | 'materias' | 'mas'>('resumen');
  const [masSubScreen, setMasSubScreen] = useState<'calendar' | 'library' | 'goals' | 'analytics' | null>(null);

  // New Subject Form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectProfessor, setNewSubjectProfessor] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#18181b');
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('');
  
  // New Reading Form
  const [isAddingReading, setIsAddingReading] = useState(false);
  const [newReadingTitle, setNewReadingTitle] = useState('');
  const [newReadingAuthor, setNewReadingAuthor] = useState('');
  const [newReadingSubjectId, setNewReadingSubjectId] = useState('');
  
  // New Goal Form
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState<Goal['type']>('personal');
  const [newGoalSubjectId, setNewGoalSubjectId] = useState('');
  const [newGoalTargetValue, setNewGoalTargetValue] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await ensureDB();

      const [
        loadedSubjects,
        loadedPeriods,
        loadedExams,
        loadedReadings,
        loadedGoals,
        loadedCategories,
        loadedGrades,
        loadedSessions,
        loadedAttendances,
        loadedTodos,
        loadedProjects
      ] = await Promise.all([
        getAll<Subject>('student_subjects'),
        getAll<AcademicPeriod>('student_academic_periods'),
        getAll<Exam>('student_exams'),
        getAll<Reading>('student_readings'),
        getAll<Goal>('student_goals'),
        getAll<GradeCategory>('student_grade_categories'),
        getAll<Grade>('student_grades'),
        getAll<StudySession>('student_study_sessions'),
        getAll<Attendance>('student_attendance'),
        getAll<Todo>('todos'),
        getAll<Project>('projects'),
      ]);

      setSubjects(loadedSubjects || []);
      setPeriods(loadedPeriods || []);
      setExams(loadedExams || []);
      setReadings(loadedReadings || []);
      setGoals(loadedGoals || []);
      setCategories(loadedCategories || []);
      setGrades(loadedGrades || []);
      setStudySessions(loadedSessions || []);
      setAttendances(loadedAttendances || []);
      setTodos(loadedTodos || []);
      setProjects(loadedProjects || []);

      // If user is logged in, also try background sync from Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && navigator.onLine) {
          const { data: remoteSubjects } = await supabase.from('student_subjects').select('*').eq('user_id', user.id);
          if (remoteSubjects && remoteSubjects.length > 0) {
            setSubjects(remoteSubjects);
          }
          const { data: remoteGoals } = await supabase.from('student_goals').select('*').eq('user_id', user.id);
          if (remoteGoals && remoteGoals.length > 0) {
            setGoals(remoteGoals);
          }
          const { data: remoteReadings } = await supabase.from('student_readings').select('*').eq('user_id', user.id);
          if (remoteReadings && remoteReadings.length > 0) {
            setReadings(remoteReadings);
          }
        }
      } catch (err) {
        console.warn("Supabase fetch warning:", err);
      }
    } catch (error) {
      console.error("Error loading student data:", error);
    }
  };

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSaveGoal = async () => {
    if (!newGoalTitle.trim()) return;

    let userId = 'local';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {}

    const newGoal: Goal = {
      id: generateUUID(),
      user_id: userId,
      title: newGoalTitle.trim(),
      type: newGoalType || 'personal',
      subject_id: newGoalSubjectId || undefined,
      target_value: newGoalTargetValue ? parseFloat(newGoalTargetValue) : undefined,
      target_date: newGoalTargetDate || undefined,
      status: 'in_progress',
      created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setGoals(prev => [newGoal, ...prev]);
    setIsAddingGoal(false);
    setNewGoalTitle('');
    setNewGoalType('personal');
    setNewGoalSubjectId('');
    setNewGoalTargetValue('');
    setNewGoalTargetDate('');
    
    try {
      await syncableCreate('student_goals', newGoal);
    } catch (err) {
      console.error("Error saving goal:", err);
    }
    loadData();
  };

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) return;

    let userId = 'local';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {}

    const newSubject: Subject = {
      id: generateUUID(),
      user_id: userId,
      name: newSubjectName.trim(),
      professor: newSubjectProfessor.trim() || undefined,
      color: newSubjectColor || '#3B82F6',
      emoji: newSubjectEmoji || '📚',
      created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setSubjects(prev => [newSubject, ...prev]);
    setIsAddingSubject(false);
    setNewSubjectName('');
    setNewSubjectProfessor('');
    
    try {
      await syncableCreate('student_subjects', newSubject);
    } catch (err) {
      console.error("Error saving subject:", err);
    }
    loadData();
  };

  const handleSaveReading = async () => {
    if (!newReadingTitle.trim()) return;

    let userId = 'local';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {}

    const newReading: Reading = {
      id: generateUUID(),
      user_id: userId,
      title: newReadingTitle.trim(),
      author: newReadingAuthor.trim() || undefined,
      subject_id: newReadingSubjectId || undefined,
      type: 'book',
      status: 'want_to_read',
      current_page: 0,
      created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setReadings(prev => [newReading, ...prev]);
    setIsAddingReading(false);
    setNewReadingTitle('');
    setNewReadingAuthor('');
    setNewReadingSubjectId('');
    
    try {
      await syncableCreate('student_readings', newReading);
    } catch (err) {
      console.error("Error saving reading:", err);
    }
    loadData();
  };

  const handleDeleteSubject = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar esta materia?')) return;
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    try {
      await syncableDelete('student_subjects', subjectId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteGoal = async (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    try {
      await syncableDelete('student_goals', goalId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleToggleGoalStatus = async (goal: Goal) => {
    const nextStatus = goal.status === 'in_progress' ? 'achieved' : goal.status === 'achieved' ? 'missed' : 'in_progress';
    const updated = { ...goal, status: nextStatus as any };
    setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
    try {
      await syncableUpdate('student_goals', updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReading = async (readingId: string) => {
    setReadings(prev => prev.filter(r => r.id !== readingId));
    try {
      await syncableDelete('student_readings', readingId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  if (activeSubject) {
    return (
      <SubjectWorkspace 
        subject={activeSubject} 
        onBack={() => { setActiveSubject(null); loadData(); }}
        notes={notes}
        folders={folders}
        onAddFolder={onAddFolder}
        onUpdateFolder={onUpdateFolder}
        onDeleteFolder={onDeleteFolder}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      
      {/* DESKTOP HEADER */}
      <header className="hidden md:flex px-8 py-6 border-b border-gray-100 dark:border-white/5 flex-row items-center justify-between flex-shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Study Workspace</h2>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => setActiveTab('dashboard')} className={`text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('calendar')} className={`text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Calendario</button>
            <button onClick={() => setActiveTab('library')} className={`text-sm font-medium transition-colors ${activeTab === 'library' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Biblioteca</button>
            <button onClick={() => setActiveTab('goals')} className={`text-sm font-medium transition-colors ${activeTab === 'goals' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Metas</button>
            <button onClick={() => setActiveTab('analytics')} className={`text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Analíticas</button>
          </div>
        </div>
        <div className="flex gap-3">
          {activeTab === 'library' ? (
            <button onClick={() => setIsAddingReading(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              Añadir lectura
            </button>
          ) : activeTab === 'goals' ? (
            <button onClick={() => setIsAddingGoal(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              Nueva Meta
            </button>
          ) : (
            <button onClick={() => setIsAddingSubject(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              Añadir materia
            </button>
          )}
        </div>
      </header>

      {/* MOBILE HEADER */}
      <div className="block md:hidden border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#111] px-4 pt-4 pb-2 shrink-0">
        {!masSubScreen ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Estudio</h2>
              <button
                type="button"
                onClick={() => {
                  if (mobileTab === 'mas') {
                    setIsAddingSubject(true);
                  } else {
                    setIsAddingSubject(true);
                  }
                }}
                className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold text-lg active:scale-95 transition-transform shadow-xs cursor-pointer"
                title="Añadir"
              >
                +
              </button>
            </div>

            {/* 3 Main Tabs */}
            <div className="grid grid-cols-3 gap-1 text-center">
              <button
                type="button"
                onClick={() => { setMobileTab('resumen'); setMasSubScreen(null); }}
                className={`pb-2.5 text-sm transition-all relative cursor-pointer ${
                  mobileTab === 'resumen' 
                    ? 'text-gray-900 dark:text-white font-bold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
              >
                Resumen
                {mobileTab === 'resumen' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setMobileTab('materias'); setMasSubScreen(null); }}
                className={`pb-2.5 text-sm transition-all relative cursor-pointer ${
                  mobileTab === 'materias' 
                    ? 'text-gray-900 dark:text-white font-bold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
              >
                Materias
                {mobileTab === 'materias' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setMobileTab('mas'); setMasSubScreen(null); }}
                className={`pb-2.5 text-sm transition-all relative cursor-pointer ${
                  mobileTab === 'mas' 
                    ? 'text-gray-900 dark:text-white font-bold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
              >
                Más
                {mobileTab === 'mas' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
            </div>
          </>
        ) : (
          /* Header when inside a sub-screen from "Más" */
          <div className="flex items-center justify-between py-1">
            <button
              type="button"
              onClick={() => setMasSubScreen(null)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-900 dark:text-white hover:opacity-80 transition-opacity cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Más</span>
            </button>

            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px] text-center">
              {masSubScreen === 'calendar' && 'Calendario académico'}
              {masSubScreen === 'library' && 'Biblioteca y lecturas'}
              {masSubScreen === 'goals' && 'Metas académicas'}
              {masSubScreen === 'analytics' && 'Estadísticas'}
            </h3>

            <div>
              {masSubScreen === 'library' ? (
                <button
                  type="button"
                  onClick={() => setIsAddingReading(true)}
                  className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  +
                </button>
              ) : masSubScreen === 'goals' ? (
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(true)}
                  className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  +
                </button>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-[#0A0A0A] pb-32">
        
        {/* DESKTOP CONTENT VIEW */}
        <div className="hidden md:block">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-12">
              <section>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-4">Hoy</h3>
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="flex flex-col items-center justify-center text-center py-6">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">✨</span>
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">Todo al día</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organiza tus materias, notas y sesiones de estudio.</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Materias ({subjects.length})</h3>
                  {subjects.length > 0 && (
                    <button onClick={() => setIsAddingSubject(true)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      + Añadir otra
                    </button>
                  )}
                </div>
                {subjects.length === 0 ? (
                  <div className="bg-transparent rounded-3xl p-8 border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors" onClick={() => setIsAddingSubject(true)}>
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-4">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Todavía no tienes materias</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Haz clic aquí para crear tu primera materia.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjects.map(subject => (
                      <div key={subject.id} onClick={() => setActiveSubject(subject)} className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer group relative">
                        <div className="flex items-start justify-between mb-6">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-inner" style={{ backgroundColor: subject.color }}>
                            <span>{subject.emoji || '📚'}</span>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteSubject(e, subject.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                            title="Eliminar materia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-semibold text-lg mb-1 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{subject.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subject.professor || 'Sin profesor asignado'}</p>
                        
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                            Abrir espacio →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-4">Resumen</h3>
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex flex-wrap gap-8 items-center">
                    <div className="flex flex-col">
                      <span className="text-3xl font-light text-gray-900 dark:text-white">{subjects.length}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Materias</span>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-light text-gray-900 dark:text-white">{exams.length}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Exámenes</span>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-light text-gray-900 dark:text-white">
                        {studySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)} min
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Estudiados</span>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-light text-gray-900 dark:text-white">{goals.length}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Metas</span>
                    </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="max-w-6xl mx-auto">
              <h3 className="text-xl font-medium mb-6">Calendario Académico</h3>
              {exams.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm text-center">
                  <p className="text-gray-500">No hay eventos académicos próximos. Agrega exámenes en el espacio de cada materia.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                  {exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
                    const subject = subjects.find(s => s.id === exam.subject_id);
                    return (
                      <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-white/5 gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-inner flex-shrink-0" style={{ backgroundColor: subject?.color || '#9ca3af' }}>
                            <span>{subject?.emoji || '📅'}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{exam.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span className="font-medium text-gray-700 dark:text-gray-300">{subject?.name || 'Materia Desconocida'}</span>
                              <span>•</span>
                              <span className="capitalize">{exam.type}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(exam.date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{exam.status === 'completed' ? 'Completado' : 'Pendiente'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">Biblioteca y Lecturas</h3>
                <button onClick={() => setIsAddingReading(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Añadir lectura
                </button>
              </div>
              {readings.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm text-center cursor-pointer hover:border-gray-200 transition-colors" onClick={() => setIsAddingReading(true)}>
                  <p className="text-gray-500">Aún no tienes libros o lecturas guardadas. Haz clic para añadir tu primera lectura.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {readings.map(reading => (
                    <div key={reading.id} className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs rounded-md capitalize font-medium">{reading.type}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-md font-medium ${reading.status === 'reading' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : reading.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {reading.status === 'want_to_read' ? 'Por leer' : reading.status === 'reading' ? 'Leyendo' : reading.status === 'completed' ? 'Completado' : 'Pausado'}
                            </span>
                            <button onClick={() => handleDeleteReading(reading.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">{reading.title}</h4>
                        {reading.author && <p className="text-sm text-gray-500 mb-4">{reading.author}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium">Metas Académicas</h3>
                <button onClick={() => setIsAddingGoal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Nueva Meta
                </button>
              </div>
              {goals.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm text-center cursor-pointer hover:border-gray-200 transition-colors" onClick={() => setIsAddingGoal(true)}>
                  <p className="text-gray-500">Aún no tienes metas registradas. Haz clic para crear tu primera meta.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {goals.map(goal => (
                    <div key={goal.id} className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button 
                            onClick={() => handleToggleGoalStatus(goal)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${goal.status === 'achieved' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : goal.status === 'missed' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}
                            title="Haz clic para cambiar estado"
                          >
                            {goal.status === 'in_progress' ? '⏳ En Progreso' : goal.status === 'achieved' ? '✅ Logrado' : '❌ No Logrado'}
                          </button>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">{goal.title}</h4>
                        {goal.target_date && <p className="text-sm text-gray-500 mb-4">Para: {new Date(goal.target_date).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <AcademicAnalytics
              subjects={subjects}
              grades={grades}
              studySessions={studySessions}
              attendances={attendances}
              goals={goals}
              readings={readings}
              exams={exams}
              periods={periods}
              onSelectSubject={(subj) => setActiveSubject(subj)}
            />
          )}
        </div>

        {/* MOBILE CONTENT VIEW */}
        <div className="block md:hidden space-y-6">
          {masSubScreen ? (
            <div>
              {masSubScreen === 'calendar' && (
                <div className="space-y-4">
                  {exams.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 border border-gray-150 dark:border-white/5 text-center text-xs text-gray-500">
                      No hay eventos académicos próximos.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
                        const subject = subjects.find(s => s.id === exam.subject_id);
                        return (
                          <div key={exam.id} className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shrink-0" style={{ backgroundColor: subject?.color || '#3B82F6' }}>
                                {subject?.emoji || '📅'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{exam.title}</h4>
                                <p className="text-[11px] text-gray-500 truncate">{subject?.name || 'Materia'}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block">{exam.date}</span>
                              <span className="text-[10px] text-gray-400 capitalize">{exam.type}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {masSubScreen === 'library' && (
                <div className="space-y-3">
                  {readings.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 border border-gray-150 dark:border-white/5 text-center cursor-pointer" onClick={() => setIsAddingReading(true)}>
                      <p className="text-xs text-gray-500">Sin lecturas guardadas. Toca para añadir una.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {readings.map(reading => (
                        <div key={reading.id} className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{reading.title}</h4>
                            {reading.author && <p className="text-[11px] text-gray-500 truncate">{reading.author}</p>}
                          </div>
                          <button onClick={() => handleDeleteReading(reading.id)} className="p-1 text-gray-400 hover:text-red-500 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {masSubScreen === 'goals' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">Metas Académicas</h3>
                    <button
                      onClick={() => setIsAddingGoal(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nueva Meta
                    </button>
                  </div>

                  {goals.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 border border-gray-150 dark:border-white/5 text-center cursor-pointer" onClick={() => setIsAddingGoal(true)}>
                      <p className="text-xs text-gray-500">Sin metas registradas. Toca para crear tu primera meta.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Activas */}
                      {(() => {
                        const activeGoals = goals.filter(g => g.status !== 'achieved');
                        const completedGoals = goals.filter(g => g.status === 'achieved');

                        return (
                          <>
                            {activeGoals.length > 0 && (
                              <div className="space-y-2.5">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Activas ({activeGoals.length})</h4>
                                {activeGoals.map(goal => {
                                  const prog = computeGoalProgress(goal, subjects, categories, grades, todos, readings, projects);
                                  const subj = subjects.find(s => s.id === goal.subject_id);

                                  return (
                                    <div key={goal.id} className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 space-y-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {subj && (
                                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300">
                                                {subj.emoji || '📚'} {subj.name}
                                              </span>
                                            )}
                                            {goal.type && (
                                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 capitalize">
                                                {goal.type === 'grade' ? 'Promedio' : goal.type === 'subject' ? 'Materia' : goal.type === 'task' ? 'Tareas' : goal.type === 'reading' ? 'Lecturas' : goal.type === 'project' ? 'Proyectos' : 'Personal'}
                                              </span>
                                            )}
                                          </div>
                                          <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1">{goal.title}</h4>
                                          {goal.target_date && (
                                            <p className="text-[10px] text-gray-400 mt-0.5">Fecha límite: {goal.target_date}</p>
                                          )}
                                        </div>
                                        <button 
                                          onClick={() => handleToggleGoalStatus(goal)}
                                          className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-gray-600 dark:text-gray-300 hover:text-emerald-600 rounded-xl shrink-0 font-semibold transition-colors"
                                        >
                                          Completar
                                        </button>
                                      </div>

                                      {/* Bar & Details */}
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-gray-500 font-medium">{prog.subtitle}</span>
                                          <span className="font-bold text-gray-900 dark:text-white">{Math.round(prog.progressPercent)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                          <div 
                                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.max(0, prog.progressPercent))}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {completedGoals.length > 0 && (
                              <div className="space-y-2.5 pt-2">
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completadas ({completedGoals.length})</h4>
                                {completedGoals.map(goal => (
                                  <div key={goal.id} className="p-3 bg-white/60 dark:bg-[#151515]/60 rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between opacity-80">
                                    <div className="min-w-0 pr-2">
                                      <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 line-through truncate">{goal.title}</h4>
                                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✅ Lograda</p>
                                    </div>
                                    <button 
                                      onClick={() => handleToggleGoalStatus(goal)}
                                      className="text-xs px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 font-medium"
                                    >
                                      Reabrir
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {masSubScreen === 'analytics' && (
                <AcademicAnalytics
                  subjects={subjects}
                  grades={grades}
                  studySessions={studySessions}
                  attendances={attendances}
                  goals={goals}
                  readings={readings}
                  exams={exams}
                  periods={periods}
                  onSelectSubject={(subj) => setActiveSubject(subj)}
                />
              )}
            </div>
          ) : (
            <>
              {/* RESUMEN TAB */}
              {mobileTab === 'resumen' && (
                <div className="space-y-5">
                  {/* REGLAS / ALERTAS AUTOMÁTICAS */}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    const in3DaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

                    const tasksDueTomorrow = todos.filter(t => !t.completed && t.due_date === tomorrowStr);
                    const upcomingExamsNext3Days = exams.filter(e => e.status === 'pending' && e.date > todayStr && e.date <= in3DaysStr);
                    const pastExamsWithoutScore = exams.filter(e => e.date < todayStr && !grades.some(g => g.exam_id === e.id && g.score !== null && g.score !== undefined));

                    const alerts = [];
                    if (tasksDueTomorrow.length > 0) {
                      alerts.push({ id: 't-tomorrow', text: `${tasksDueTomorrow.length} ${tasksDueTomorrow.length === 1 ? 'tarea vence' : 'tareas vencen'} mañana.` });
                    }
                    upcomingExamsNext3Days.forEach(e => {
                      const subj = subjects.find(s => s.id === e.subject_id);
                      alerts.push({ id: `e-${e.id}`, text: `Parcial de ${subj?.name || e.title} en 3 días o menos.` });
                    });
                    if (pastExamsWithoutScore.length > 0) {
                      alerts.push({ id: `m-${pastExamsWithoutScore[0].id}`, text: `Falta registrar la nota de "${pastExamsWithoutScore[0].title}".` });
                    }

                    if (alerts.length === 0) return null;

                    return (
                      <div className="space-y-1.5">
                        {alerts.map(a => (
                          <div key={a.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span>{a.text}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* HOY */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-2.5">Hoy</h3>
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const todayExams = exams.filter(e => e.date === todayStr);
                      const todayTasks = todos.filter(t => !t.completed && t.due_date === todayStr);
                      const todayProjects = projects.filter(p => p.due_date === todayStr);

                      const totalTodayCount = todayExams.length + todayTasks.length + todayProjects.length;

                      if (totalTodayCount > 0) {
                        return (
                          <div className="space-y-2">
                            {todayExams.map(exam => {
                              const subj = subjects.find(s => s.id === exam.subject_id);
                              return (
                                <div key={`exam-${exam.id}`} className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm shrink-0" style={{ backgroundColor: subj?.color || '#3B82F6' }}>
                                      {subj?.emoji || '📝'}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{exam.title}</h4>
                                      <p className="text-[11px] text-gray-500 truncate">{subj?.name || 'Materia'}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md shrink-0 uppercase">
                                    Examen
                                  </span>
                                </div>
                              );
                            })}
                            {todayTasks.map(task => {
                              const subj = subjects.find(s => s.id === task.subject_id);
                              return (
                                <div key={`task-${task.id}`} className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      ✓
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{task.text}</h4>
                                      <p className="text-[11px] text-gray-500 truncate">{subj?.name || 'Tarea de materia'}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-md shrink-0 uppercase">
                                    Tarea
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 border border-gray-150 dark:border-white/5 text-center">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">Todo al día</h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">No tienes entregas ni exámenes para hoy.</p>
                        </div>
                      );
                    })()}
                  </section>

                  {/* PRÓXIMAMENTE */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-2.5">Próximamente</h3>
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const upcoming = [
                        ...exams.filter(e => e.date > todayStr).map(e => ({ id: `e-${e.id}`, title: e.title, date: e.date, type: 'Examen', subjId: e.subject_id })),
                        ...todos.filter(t => !t.completed && t.due_date && t.due_date > todayStr).map(t => ({ id: `t-${t.id}`, title: t.text, date: t.due_date!, type: 'Tarea', subjId: t.subject_id }))
                      ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

                      if (upcoming.length > 0) {
                        return (
                          <div className="space-y-2">
                            {upcoming.map(item => {
                              const subj = subjects.find(s => s.id === item.subjId);
                              return (
                                <div key={item.id} className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: subj?.color || '#3B82F6' }}>
                                      {subj?.emoji || '📅'}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{item.title}</h4>
                                      <p className="text-[11px] text-gray-500 truncate">{subj?.name || item.type}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-900 dark:text-white shrink-0">
                                    {item.date}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 border border-gray-150 dark:border-white/5 text-center">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">Sin eventos próximos</h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Los exámenes y entregas aparecerán aquí.</p>
                        </div>
                      );
                    })()}
                  </section>

                  {/* MATERIAS EN RESUMEN */}
                  <section>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">Materias ({subjects.length})</h3>
                    </div>

                    {subjects.length === 0 ? (
                      <div 
                        onClick={() => setIsAddingSubject(true)}
                        className="p-5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Aún no tienes materias</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Toca aquí para crear tu primera materia.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {subjects.slice(0, 3).map(subject => {
                          const subjSummary = calculateGradeSummary(subject, categories, grades);
                          const pendingTasksCount = todos.filter(t => t.subject_id === subject.id && !t.completed).length;

                          return (
                            <div 
                              key={subject.id} 
                              onClick={() => setActiveSubject(subject)}
                              className="p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white flex items-center justify-center text-base shrink-0 border border-gray-200 dark:border-white/10">
                                  {subject.emoji || '📚'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{subject.name}</h4>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {subjSummary.currentAverage !== null ? `${subjSummary.currentAverage.toFixed(1)} / ${subject.grade_scale || 10}` : 'Sin notas'} · {pendingTasksCount} {pendingTasksCount === 1 ? 'pendiente' : 'pendientes'}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            </div>
                          );
                        })}

                        <button 
                          onClick={() => setMobileTab('materias')}
                          className="w-full py-2.5 text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer mt-1"
                        >
                          <span>Ver todas las materias ({subjects.length})</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </section>

                  {/* META ACTIVA */}
                  {(() => {
                    const activeGoal = goals.find(g => g.status !== 'achieved');
                    if (!activeGoal) return null;
                    const prog = computeGoalProgress(activeGoal, subjects, categories, grades, todos, readings, projects);

                    return (
                      <section>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-2.5">Meta Activa</h3>
                        <div className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{activeGoal.title}</h4>
                            <span className="text-xs font-extrabold text-gray-900 dark:text-white">{Math.round(prog.progressPercent)}%</span>
                          </div>
                          <p className="text-[11px] text-gray-500">{prog.subtitle}</p>
                          <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-black dark:bg-white h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, prog.progressPercent))}%` }}
                            />
                          </div>
                        </div>
                      </section>
                    );
                  })()}
                </div>
              )}

              {/* MATERIAS TAB */}
              {mobileTab === 'materias' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                        Ciclo II · 2026
                      </span>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Materias Registradas</h3>
                    </div>
                    <button
                      onClick={() => setIsAddingSubject(true)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                    >
                      + Nueva materia
                    </button>
                  </div>

                  {subjects.length === 0 ? (
                    <div 
                      onClick={() => setIsAddingSubject(true)}
                      className="p-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-center cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Aún no tienes materias</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Toca aquí para crear tu primera materia.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {subjects.map(subject => {
                        const subjSummary = calculateGradeSummary(subject, categories, grades);
                        const pendingTasksCount = todos.filter(t => t.subject_id === subject.id && !t.completed).length;

                        return (
                          <div 
                            key={subject.id} 
                            onClick={() => setActiveSubject(subject)}
                            className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white flex items-center justify-center text-base shrink-0 border border-gray-200 dark:border-white/10">
                                {subject.emoji || '📚'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{subject.name}</h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {subjSummary.currentAverage !== null ? `${subjSummary.currentAverage.toFixed(1)} / ${subject.grade_scale || 10}` : 'Sin notas'} · {pendingTasksCount} pendientes
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={(e) => handleDeleteSubject(e, subject.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                title="Eliminar materia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MÁS TAB */}
              {mobileTab === 'mas' && (
                <div className="space-y-5">
                  {/* PLANIFICACIÓN */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                      Planificación
                    </h3>
                    <div className="space-y-2">
                      <div 
                        onClick={() => setMasSubScreen('calendar')}
                        className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white flex items-center justify-center text-sm font-bold shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white">Calendario académico</h4>
                            <p className="text-[11px] text-gray-500">Exámenes, entregas y fechas clave</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>

                      <div 
                        onClick={() => setMasSubScreen('goals')}
                        className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white flex items-center justify-center text-sm font-bold shrink-0">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white">Metas académicas</h4>
                            <p className="text-[11px] text-gray-500">Objetivos del semestre y avance</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* RECURSOS */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                      Recursos
                    </h3>
                    <div 
                      onClick={() => setMasSubScreen('library')}
                      className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white flex items-center justify-center text-sm font-bold shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white">Biblioteca y lecturas</h4>
                          <p className="text-[11px] text-gray-500">Libros, papers y lecturas guardadas</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                  </div>

                  {/* SEGUIMIENTO */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                      Seguimiento
                    </h3>
                    <div 
                      onClick={() => setMasSubScreen('analytics')}
                      className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-150 dark:border-white/5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white flex items-center justify-center text-sm font-bold shrink-0">
                          <BarChart2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white">Estadísticas</h4>
                          <p className="text-[11px] text-gray-500">Promedio, carga próxima y métricas</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Add Subject Bottom Sheet */}
      <AnimatePresence>
        {isAddingSubject && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl border-t sm:border border-gray-200 dark:border-white/10 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl pb-safe"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto my-1 shrink-0 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Materia</h3>
                <button onClick={() => setIsAddingSubject(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Nombre de la materia *</label>
                  <input 
                    type="text" 
                    value={newSubjectName} 
                    onChange={e => setNewSubjectName(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newSubjectName.trim()) handleSaveSubject(); }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm" 
                    placeholder="Ej: Matemáticas Discretas" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Profesor (Opcional)</label>
                  <input type="text" value={newSubjectProfessor} onChange={e => setNewSubjectProfessor(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm" placeholder="Ej: Carlos Pérez" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Icono / Emoji (Opcional)</label>
                    {newSubjectEmoji && (
                      <button
                        type="button"
                        onClick={() => setNewSubjectEmoji('')}
                        className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      >
                        Eliminar emoji ✕
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={newSubjectEmoji} 
                    onChange={e => setNewSubjectEmoji(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm" 
                    placeholder="Escribe o elige un emoji con el teclado (opcional)" 
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                <button onClick={() => setIsAddingSubject(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveSubject} disabled={!newSubjectName.trim()} className="px-5 py-2.5 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">Guardar Materia</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Reading Bottom Sheet */}
      <AnimatePresence>
        {isAddingReading && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl border-t sm:border border-gray-200 dark:border-white/10 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl pb-safe"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto my-1 shrink-0 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Guardar Lectura / Libro</h3>
                <button onClick={() => setIsAddingReading(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                  <input 
                    type="text" 
                    value={newReadingTitle} 
                    onChange={e => setNewReadingTitle(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newReadingTitle.trim()) handleSaveReading(); }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm" 
                    placeholder="Ej: Clean Code" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Autor (Opcional)</label>
                  <input type="text" value={newReadingAuthor} onChange={e => setNewReadingAuthor(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm" placeholder="Ej: Robert C. Martin" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Materia relacionada (Opcional)</label>
                  <select value={newReadingSubjectId} onChange={e => setNewReadingSubjectId(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white text-sm">
                    <option value="">Ninguna</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                <button onClick={() => setIsAddingReading(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveReading} disabled={!newReadingTitle.trim()} className="px-5 py-2.5 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Bottom Sheet */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl border-t sm:border border-gray-200 dark:border-white/10 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl pb-safe"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto my-1 shrink-0 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Meta Académica</h3>
                <button onClick={() => setIsAddingGoal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Título de la meta *</label>
                  <input 
                    type="text" 
                    value={newGoalTitle} 
                    onChange={e => setNewGoalTitle(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white" 
                    placeholder="Ej: Mantener promedio mínimo de 9.0" 
                    autoFocus 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Tipo de Meta</label>
                    <select
                      value={newGoalType}
                      onChange={e => setNewGoalType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    >
                      <option value="grade">Promedio / Nota</option>
                      <option value="subject">Materia completa</option>
                      <option value="task">Completar Tareas</option>
                      <option value="reading">Completar Lecturas</option>
                      <option value="project">Entregar Proyectos</option>
                      <option value="personal">Personal / General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Valor Objetivo</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newGoalTargetValue}
                      onChange={e => setNewGoalTargetValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                      placeholder="Ej: 9.0 o 5"
                    />
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Materia Asociada (Opcional)</label>
                    <select
                      value={newGoalSubjectId}
                      onChange={e => setNewGoalSubjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    >
                      <option value="">Todas las materias / Global</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Fecha Límite (Opcional)</label>
                  <input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={e => setNewGoalTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                <button onClick={() => setIsAddingGoal(false)} className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveGoal} disabled={!newGoalTitle.trim()} className="px-5 py-2.5 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors">Guardar Meta</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
