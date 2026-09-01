import React, { useState, useEffect } from 'react';
import { Todo } from '../../types';
import { Subject, AcademicPeriod, Exam, Reading, Goal, Grade, StudySession, Attendance } from './types';
import { getAll, syncableCreate, syncableUpdate, syncableDelete, ensureDB } from '../../db';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { SubjectWorkspace } from './SubjectWorkspace';
import { AcademicAnalytics } from './AcademicAnalytics';

export const StudentModule: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'library' | 'goals' | 'analytics'>('dashboard');
  
  // New Subject Form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectProfessor, setNewSubjectProfessor] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#3B82F6');
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('💻');
  
  // New Reading Form
  const [isAddingReading, setIsAddingReading] = useState(false);
  const [newReadingTitle, setNewReadingTitle] = useState('');
  const [newReadingAuthor, setNewReadingAuthor] = useState('');
  const [newReadingSubjectId, setNewReadingSubjectId] = useState('');
  
  // New Goal Form
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

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
        loadedGrades,
        loadedSessions,
        loadedAttendances
      ] = await Promise.all([
        getAll<Subject>('student_subjects'),
        getAll<AcademicPeriod>('student_academic_periods'),
        getAll<Exam>('student_exams'),
        getAll<Reading>('student_readings'),
        getAll<Goal>('student_goals'),
        getAll<Grade>('student_grades'),
        getAll<StudySession>('student_study_sessions'),
        getAll<Attendance>('student_attendance'),
      ]);

      setSubjects(loadedSubjects || []);
      setPeriods(loadedPeriods || []);
      setExams(loadedExams || []);
      setReadings(loadedReadings || []);
      setGoals(loadedGoals || []);
      setGrades(loadedGrades || []);
      setStudySessions(loadedSessions || []);
      setAttendances(loadedAttendances || []);

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
      status: 'in_progress',
      created_at: new Date().toISOString()
    };
    
    // Optimistic update
    setGoals(prev => [newGoal, ...prev]);
    setIsAddingGoal(false);
    setNewGoalTitle('');
    
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
    return <SubjectWorkspace subject={activeSubject} onBack={() => { setActiveSubject(null); loadData(); }} />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Study Workspace</h2>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => setActiveTab('dashboard')} className={`text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('calendar')} className={`text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Calendario</button>
            <button onClick={() => setActiveTab('library')} className={`text-sm font-medium transition-colors ${activeTab === 'library' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Biblioteca</button>
            <button onClick={() => setActiveTab('goals')} className={`text-sm font-medium transition-colors ${activeTab === 'goals' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Metas</button>
            <button onClick={() => setActiveTab('analytics')} className={`text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Analíticas</button>
          </div>
        </div>
        <div className="flex gap-3">
          {activeTab === 'library' ? (
            <button onClick={() => setIsAddingReading(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Añadir lectura
            </button>
          ) : activeTab === 'goals' ? (
            <button onClick={() => setIsAddingGoal(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Nueva Meta
            </button>
          ) : (
            <button onClick={() => setIsAddingSubject(true)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity font-medium text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Añadir materia
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-[#0A0A0A]">
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Today's Section */}
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

          {/* Subjects Section */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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

          {/* Weekly Overview Section */}
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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
      
      {/* Add Subject Modal */}
      <AnimatePresence>
        {isAddingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Nueva Materia</h3>
                <button onClick={() => setIsAddingSubject(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la materia *</label>
                  <input 
                    type="text" 
                    value={newSubjectName} 
                    onChange={e => setNewSubjectName(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newSubjectName.trim()) handleSaveSubject(); }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Matemáticas Discretas" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profesor (Opcional)</label>
                  <input type="text" value={newSubjectProfessor} onChange={e => setNewSubjectProfessor(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Carlos Pérez" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newSubjectColor} onChange={e => setNewSubjectColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                      <span className="text-xs text-gray-500">{newSubjectColor}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
                    <input type="text" value={newSubjectEmoji} onChange={e => setNewSubjectEmoji(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg" placeholder="💻" maxLength={2} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingSubject(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveSubject} disabled={!newSubjectName.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">Guardar Materia</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Reading Modal */}
      <AnimatePresence>
        {isAddingReading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Guardar Lectura / Libro</h3>
                <button onClick={() => setIsAddingReading(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                  <input 
                    type="text" 
                    value={newReadingTitle} 
                    onChange={e => setNewReadingTitle(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newReadingTitle.trim()) handleSaveReading(); }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Clean Code" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor (Opcional)</label>
                  <input type="text" value={newReadingAuthor} onChange={e => setNewReadingAuthor(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Robert C. Martin" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materia relacionada (Opcional)</label>
                  <select value={newReadingSubjectId} onChange={e => setNewReadingSubjectId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Ninguna</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingReading(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveReading} disabled={!newReadingTitle.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Nueva Meta</h3>
                <button onClick={() => setIsAddingGoal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título de la meta *</label>
                  <input 
                    type="text" 
                    value={newGoalTitle} 
                    onChange={e => setNewGoalTitle(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && newGoalTitle.trim()) handleSaveGoal(); }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Terminar semestre con promedio 9.0" 
                    autoFocus 
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingGoal(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveGoal} disabled={!newGoalTitle.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
