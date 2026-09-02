import React, { useState, useEffect } from 'react';
import { Subject, Unit, Exam, Topic, Resource, StudySession, Grade, Attendance, Deck, Flashcard } from './types';
import { Folder, Note } from '../../types';
import NotesSection from '../NotesSection';
import { motion, AnimatePresence } from 'framer-motion';
import { syncableCreate, syncableUpdate, syncableDelete, getAll, ensureDB } from '../../db';
import { supabase } from '../../supabaseClient';

interface Props {
  subject: Subject;
  onBack: () => void;
  notes?: Note[];
  folders?: Folder[];
  onAddFolder?: (name: string, projectId?: number, subjectId?: string) => Promise<Folder | null>;
  onUpdateFolder?: (folderId: number, name: string) => Promise<void>;
  onDeleteFolder?: (folderId: number) => Promise<void>;
  onAddNote?: (folderId: number | null, projectId?: number, subjectId?: string) => Promise<Note | null>;
  onUpdateNote?: (note: Note) => Promise<void>;
  onDeleteNote?: (noteId: number, folderId: number | null) => Promise<void>;
}

export const SubjectWorkspace: React.FC<Props> = ({ 
  subject, 
  onBack,
  notes = [],
  folders = [],
  onAddFolder = async () => null,
  onUpdateFolder = async () => {},
  onDeleteFolder = async () => {},
  onAddNote = async () => null,
  onUpdateNote = async () => {},
  onDeleteNote = async () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'notes' | 'tasks' | 'exams' | 'resources' | 'study' | 'grades' | 'flashcards'>('overview');
  
  // Flashcards State
  const [decks, setDecks] = useState<Deck[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // Units State
  const [units, setUnits] = useState<Unit[]>([]);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Exams State
  const [exams, setExams] = useState<Exam[]>([]);
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  
  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<'link' | 'pdf' | 'video' | 'document' | 'other'>('link');
  
  // Study State
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [isStudying, setIsStudying] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [studyObjective, setStudyObjective] = useState('');

  // Grades & Attendance State
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeScore, setNewGradeScore] = useState('');
  const [newGradeMaxScore, setNewGradeMaxScore] = useState('10');
  const [newGradeWeight, setNewGradeWeight] = useState('');

  useEffect(() => {
    loadData();
  }, [subject.id]);

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

  const getUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || 'local';
    } catch {
      return 'local';
    }
  };

  const loadData = async () => {
    try {
      await ensureDB();

      const [
        allUnits,
        allExams,
        allResources,
        allSessions,
        allGrades,
        allAttendances,
        allDecks,
        allCards
      ] = await Promise.all([
        getAll<Unit>('student_units'),
        getAll<Exam>('student_exams'),
        getAll<Resource>('student_resources'),
        getAll<StudySession>('student_study_sessions'),
        getAll<Grade>('student_grades'),
        getAll<Attendance>('student_attendance'),
        getAll<Deck>('student_decks'),
        getAll<Flashcard>('student_flashcards'),
      ]);

      setUnits(allUnits.filter(u => u.subject_id === subject.id));
      setExams(allExams.filter(e => e.subject_id === subject.id));
      setResources(allResources.filter(r => r.subject_id === subject.id));
      setStudySessions(allSessions.filter(s => s.subject_id === subject.id));
      setGrades(allGrades.filter(g => g.subject_id === subject.id));
      setAttendances(allAttendances.filter(a => a.subject_id === subject.id));
      setDecks(allDecks.filter(d => d.subject_id === subject.id));
      setFlashcards(allCards);

      // Background Supabase Sync if online
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && navigator.onLine) {
          const { data: remoteDecks } = await supabase.from('student_decks').select('*').eq('subject_id', subject.id);
          if (remoteDecks) setDecks(remoteDecks);
          
          const { data: remoteExams } = await supabase.from('student_exams').select('*').eq('subject_id', subject.id);
          if (remoteExams) setExams(remoteExams);

          const { data: remoteGrades } = await supabase.from('student_grades').select('*').eq('subject_id', subject.id);
          if (remoteGrades) setGrades(remoteGrades);

          const { data: remoteResources } = await supabase.from('student_resources').select('*').eq('subject_id', subject.id);
          if (remoteResources) setResources(remoteResources);

          const { data: remoteUnits } = await supabase.from('student_units').select('*').eq('subject_id', subject.id);
          if (remoteUnits) setUnits(remoteUnits);
        }
      } catch (err) {
        console.warn("Supabase fetch in workspace:", err);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveDeck = async () => {
    if (!newDeckTitle.trim()) return;
    const userId = await getUserId();
    const newDeck: Deck = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      title: newDeckTitle.trim(),
      created_at: new Date().toISOString()
    };

    setDecks(prev => [newDeck, ...prev]);
    setIsAddingDeck(false);
    setNewDeckTitle('');

    try {
      await syncableCreate('student_decks', newDeck);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteDeck = async (deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (selectedDeck?.id === deckId) setSelectedDeck(null);
    try {
      await syncableDelete('student_decks', deckId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleSaveFlashcard = async () => {
    if (!selectedDeck || !newCardFront.trim() || !newCardBack.trim()) return;
    const newCard: Flashcard = {
      id: generateUUID(),
      deck_id: selectedDeck.id,
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      status: 'new',
      created_at: new Date().toISOString()
    };

    setFlashcards(prev => [newCard, ...prev]);
    setIsAddingCard(false);
    setNewCardFront('');
    setNewCardBack('');

    try {
      await syncableCreate('student_flashcards', newCard);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteFlashcard = async (cardId: string) => {
    setFlashcards(prev => prev.filter(c => c.id !== cardId));
    try {
      await syncableDelete('student_flashcards', cardId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleRateFlashcard = async (cardId: string, newStatus: 'new' | 'learning' | 'reviewing' | 'known') => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;
    const updated = { ...card, status: newStatus };
    setFlashcards(prev => prev.map(c => c.id === cardId ? updated : c));
    
    const activeCards = flashcards.filter(c => c.deck_id === selectedDeck?.id);
    if (reviewIndex + 1 < activeCards.length) {
      setReviewIndex(reviewIndex + 1);
      setIsCardFlipped(false);
    } else {
      setIsReviewing(false);
      setReviewIndex(0);
      setIsCardFlipped(false);
    }

    try {
      await syncableUpdate('student_flashcards', updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUnit = async () => {
    if (!newUnitName.trim()) return;
    const newUnit: Unit = {
      id: generateUUID(),
      subject_id: subject.id,
      name: newUnitName.trim(),
      order_index: units.length,
    };

    setUnits(prev => [...prev, newUnit]);
    setIsAddingUnit(false);
    setNewUnitName('');

    try {
      await syncableCreate('student_units', newUnit);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteUnit = async (unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId));
    try {
      await syncableDelete('student_units', unitId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleSaveExam = async () => {
    if (!newExamTitle.trim() || !newExamDate) return;
    const userId = await getUserId();
    const newExam: Exam = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      title: newExamTitle.trim(),
      type: 'quiz',
      date: newExamDate,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setExams(prev => [newExam, ...prev]);
    setIsAddingExam(false);
    setNewExamTitle('');
    setNewExamDate('');

    try {
      await syncableCreate('student_exams', newExam);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteExam = async (examId: string) => {
    setExams(prev => prev.filter(e => e.id !== examId));
    try {
      await syncableDelete('student_exams', examId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleSaveResource = async () => {
    if (!newResourceTitle.trim()) return;
    const userId = await getUserId();
    const newResource: Resource = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      title: newResourceTitle.trim(),
      url: newResourceUrl.trim() || undefined,
      type: newResourceType,
      created_at: new Date().toISOString()
    };

    setResources(prev => [newResource, ...prev]);
    setIsAddingResource(false);
    setNewResourceTitle('');
    setNewResourceUrl('');
    setNewResourceType('link');

    try {
      await syncableCreate('student_resources', newResource);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteResource = async (resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));
    try {
      await syncableDelete('student_resources', resourceId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudying) {
      interval = setInterval(() => {
        setStudySeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  const handleFinishStudy = async () => {
    setIsStudying(false);
    if (studySeconds < 60) {
      setStudySeconds(0);
      setStudyObjective('');
      return; // Ignore very short sessions
    }
    
    const userId = await getUserId();
    const newSession: StudySession = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      duration_minutes: Math.round(studySeconds / 60),
      objective: studyObjective.trim() || undefined,
      status: 'completed',
      created_at: new Date().toISOString()
    };
    
    setStudySessions(prev => [newSession, ...prev]);
    setStudySeconds(0);
    setStudyObjective('');

    try {
      await syncableCreate('student_study_sessions', newSession);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveGrade = async () => {
    if (!newGradeName.trim() || !newGradeScore || !newGradeMaxScore || !newGradeWeight) return;

    const userId = await getUserId();
    const newGrade: Grade = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      name: newGradeName.trim(),
      score: parseFloat(newGradeScore),
      max_score: parseFloat(newGradeMaxScore),
      weight: parseFloat(newGradeWeight),
      created_at: new Date().toISOString()
    };
    
    setGrades(prev => [newGrade, ...prev]);
    setIsAddingGrade(false);
    setNewGradeName('');
    setNewGradeScore('');
    setNewGradeMaxScore('10');
    setNewGradeWeight('');

    try {
      await syncableCreate('student_grades', newGrade);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteGrade = async (gradeId: string) => {
    setGrades(prev => prev.filter(g => g.id !== gradeId));
    try {
      await syncableDelete('student_grades', gradeId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleRecordAttendance = async (status: 'present' | 'absent' | 'excused') => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if attendance already recorded today
    const existing = attendances.find(a => a.date === today);
    if (existing) {
      const updated = { ...existing, status };
      setAttendances(prev => prev.map(a => a.id === existing.id ? updated : a));
      try {
        await syncableUpdate('student_attendance', updated);
      } catch (err) {
        console.error(err);
      }
      return; 
    }

    const userId = await getUserId();
    const newAttendance: Attendance = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      date: today,
      status,
      created_at: new Date().toISOString()
    };
    
    setAttendances(prev => [newAttendance, ...prev]);
    try {
      await syncableCreate('student_attendance', newAttendance);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  // Calculate current weighted grade
  const currentGrade = grades.length > 0 
    ? grades.reduce((acc, grade) => acc + (grade.score / grade.max_score) * (grade.weight / 100), 0) * 10
    : 0;
  
  const totalWeight = grades.reduce((acc, grade) => acc + grade.weight, 0);
  
  // Example Calculator State inside UI can just use these constants
  const [targetGrade, setTargetGrade] = useState('8.0');
  const requiredGradeForTarget = totalWeight < 100 && parseFloat(targetGrade)
    ? ((parseFloat(targetGrade)/10 - (currentGrade/10)) / ((100 - totalWeight) / 100)) * 10
    : 0;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-4" style={{ borderBottomColor: `${subject.color}30` }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{subject.emoji}</span>
              <h2 className="text-2xl font-bold tracking-tight">{subject.name}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-9">{subject.professor || 'Sin profesor'}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-8 pt-4 border-b border-gray-100 dark:border-white/5 flex gap-6 overflow-x-auto">
        {(['overview', 'units', 'notes', 'tasks', 'exams', 'resources', 'study', 'grades', 'flashcards'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab === 'notes' ? 'Notas' : tab === 'study' ? 'Sesiones' : tab === 'resources' ? 'Recursos' : tab === 'grades' ? 'Calificaciones' : tab === 'flashcards' ? 'Flashcards' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <motion.div layoutId="subject-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ backgroundColor: subject.color }} />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto h-full">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                  <span className="text-sm text-gray-500">Progreso</span>
                  <div className="text-3xl font-light mt-2">0%</div>
                </div>
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                  <span className="text-sm text-gray-500">Próxima Clase</span>
                  <div className="text-xl font-medium mt-2">-</div>
                </div>
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                  <span className="text-sm text-gray-500">Tareas Pendientes</span>
                  <div className="text-3xl font-light mt-2">0</div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="w-full h-[650px] bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
              <NotesSection
                folders={folders}
                notes={notes}
                onAddFolder={onAddFolder}
                onUpdateFolder={onUpdateFolder}
                onDeleteFolder={onDeleteFolder}
                onAddNote={onAddNote}
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
                subjectId={subject.id}
              />
            </div>
          )}
          
          {activeTab === 'units' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Unidades</h3>
                <button onClick={() => setIsAddingUnit(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Nueva Unidad
                </button>
              </div>
              
              {units.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>No has creado unidades todavía.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {units.map((unit, i) => (
                    <div key={unit.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-sm font-medium text-gray-500">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{unit.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                        title="Eliminar unidad"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="text-center py-20 text-gray-500">
              <p>No hay tareas académicas. La integración con Tasks se realiza desde el módulo global.</p>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Exámenes y Evaluaciones</h3>
                <button onClick={() => setIsAddingExam(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Nuevo Examen
                </button>
              </div>
              
              {exams.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>No hay exámenes programados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map(exam => (
                    <div key={exam.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{exam.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="capitalize">{exam.type}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {exam.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            const newStatus = exam.status === 'completed' ? 'pending' : 'completed';
                            const updated = { ...exam, status: newStatus as any };
                            setExams(prev => prev.map(e => e.id === exam.id ? updated : e));
                            try {
                              await syncableUpdate('student_exams', updated);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${exam.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}
                        >
                          {exam.status === 'completed' ? '✓ Completado' : '⏳ Pendiente'}
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                          title="Eliminar examen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Recursos (Fase 3)</h3>
                <button onClick={() => setIsAddingResource(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Agregar Recurso
                </button>
              </div>
              
              {resources.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>Módulo de Conocimiento. Aquí podrás guardar enlaces, documentos y relacionarlos con tus notas globales.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {resources.map(resource => (
                    <div key={resource.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl">
                            {resource.type === 'link' ? '🔗' : resource.type === 'pdf' ? '📄' : resource.type === 'video' ? '▶️' : '📁'}
                          </div>
                          <button
                            onClick={() => handleDeleteResource(resource.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Eliminar recurso"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{resource.title}</h4>
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-1">
                            {resource.url} ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'study' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Sesiones de Estudio (Fase 4)</h3>
                {!isStudying && (
                  <button onClick={() => setIsStudying(true)} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium transition-colors">
                    Iniciar Temporizador
                  </button>
                )}
              </div>
              
              {isStudying && (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm text-center">
                  <div className="text-6xl font-light mb-6 tabular-nums">{formatTime(studySeconds)}</div>
                  <div className="max-w-md mx-auto mb-8">
                    <input 
                      type="text" 
                      value={studyObjective} 
                      onChange={e => setStudyObjective(e.target.value)} 
                      placeholder="¿Qué estás estudiando ahora? (Opcional)" 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>
                  <button onClick={handleFinishStudy} className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors">
                    Terminar Sesión
                  </button>
                </div>
              )}

              <div className="mt-8">
                <h4 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-4">Historial</h4>
                {studySessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No has registrado sesiones de estudio para esta materia.</p>
                ) : (
                  <div className="space-y-3">
                    {studySessions.map(session => (
                      <div key={session.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{session.objective || 'Sesión de estudio general'}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(session.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="font-mono text-xl font-light text-blue-600 dark:text-blue-400">{session.duration_minutes}m</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Calificaciones y Asistencia (Fase 6)</h3>
                <button onClick={() => setIsAddingGrade(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Agregar Calificación
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Grades List */}
                  <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                    <h4 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-4">Registro de Notas</h4>
                    {grades.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">No hay calificaciones registradas.</p>
                    ) : (
                      <div className="space-y-3">
                        {grades.map(grade => (
                          <div key={grade.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                            <div>
                              <p className="font-medium">{grade.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Peso: {grade.weight}%</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg text-gray-900 dark:text-white">{grade.score} <span className="text-sm text-gray-400 font-normal">/ {grade.max_score}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Asistencia de Hoy</h4>
                      <div className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleRecordAttendance('present')} className="flex-1 py-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-xl font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">Presente</button>
                      <button onClick={() => handleRecordAttendance('absent')} className="flex-1 py-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Ausente</button>
                      <button onClick={() => handleRecordAttendance('excused')} className="flex-1 py-3 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-xl font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors">Excusa</button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between text-sm">
                      <span className="text-gray-500">Asistencias totales:</span>
                      <span className="font-medium">{attendances.filter(a => a.status === 'present').length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Summary & Calculator */}
                  <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                    <h4 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase mb-4">Resumen</h4>
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 mb-1">Nota Acumulada (sobre {totalWeight}%)</p>
                      <p className="text-4xl font-light">{currentGrade.toFixed(2)}</p>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                      <h5 className="font-medium mb-3">Calculadora de Meta</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Nota deseada al final</label>
                          <input type="number" step="0.1" value={targetGrade} onChange={e => setTargetGrade(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-white/10" />
                        </div>
                        {totalWeight < 100 ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Necesitas sacar:</p>
                            <p className="text-xl font-medium text-blue-700 dark:text-blue-300">
                              {requiredGradeForTarget > 10 ? '¡Inalcanzable!' : requiredGradeForTarget < 0 ? '0.00' : requiredGradeForTarget.toFixed(2)} <span className="text-sm font-normal">/ 10</span>
                            </p>
                            <p className="text-xs text-blue-500/70 mt-1">en el {100 - totalWeight}% restante</p>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-sm text-gray-500">
                            Ya tienes el 100% de tus notas registradas.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'flashcards' && (
            <div className="space-y-6">
              {/* If inspecting or practicing a deck */}
              {selectedDeck ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedDeck(null); setIsReviewing(false); }}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500"
                      >
                        ← Volver a Mazos
                      </button>
                      <div>
                        <h3 className="text-xl font-bold">{selectedDeck.title}</h3>
                        <p className="text-xs text-gray-400">
                          {flashcards.filter(c => c.deck_id === selectedDeck.id).length} tarjetas en este mazo
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAddingCard(true)}
                        className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
                      >
                        + Añadir Tarjeta
                      </button>
                      {flashcards.filter(c => c.deck_id === selectedDeck.id).length > 0 && (
                        <button
                          onClick={() => {
                            setReviewIndex(0);
                            setIsCardFlipped(false);
                            setIsReviewing(true);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          ▶ Iniciar Repaso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Reviewing Session Overlay / Screen */}
                  {isReviewing ? (
                    <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm max-w-xl mx-auto text-center space-y-6">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Tarjeta {reviewIndex + 1} de {flashcards.filter(c => c.deck_id === selectedDeck.id).length}</span>
                        <button onClick={() => setIsReviewing(false)} className="hover:underline">Finalizar Repaso</button>
                      </div>

                      {/* Card Canvas with Flip Effect */}
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="min-h-[220px] p-8 rounded-2xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-blue-500"
                      >
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">
                          {isCardFlipped ? 'Respuesta (Reverso)' : 'Pregunta (Anverso)'}
                        </span>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {isCardFlipped
                            ? flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex]?.back
                            : flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex]?.front}
                        </p>
                        <span className="text-xs text-blue-500 mt-4">Toca para voltear 🔄</span>
                      </div>

                      {/* Review Buttons */}
                      {isCardFlipped && (
                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'learning')}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl text-xs font-semibold"
                          >
                            Difícil / Repetir
                          </button>
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'reviewing')}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 rounded-xl text-xs font-semibold"
                          >
                            Regular
                          </button>
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'known')}
                            className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-xl text-xs font-semibold"
                          >
                            Fácil / Dominada
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Cards Grid in Deck */
                    <div>
                      {flashcards.filter(c => c.deck_id === selectedDeck.id).length === 0 ? (
                        <div className="text-center py-16 text-gray-500 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5">
                          <p>Este mazo no contiene tarjetas todavía.</p>
                          <button onClick={() => setIsAddingCard(true)} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">
                            + Añadir primera tarjeta
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {flashcards.filter(c => c.deck_id === selectedDeck.id).map(card => (
                            <div key={card.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pregunta</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  card.status === 'known' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
                                  card.status === 'learning' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                                  'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                }`}>
                                  {card.status === 'known' ? 'Dominada' : card.status === 'learning' ? 'Repasar' : 'Nueva'}
                                </span>
                              </div>
                              <p className="font-semibold text-sm line-clamp-3">{card.front}</p>
                              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Respuesta</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{card.back}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Deck List Overview */
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium">Flashcards y Repaso (Fase 7)</h3>
                    <button onClick={() => setIsAddingDeck(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                      + Crear Mazo
                    </button>
                  </div>

                  {decks.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5">
                      <p>Aún no tienes mazos de flashcards creados.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {decks.map(deck => {
                        const deckCount = flashcards.filter(c => c.deck_id === deck.id).length;
                        return (
                          <div
                            key={deck.id}
                            onClick={() => setSelectedDeck(deck)}
                            className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-4 group hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center text-2xl shadow-inner">
                                🗂️
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{deck.title}</h4>
                                <p className="text-xs text-gray-400">{deckCount} {deckCount === 1 ? 'tarjeta' : 'tarjetas'}</p>
                              </div>
                            </div>
                            <div className="mt-auto">
                              <button className="w-full py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">
                                {deckCount > 0 ? 'Abrir y Repasar' : 'Añadir Tarjetas'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Unit Modal */}
      <AnimatePresence>
        {isAddingUnit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-semibold">Nueva Unidad</h3>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la unidad</label>
                <input type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Fundamentos" autoFocus />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingUnit(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveUnit} disabled={!newUnitName.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Exam Modal */}
      <AnimatePresence>
        {isAddingExam && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-semibold">Programar Examen</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                  <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Parcial 1" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingExam(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveExam} disabled={!newExamTitle.trim() || !newExamDate} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-semibold">Guardar Recurso</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                  <input type="text" value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Diapositivas Clase 1" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL / Enlace</label>
                  <input type="url" value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as any)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="link">Enlace (Web)</option>
                    <option value="pdf">Documento PDF</option>
                    <option value="video">Video</option>
                    <option value="document">Documento (Word/Docs)</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingResource(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveResource} disabled={!newResourceTitle.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Grade Modal */}
      <AnimatePresence>
        {isAddingGrade && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Registrar Calificación</h3>
                <button onClick={() => setIsAddingGrade(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Evaluación</label>
                  <input type="text" value={newGradeName} onChange={e => setNewGradeName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Parcial 1, Trabajo Final..." autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota Obtenida</label>
                    <input type="number" step="0.1" value={newGradeScore} onChange={e => setNewGradeScore(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 8.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota Máxima</label>
                    <input type="number" step="0.1" value={newGradeMaxScore} onChange={e => setNewGradeMaxScore(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (%)</label>
                  <div className="relative">
                    <input type="number" step="0.1" max="100" value={newGradeWeight} onChange={e => setNewGradeWeight(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8" placeholder="Ej: 30" />
                    <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">El porcentaje que vale sobre la nota final.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingGrade(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveGrade} disabled={!newGradeName.trim() || !newGradeScore || !newGradeMaxScore || !newGradeWeight} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar Calificación</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Deck Modal */}
      <AnimatePresence>
        {isAddingDeck && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-semibold">Nuevo Mazo</h3>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título del mazo</label>
                <input type="text" value={newDeckTitle} onChange={e => setNewDeckTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Fórmulas de Integrales" autoFocus />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingDeck(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveDeck} disabled={!newDeckTitle.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Card Modal */}
      <AnimatePresence>
        {isAddingCard && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 dark:border-white/5"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Nueva Tarjeta</h3>
                <button onClick={() => setIsAddingCard(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anverso (Pregunta / Concepto)</label>
                  <textarea
                    value={newCardFront}
                    onChange={e => setNewCardFront(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: ¿Qué es el modelo OSI y cuántas capas tiene?"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reverso (Respuesta / Definición)</label>
                  <textarea
                    value={newCardBack}
                    onChange={e => setNewCardBack(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Es un marco conceptual de 7 capas que describe las funciones de red..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingCard(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveFlashcard} disabled={!newCardFront.trim() || !newCardBack.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">Guardar Tarjeta</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
