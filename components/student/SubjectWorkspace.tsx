import React, { useState, useEffect } from 'react';
import { Subject, Unit, Exam, Topic, Resource, StudySession, Grade, GradeCategory, Attendance, Deck, Flashcard } from './types';
import { Folder, Note, Todo, Project } from '../../types';
import NotesSection from '../NotesSection';
import { motion, AnimatePresence } from 'framer-motion';
import { syncableCreate, syncableUpdate, syncableDelete, getAll, ensureDB } from '../../db';
import { supabase } from '../../supabaseClient';
import { calculateGradeSummary } from './utils/gradeCalculator';
import { 
  ChevronLeft, ChevronRight, Plus, X, FileText, CheckSquare, Calendar, 
  Paperclip, Award, BookOpen, Clock, Trash2, CheckCircle2, Circle, Sparkles,
  Link, Play, Presentation, File, Search, FolderKanban, Check, MoreHorizontal,
  ArrowRight, ExternalLink, Layers, AlertCircle, Percent, Target
} from 'lucide-react';

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
  onAddNote = async (_folderId?: number | null, _projectId?: number, _subjectId?: string) => null,
  onUpdateNote = async () => {},
  onDeleteNote = async () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'notes' | 'tasks' | 'exams' | 'resources' | 'projects' | 'study' | 'grades' | 'flashcards'>('overview');
  
  // Mobile Navigation & View States
  const [mobileSubView, setMobileSubView] = useState<'main' | 'units' | 'notes' | 'tasks' | 'exams' | 'resources' | 'projects' | 'grades' | 'study' | 'flashcards'>('main');
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Global Tasks (Todos) State
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskUnitId, setNewTaskUnitId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [showTaskMoreOptions, setShowTaskMoreOptions] = useState(false);

  // Global Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
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
  const [newExamTime, setNewExamTime] = useState('');
  const [newExamLocation, setNewExamLocation] = useState('');
  const [newExamUnitId, setNewExamUnitId] = useState('');
  const [newExamType, setNewExamType] = useState<Exam['type']>('midterm');
  const [newExamNotes, setNewExamNotes] = useState('');
  
  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<'link' | 'pdf' | 'video' | 'document' | 'other'>('link');
  const [newResourceUnitId, setNewResourceUnitId] = useState('');
  const [newResourceDesc, setNewResourceDesc] = useState('');
  
  // Study State
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [isStudying, setIsStudying] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [studyObjective, setStudyObjective] = useState('');

  // Grades & Categories & Attendance State
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  
  // Category Modal
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWeight, setNewCategoryWeight] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Grade/Evaluation Form Modal
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeCategoryId, setNewGradeCategoryId] = useState('');
  const [newGradeExamId, setNewGradeExamId] = useState('');
  const [newGradeUnitId, setNewGradeUnitId] = useState('');
  const [newGradeScore, setNewGradeScore] = useState('');
  const [newGradeMaxScore, setNewGradeMaxScore] = useState(subject.grade_scale === 100 ? '100' : '10');
  const [newGradeWeight, setNewGradeWeight] = useState('');
  const [newGradeDate, setNewGradeDate] = useState('');
  const [newGradeNotes, setNewGradeNotes] = useState('');
  const [showGradeMoreOptions, setShowGradeMoreOptions] = useState(false);

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
        allCategories,
        allGrades,
        allAttendances,
        allDecks,
        allCards,
        allTodos,
        allProjects
      ] = await Promise.all([
        getAll<Unit>('student_units'),
        getAll<Exam>('student_exams'),
        getAll<Resource>('student_resources'),
        getAll<StudySession>('student_study_sessions'),
        getAll<GradeCategory>('student_grade_categories'),
        getAll<Grade>('student_grades'),
        getAll<Attendance>('student_attendance'),
        getAll<Deck>('student_decks'),
        getAll<Flashcard>('student_flashcards'),
        getAll<Todo>('todos'),
        getAll<Project>('projects')
      ]);

      setUnits(allUnits.filter(u => u.subject_id === subject.id));
      setExams(allExams.filter(e => e.subject_id === subject.id));
      setResources(allResources.filter(r => r.subject_id === subject.id));
      setStudySessions(allSessions.filter(s => s.subject_id === subject.id));
      setCategories(allCategories.filter(c => c.subject_id === subject.id));
      setGrades(allGrades.filter(g => g.subject_id === subject.id));
      setAttendances(allAttendances.filter(a => a.subject_id === subject.id));
      setDecks(allDecks.filter(d => d.subject_id === subject.id));
      setFlashcards(allCards);
      setTasks(allTodos.filter(t => t.subject_id === subject.id));
      setProjects(allProjects.filter(p => p.subject_id === subject.id));

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
    showToast('Unidad creada');

    try {
      await syncableCreate('student_units', newUnit);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteUnit = async (unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId));
    if (activeUnit?.id === unitId) setActiveUnit(null);
    try {
      await syncableDelete('student_units', unitId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleToggleUnitStatus = async (unitToToggle: Unit, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus: 'not_started' | 'in_progress' | 'completed' = 
      !unitToToggle.status || unitToToggle.status === 'not_started' ? 'in_progress' :
      unitToToggle.status === 'in_progress' ? 'completed' : 'not_started';
      
    const updated = { ...unitToToggle, status: nextStatus };
    setUnits(prev => prev.map(u => u.id === unitToToggle.id ? updated : u));
    if (activeUnit?.id === unitToToggle.id) {
      setActiveUnit(updated);
    }
    showToast('Estado de unidad actualizado');
    try {
      await syncableUpdate('student_units', updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Task Handlers
  const handleToggleTask = async (task: Todo) => {
    const updated = { ...task, completed: !task.completed };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await syncableUpdate('todos', updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async () => {
    if (!newTaskText.trim()) return;
    const userId = await getUserId();
    const newTodo: Todo = {
      id: Date.now(),
      user_id: userId,
      text: newTaskText.trim(),
      completed: false,
      priority: newTaskPriority,
      due_date: newTaskDueDate || null,
      subject_id: subject.id,
      unit_id: newTaskUnitId || activeUnit?.id || undefined,
      academic_type: 'homework',
      notes: newTaskNotes.trim() || undefined,
      created_at: new Date().toISOString()
    };

    setTasks(prev => [newTodo, ...prev]);
    setIsAddingTask(false);
    setNewTaskText('');
    setNewTaskDueDate('');
    setNewTaskUnitId('');
    setNewTaskPriority('medium');
    setNewTaskNotes('');
    setShowTaskMoreOptions(false);
    showToast('Tarea creada');

    try {
      await syncableCreate('todos', newTodo);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteTask = async (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await syncableDelete('todos', taskId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  // Project Handlers
  const handleSaveProject = async () => {
    if (!newProjectName.trim()) return;
    const userId = await getUserId();
    const newProj: Project = {
      id: Date.now(),
      user_id: userId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || null,
      color: subject.color,
      emoji: '📚',
      subject_id: subject.id,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    setProjects(prev => [newProj, ...prev]);
    setIsAddingProject(false);
    setNewProjectName('');
    setNewProjectDesc('');
    showToast('Proyecto académico creado');

    try {
      await syncableCreate('projects', newProj);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteProject = async (projectId: number) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    try {
      await syncableDelete('projects', projectId);
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
      unit_id: newExamUnitId || activeUnit?.id || undefined,
      title: newExamTitle.trim(),
      type: newExamType || 'midterm',
      date: newExamDate,
      time: newExamTime || undefined,
      location: newExamLocation || undefined,
      notes: newExamNotes || undefined,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setExams(prev => [newExam, ...prev]);
    setIsAddingExam(false);
    setNewExamTitle('');
    setNewExamDate('');
    setNewExamTime('');
    setNewExamLocation('');
    setNewExamUnitId('');
    setNewExamType('midterm');
    setNewExamNotes('');
    showToast('Examen guardado');

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
      unit_id: newResourceUnitId || activeUnit?.id || undefined,
      title: newResourceTitle.trim(),
      url: newResourceUrl.trim() || undefined,
      type: newResourceType,
      description: newResourceDesc.trim() || undefined,
      created_at: new Date().toISOString()
    };

    setResources(prev => [newResource, ...prev]);
    setIsAddingResource(false);
    setNewResourceTitle('');
    setNewResourceUrl('');
    setNewResourceType('link');
    setNewResourceUnitId('');
    setNewResourceDesc('');
    showToast('Recurso guardado');

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

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryWeight) return;
    setCategoryError(null);

    const weightVal = parseFloat(newCategoryWeight);
    if (isNaN(weightVal) || weightVal <= 0) {
      setCategoryError('El peso debe ser un número positivo.');
      return;
    }

    const currentTotalWeight = categories.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (currentTotalWeight + weightVal > 100) {
      setCategoryError('El peso total de las categorías no puede superar el 100%.');
      return;
    }

    const userId = await getUserId();
    const newCategory: GradeCategory = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      name: newCategoryName.trim(),
      weight: weightVal,
      created_at: new Date().toISOString()
    };

    setCategories(prev => [...prev, newCategory]);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewCategoryWeight('');
    showToast('Categoría guardada');

    try {
      await syncableCreate('student_grade_categories', newCategory);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    try {
      await syncableDelete('student_grade_categories', categoryId);
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleSaveGrade = async () => {
    if (!newGradeName.trim()) return;

    const userId = await getUserId();
    const scoreVal = newGradeScore.trim() !== '' ? parseFloat(newGradeScore) : null;
    const maxScoreVal = parseFloat(newGradeMaxScore) || (subject.grade_scale || 10);
    const weightVal = newGradeWeight ? parseFloat(newGradeWeight) : 0;
    const isPending = scoreVal === null || isNaN(scoreVal);

    const newGrade: Grade = {
      id: generateUUID(),
      user_id: userId,
      subject_id: subject.id,
      category_id: newGradeCategoryId || undefined,
      exam_id: newGradeExamId || undefined,
      unit_id: newGradeUnitId || undefined,
      name: newGradeName.trim(),
      score: isPending ? null : scoreVal,
      max_score: maxScoreVal,
      weight: weightVal,
      date: newGradeDate || undefined,
      notes: newGradeNotes.trim() || undefined,
      status: isPending ? 'pending' : 'completed',
      created_at: new Date().toISOString()
    };
    
    setGrades(prev => [newGrade, ...prev]);
    setIsAddingGrade(false);
    setNewGradeName('');
    setNewGradeCategoryId('');
    setNewGradeExamId('');
    setNewGradeUnitId('');
    setNewGradeScore('');
    setNewGradeMaxScore(subject.grade_scale === 100 ? '100' : '10');
    setNewGradeWeight('');
    setNewGradeDate('');
    setNewGradeNotes('');
    setShowGradeMoreOptions(false);
    showToast(isPending ? 'Evaluación pendiente guardada' : 'Calificación guardada');

    try {
      await syncableCreate('student_grades', newGrade);

      if (newGradeExamId) {
        const linkedExam = exams.find(e => e.id === newGradeExamId);
        if (linkedExam) {
          const updatedExam: Exam = {
            ...linkedExam,
            grade: isPending ? undefined : scoreVal!,
            status: isPending ? 'pending' : 'completed'
          };
          setExams(prev => prev.map(e => e.id === linkedExam.id ? updatedExam : e));
          await syncableUpdate('student_exams', updatedExam);
        }
      }
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
    <div className="w-full flex flex-col bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 font-sans">
      
      {/* DESKTOP HEADER */}
      <header className="hidden md:flex px-8 py-6 border-b border-gray-100 dark:border-white/5 items-center justify-between flex-shrink-0 gap-4" style={{ borderBottomColor: `${subject.color}30` }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
            ← Volver
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              {subject.emoji ? <span className="text-xl">{subject.emoji}</span> : null}
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{subject.name}</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subject.professor || 'Sin profesor asignado'}</p>
          </div>
        </div>
      </header>

      {/* DESKTOP TABS */}
      <div className="hidden md:flex px-8 pt-4 border-b border-gray-100 dark:border-white/5 gap-6 overflow-x-auto shrink-0 bg-white dark:bg-[#111]">
        {(['overview', 'units', 'notes', 'tasks', 'exams', 'resources', 'study', 'grades', 'flashcards'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap cursor-pointer ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {tab === 'notes' ? 'Notas' : tab === 'study' ? 'Sesiones' : tab === 'resources' ? 'Recursos' : tab === 'grades' ? 'Calificaciones' : tab === 'flashcards' ? 'Flashcards' : tab === 'overview' ? 'Resumen' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <motion.div layoutId="subject-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-black dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* MOBILE HEADER */}
      <div className="block md:hidden border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#111] px-4 pt-3.5 pb-3 shrink-0">
        {activeUnit ? (
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveUnit(null)}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← {subject.name}
              </button>
              <button
                type="button"
                onClick={(e) => handleToggleUnitStatus(activeUnit, e)}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
              >
                {activeUnit.status === 'completed' ? 'Completada' : activeUnit.status === 'in_progress' ? 'En progreso' : 'Sin iniciar'}
              </button>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">
              Unidad {activeUnit.order_index + 1}: {activeUnit.name}
            </h2>
            {activeUnit.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{activeUnit.description}</p>
            )}
          </div>
        ) : mobileSubView === 'main' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={onBack}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Materias
              </button>
              <button
                onClick={() => setShowMobileActionSheet(true)}
                className="px-3 py-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs cursor-pointer"
              >
                + Añadir
              </button>
            </div>
            <div className="flex items-center gap-2">
              {subject.emoji ? <span className="text-lg">{subject.emoji}</span> : null}
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{subject.name}</h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{subject.professor || 'Sin profesor'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobileSubView('main')}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← {subject.name}
              </button>
              <button
                onClick={() => {
                  if (mobileSubView === 'notes') onAddNote(null, undefined, subject.id);
                  else if (mobileSubView === 'exams') setIsAddingExam(true);
                  else if (mobileSubView === 'resources') setIsAddingResource(true);
                  else if (mobileSubView === 'flashcards') setIsAddingDeck(true);
                  else if (mobileSubView === 'study') setIsStudying(true);
                  else if (mobileSubView === 'grades') setIsAddingGrade(true);
                }}
                className="px-3 py-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs cursor-pointer"
              >
                + Añadir
              </button>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1.5 capitalize">
              {mobileSubView === 'notes' ? 'Apuntes' : 
               mobileSubView === 'tasks' ? 'Tareas' : 
               mobileSubView === 'exams' ? 'Exámenes' : 
               mobileSubView === 'resources' ? 'Recursos' : 
               mobileSubView === 'grades' ? 'Calificaciones' : 
               mobileSubView === 'flashcards' ? 'Flashcards' : 
               mobileSubView === 'study' ? 'Sesiones de estudio' : mobileSubView}
            </h2>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto h-full">
          {activeUnit ? (
            <div className="space-y-6">
              {/* UNIT HEADER CARD */}
              <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveUnit(null)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Volver a {subject.name}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleUnitStatus(activeUnit, e)}
                      className="px-3 py-1 rounded-full text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white cursor-pointer"
                    >
                      {activeUnit.status === 'completed' ? '✓ Completada' : activeUnit.status === 'in_progress' ? '⏳ En progreso' : '⭕ Sin iniciar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(activeUnit.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Eliminar unidad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Unidad {units.findIndex(u => u.id === activeUnit.id) + 1}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {activeUnit.name}
                  </h2>
                  {activeUnit.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activeUnit.description}</p>
                  )}
                </div>

                {/* QUICK ACTION BUTTONS */}
                <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => { setNewTaskUnitId(activeUnit.id); setIsAddingTask(true); }}
                    className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Tarea</span>
                  </button>
                  <button
                    onClick={() => { setNewExamUnitId(activeUnit.id); setIsAddingExam(true); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Examen</span>
                  </button>
                  <button
                    onClick={() => onAddNote(null, undefined, subject.id)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Apunte</span>
                  </button>
                  <button
                    onClick={() => { setNewResourceUnitId(activeUnit.id); setIsAddingResource(true); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Recurso</span>
                  </button>
                </div>
              </div>

              {/* UNIT CONTENT SECTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TAREAS DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Tareas ({tasks.filter(t => t.unit_id === activeUnit.id).length})
                    </h3>
                    <button
                      onClick={() => { setNewTaskUnitId(activeUnit.id); setIsAddingTask(true); }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Tarea
                    </button>
                  </div>
                  {tasks.filter(t => t.unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No hay tareas en esta unidad.</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.filter(t => t.unit_id === activeUnit.id).map(task => (
                        <div key={task.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between gap-2 border border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button onClick={() => handleToggleTask(task)} className="cursor-pointer shrink-0">
                              {task.completed ? <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> : <Circle className="w-4 h-4 text-gray-400" />}
                            </button>
                            <span className={`text-xs font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {task.text}
                            </span>
                          </div>
                          {task.due_date && (
                            <span className="text-[10px] font-mono text-gray-400 shrink-0">{task.due_date}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* EXÁMENES DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Exámenes ({exams.filter(e => e.unit_id === activeUnit.id).length})
                    </h3>
                    <button
                      onClick={() => { setNewExamUnitId(activeUnit.id); setIsAddingExam(true); }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Examen
                    </button>
                  </div>
                  {exams.filter(e => e.unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No hay exámenes en esta unidad.</p>
                  ) : (
                    <div className="space-y-2">
                      {exams.filter(e => e.unit_id === activeUnit.id).map(exam => (
                        <div key={exam.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between gap-2 border border-gray-100 dark:border-white/5">
                          <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white block">{exam.title}</span>
                            <span className="text-[10px] text-gray-400">{exam.date} {exam.time ? `• ${exam.time}` : ''}</span>
                          </div>
                          <button onClick={() => handleDeleteExam(exam.id)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* APUNTES DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Apuntes ({notes.filter(n => (n as any).unit_id === activeUnit.id).length})
                    </h3>
                    <button
                      onClick={() => onAddNote(null, undefined, subject.id)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Apunte
                    </button>
                  </div>
                  {notes.filter(n => (n as any).unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No hay apuntes en esta unidad.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.filter(n => (n as any).unit_id === activeUnit.id).map(note => (
                        <div key={note.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-white/5">
                          <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{note.title || 'Sin título'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RECURSOS DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Recursos ({resources.filter(r => r.unit_id === activeUnit.id).length})
                    </h3>
                    <button
                      onClick={() => { setNewResourceUnitId(activeUnit.id); setIsAddingResource(true); }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Recurso
                    </button>
                  </div>
                  {resources.filter(r => r.unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No hay recursos en esta unidad.</p>
                  ) : (
                    <div className="space-y-2">
                      {resources.filter(r => r.unit_id === activeUnit.id).map(res => (
                        <div key={res.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-white/5">
                          <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white block">{res.title}</span>
                            {res.url && (
                              <a href={res.url} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:underline truncate block max-w-[200px]">
                                {res.url}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Upcoming Item Card - Compact Height & B&W */}
              {exams.some(e => e.status !== 'completed') || tasks.some(t => !t.completed) ? (
                <div className="bg-white dark:bg-[#151515] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                      Próximo:
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {exams.find(e => e.status !== 'completed')?.title || tasks.find(t => !t.completed)?.text}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 shrink-0">
                    {exams.find(e => e.status !== 'completed')?.date || tasks.find(t => !t.completed)?.due_date || 'Sin fecha'}
                  </span>
                </div>
              ) : null}

              {/* UNIDADES SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Unidades del temario
                  </h3>
                  <button
                    onClick={() => setIsAddingUnit(true)}
                    className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                  >
                    + Añadir
                  </button>
                </div>

                {units.length === 0 ? (
                  <div className="bg-white dark:bg-[#151515] p-6 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">No hay unidades agregadas a esta materia todavía.</p>
                    <button
                      onClick={() => setIsAddingUnit(true)}
                      className="mt-3 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1"
                    >
                      + Crear primera unidad
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {units.map((unit, index) => {
                      const unitTaskCount = tasks.filter(t => t.unit_id === unit.id && !t.completed).length;
                      const unitNoteCount = notes.filter(n => (n as any).unit_id === unit.id).length;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => setActiveUnit(unit)}
                          className="bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-200/80 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-600 transition-all shadow-2xs cursor-pointer flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                Unidad {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleToggleUnitStatus(unit, e)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                              >
                                {unit.status === 'completed' ? 'Completada' : unit.status === 'in_progress' ? 'En progreso' : 'Sin iniciar'}
                              </button>
                            </div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                              {unit.name}
                            </h4>
                            {unit.description && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{unit.description}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 font-mono">
                            <span className="flex items-center gap-2">
                              {unitTaskCount > 0 && <span>{unitTaskCount} tareas</span>}
                              {unitNoteCount > 0 && <span>{unitNoteCount} apuntes</span>}
                              {unitTaskCount === 0 && unitNoteCount === 0 && <span>Sin pendientes</span>}
                            </span>
                            <span className="text-gray-900 dark:text-white font-sans font-bold group-hover:underline">Abrir →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CONTENIDO QUICK HUB */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Contenido académico
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => { setActiveTab('tasks'); setMobileSubView('tasks'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tareas</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {tasks.filter(t => !t.completed).length}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Tareas</span>
                      <span className="text-[10px] text-gray-400">
                        {tasks.filter(t => !t.completed).length === 1 ? '1 pendiente' : `${tasks.filter(t => !t.completed).length} pendientes`}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab('exams'); setMobileSubView('exams'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Exámenes</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {exams.filter(e => e.status !== 'completed').length}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Exámenes</span>
                      <span className="text-[10px] text-gray-400">
                        {exams.filter(e => e.status !== 'completed').length === 1 ? '1 próximo' : `${exams.filter(e => e.status !== 'completed').length} próximos`}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab('notes'); setMobileSubView('notes'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Apuntes</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {notes.length}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Apuntes</span>
                      <span className="text-[10px] text-gray-400">{notes.length} notas globales</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab('resources'); setMobileSubView('resources'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recursos</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {resources.length}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Recursos</span>
                      <span className="text-[10px] text-gray-400">{resources.length} archivos o links</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab('projects'); setMobileSubView('projects'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Proyectos</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {projects.length}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Proyectos</span>
                      <span className="text-[10px] text-gray-400">{projects.length} vinculados</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab('grades'); setMobileSubView('grades'); }}
                    className="p-3.5 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notas</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {grades.length > 0 ? currentGrade.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Notas</span>
                      <span className="text-[10px] text-gray-400">Promedio actual</span>
                    </div>
                  </button>
                </div>
              </div>
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
                <h3 className="text-lg font-medium">Unidades ({units.length})</h3>
                <button onClick={() => setIsAddingUnit(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Nueva Unidad
                </button>
              </div>
              
              {units.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>No has creado unidades todavía.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {units.map((unit, i) => (
                    <div
                      key={unit.id}
                      onClick={() => setActiveUnit(unit)}
                      className="bg-white dark:bg-[#151515] py-2.5 px-3.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 shadow-2xs flex items-center justify-between group cursor-pointer hover:border-gray-400 dark:hover:border-zinc-600 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white flex items-center justify-center text-xs font-bold shrink-0 border border-gray-200 dark:border-white/10">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate block">{unit.name}</span>
                          {unit.description && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{unit.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleUnitStatus(unit, e)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-gray-200 dark:border-white/10 ${
                            unit.status === 'completed' ? 'bg-gray-100 text-gray-900 dark:bg-white/15 dark:text-white' :
                            unit.status === 'in_progress' ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white' :
                            'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-300'
                          }`}
                        >
                          {unit.status === 'completed' ? <CheckCircle2 className="w-3 h-3 text-gray-900 dark:text-white" /> : <Circle className="w-3 h-3 text-gray-400" />}
                          <span>{unit.status === 'completed' ? 'Completada' : unit.status === 'in_progress' ? 'En progreso' : 'Sin iniciar'}</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                          title="Eliminar unidad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tareas Académicas</h3>
                  <p className="text-xs text-gray-500">Filtradas por esta materia ({subject.name})</p>
                </div>
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva tarea</span>
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                  <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay tareas asociadas a esta materia.</p>
                  <p className="text-xs text-gray-400 mt-1">Crea una tarea desde aquí o asígnala desde el módulo general de Tasks.</p>
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear tarea</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* PENDIENTES */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                      Pendientes ({tasks.filter(t => !t.completed).length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.filter(t => !t.completed).map(task => {
                        const taskUnit = units.find(u => u.id === task.unit_id);
                        return (
                          <div
                            key={task.id}
                            className="bg-white dark:bg-[#151515] p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleTask(task)}
                                className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-900 dark:hover:border-white transition-colors"
                              >
                                {task.completed && <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />}
                              </button>
                              <div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                  {task.text}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {taskUnit && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-md border border-gray-200 dark:border-white/10">
                                      {taskUnit.name}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {task.due_date}
                                    </span>
                                  )}
                                  {task.priority && (
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white`}>
                                      {task.priority}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COMPLETADAS */}
                  {tasks.some(t => t.completed) && (
                    <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                        Completadas ({tasks.filter(t => t.completed).length})
                      </h4>
                      <div className="space-y-2 opacity-60">
                        {tasks.filter(t => t.completed).map(task => (
                          <div
                            key={task.id}
                            className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleToggleTask(task)}>
                                <CheckCircle2 className="w-5 h-5 text-gray-900 dark:text-white" />
                              </button>
                              <span className="text-sm font-medium text-gray-500 line-through">
                                {task.text}
                              </span>
                            </div>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Proyectos Académicos</h3>
                  <p className="text-xs text-gray-500">Proyectos de la materia vinc. con el sistema global</p>
                </div>
                <button
                  onClick={() => setIsAddingProject(true)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo proyecto</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                  <FolderKanban className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay proyectos asignados a esta materia.</p>
                  <p className="text-xs text-gray-400 mt-1">Crea trabajos prácticos o investigaciones en grupo.</p>
                  <button
                    onClick={() => setIsAddingProject(true)}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear proyecto</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map(proj => (
                    <div
                      key={proj.id}
                      className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{proj.emoji || '📚'}</span>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="font-bold text-base text-gray-900 dark:text-white">{proj.name}</h4>
                        {proj.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{proj.description}</p>
                        )}
                      </div>
                      <div className="pt-4 mt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                          {proj.status || 'Activo'}
                        </span>
                        <span className="text-xs text-gray-400">Ver detalles →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Exámenes y Evaluaciones</h3>
                <button onClick={() => setIsAddingExam(true)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold shadow-2xs hover:opacity-90 transition-opacity">
                  + Nuevo Examen
                </button>
              </div>
              
              {exams.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>No hay exámenes programados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map(exam => {
                    const examUnit = units.find(u => u.id === exam.unit_id);
                    return (
                      <div key={exam.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{exam.title}</h4>
                            {examUnit && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-md">
                                {examUnit.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="capitalize">{exam.type}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {exam.date} {exam.time && `a las ${exam.time}`}
                            </span>
                            {exam.location && (
                              <>
                                <span>•</span>
                                <span>{exam.location}</span>
                              </>
                            )}
                          </div>
                          {exam.notes && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{exam.notes}</p>
                          )}
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
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer border border-gray-200 dark:border-white/10 ${exam.status === 'completed' ? 'bg-gray-100 text-gray-900 dark:bg-white/20 dark:text-white' : 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}
                          >
                            {exam.status === 'completed' ? '✓ Completado' : '⏳ Pendiente'}
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                            title="Eliminar examen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Recursos y Documentos</h3>
                <button onClick={() => setIsAddingResource(true)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold shadow-2xs hover:opacity-90 transition-opacity">
                  + Agregar Recurso
                </button>
              </div>
              
              {resources.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <p>Guarda enlaces, PDFs, videos y materiales de estudio para esta materia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {resources.map(resource => {
                    const resUnit = units.find(u => u.id === resource.unit_id);
                    return (
                      <div key={resource.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xl">
                              {resource.type === 'link' ? '🔗' : resource.type === 'pdf' ? '📄' : resource.type === 'video' ? '▶️' : '📁'}
                            </div>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                              title="Eliminar recurso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{resource.title}</h4>
                          {resUnit && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded mt-1 inline-block">
                              {resUnit.name}
                            </span>
                          )}
                          {resource.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{resource.description}</p>
                          )}
                          {resource.url && (
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-900 dark:text-white font-semibold hover:underline truncate block mt-2">
                              {resource.url} ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'study' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Sesiones de Estudio</h3>
                {!isStudying && (
                  <button onClick={() => setIsStudying(true)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold shadow-2xs hover:opacity-90 transition-opacity">
                    Iniciar Temporizador
                  </button>
                )}
              </div>
              
              {isStudying && (
                <div className="bg-white dark:bg-[#151515] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-2xs text-center">
                  <div className="text-6xl font-light mb-6 tabular-nums">{formatTime(studySeconds)}</div>
                  <div className="max-w-md mx-auto mb-8">
                    <input 
                      type="text" 
                      value={studyObjective} 
                      onChange={e => setStudyObjective(e.target.value)} 
                      placeholder="¿Qué estás estudiando ahora? (Opcional)" 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center text-sm"
                    />
                  </div>
                  <button onClick={handleFinishStudy} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs hover:opacity-90 transition-opacity">
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
                        <div className="font-mono text-xl font-light text-gray-900 dark:text-white">{session.duration_minutes}m</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'grades' && (() => {
            const summary = calculateGradeSummary(subject, categories, grades);
            const usedWeight = categories.reduce((sum, c) => sum + (c.weight || 0), 0);

            return (
              <div className="space-y-6">
                {/* Grade Summary & Target Projection Banner */}
                <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                        Promedio Actual del Curso
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                          {summary.currentAverage !== null ? summary.currentAverage : 'S/N'}
                        </span>
                        <span className="text-sm text-gray-400 font-medium">/ {summary.gradeScale}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        {summary.evaluatedPercentage}% Evaluado
                      </div>
                      <button
                        onClick={() => setIsAddingCategory(true)}
                        className="px-3.5 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-white rounded-2xl text-xs font-semibold transition-colors"
                      >
                        + Categoría
                      </button>
                      <button
                        onClick={() => setIsAddingGrade(true)}
                        className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-bold transition-opacity hover:opacity-90 shadow-2xs"
                      >
                        + Evaluación
                      </button>
                    </div>
                  </div>

                  {/* Projection Feedback */}
                  {summary.targetProjection && (
                    <div className="p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10">
                      <Target className="w-4 h-4 shrink-0 mt-0.5 text-gray-900 dark:text-white" />
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-[10px] mb-0.5">Proyección para tu Meta:</span>
                        <p className="leading-relaxed">{summary.targetProjection.message}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Categorías de Evaluación */}
                <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Categorías y Ponderaciones</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Ponderación asignada: {usedWeight}% / 100%</p>
                    </div>
                    <button
                      onClick={() => setIsAddingCategory(true)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Nueva
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">No has creado categorías todavía (ej. Parciales 40%, Tareas 30%, Examen Final 30%).</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map(cat => {
                        const catSummary = summary.categorySummaries.find(cs => cs.category.id === cat.id);
                        return (
                          <div key={cat.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs text-gray-900 dark:text-white block">{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-medium">Peso: {cat.weight}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                                {catSummary?.average !== null && catSummary?.average !== undefined ? catSummary.average.toFixed(1) : 'S/N'}
                              </span>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Registro de Evaluaciones */}
                <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Evaluaciones Registradas</h4>
                    <button
                      onClick={() => setIsAddingGrade(true)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                      + Añadir
                    </button>
                  </div>

                  {grades.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">No hay evaluaciones registradas en esta materia.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {grades.map(grade => {
                        const cat = categories.find(c => c.id === grade.category_id);
                        const isPending = grade.score === null || grade.status === 'pending';
                        return (
                          <div key={grade.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{grade.name}</span>
                                {cat && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white border border-gray-200 dark:border-white/10 shrink-0">
                                    {cat.name} ({cat.weight}%)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                                {grade.date && <span>📅 {grade.date}</span>}
                                {grade.notes && <span className="truncate">💬 {grade.notes}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {isPending ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                  ⏳ Pendiente
                                </span>
                              ) : (
                                <div className="text-right">
                                  <span className="font-extrabold text-sm text-gray-900 dark:text-white block">
                                    {grade.score} <span className="text-xs text-gray-400 font-normal">/ {grade.max_score}</span>
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => handleDeleteGrade(grade.id)}
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Attendance Record */}
                <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Asistencia de Hoy</h4>
                    <span className="text-xs font-medium text-gray-400">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => handleRecordAttendance('present')} className="flex-1 py-2.5 bg-gray-100 text-gray-900 dark:bg-white/15 dark:text-white rounded-2xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/25 transition-colors border border-gray-200 dark:border-white/10">
                      Presente
                    </button>
                    <button onClick={() => handleRecordAttendance('absent')} className="flex-1 py-2.5 bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 rounded-2xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/10">
                      Ausente
                    </button>
                    <button onClick={() => handleRecordAttendance('excused')} className="flex-1 py-2.5 bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300 rounded-2xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors border border-gray-200 dark:border-white/10">
                      Justificado
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
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
                          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                        >
                          ▶ Iniciar Repaso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Reviewing Session Overlay / Screen */}
                  {isReviewing ? (
                    <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xs max-w-xl mx-auto text-center space-y-6">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Tarjeta {reviewIndex + 1} de {flashcards.filter(c => c.deck_id === selectedDeck.id).length}</span>
                        <button onClick={() => setIsReviewing(false)} className="hover:underline">Finalizar Repaso</button>
                      </div>

                      {/* Card Canvas with Flip Effect */}
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="min-h-[220px] p-8 rounded-2xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-gray-900 dark:hover:border-white"
                      >
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">
                          {isCardFlipped ? 'Respuesta (Reverso)' : 'Pregunta (Anverso)'}
                        </span>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {isCardFlipped
                            ? flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex]?.back
                            : flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex]?.front}
                        </p>
                        <span className="text-xs text-gray-900 dark:text-white font-medium mt-4">Toca para voltear 🔄</span>
                      </div>

                      {/* Review Buttons */}
                      {isCardFlipped && (
                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'learning')}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold"
                          >
                            Difícil / Repetir
                          </button>
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'reviewing')}
                            className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold"
                          >
                            Regular
                          </button>
                          <button
                            onClick={() => handleRateFlashcard(flashcards.filter(c => c.deck_id === selectedDeck.id)[reviewIndex].id, 'known')}
                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold"
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
                          <button onClick={() => setIsAddingCard(true)} className="mt-3 px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-xl">
                            + Añadir primera tarjeta
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {flashcards.filter(c => c.deck_id === selectedDeck.id).map(card => (
                            <div key={card.id} className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pregunta</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white border border-gray-200 dark:border-white/10">
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
                    <h3 className="text-lg font-medium">Flashcards y Repaso</h3>
                    <button onClick={() => setIsAddingDeck(true)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
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
                            className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col gap-4 group hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white flex items-center justify-center text-2xl border border-gray-200 dark:border-white/10">
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
            </>
          )}
        </div>
      </div>
      
      {/* Add Unit Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingUnit && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Unidad</h3>
                <button onClick={() => setIsAddingUnit(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nombre de la unidad</label>
                <input type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm" placeholder="Ej: Fundamentos" autoFocus />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingUnit(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveUnit} disabled={!newUnitName.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Exam Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingExam && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Programar Examen</h3>
                <button onClick={() => setIsAddingExam(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Título</label>
                  <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm" placeholder="Ej: Parcial 1" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Fecha</label>
                  <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingExam(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveExam} disabled={!newExamTitle.trim() || !newExamDate} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Resource Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingResource && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Guardar Recurso</h3>
                <button onClick={() => setIsAddingResource(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Título</label>
                  <input type="text" value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm" placeholder="Ej: Diapositivas Clase 1" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">URL / Enlace</label>
                  <input type="url" value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs" placeholder="https://" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Tipo</label>
                  <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as any)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs">
                    <option value="link">Enlace (Web)</option>
                    <option value="pdf">Documento PDF</option>
                    <option value="video">Video</option>
                    <option value="document">Documento (Word/Docs)</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingResource(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveResource} disabled={!newResourceTitle.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Deck Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingDeck && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nuevo Mazo</h3>
                <button onClick={() => setIsAddingDeck(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Título del mazo</label>
                <input type="text" value={newDeckTitle} onChange={e => setNewDeckTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm" placeholder="Ej: Fórmulas de Integrales" autoFocus />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingDeck(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveDeck} disabled={!newDeckTitle.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Card Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingCard && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Tarjeta</h3>
                <button onClick={() => setIsAddingCard(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Anverso (Pregunta / Concepto)</label>
                  <textarea
                    value={newCardFront}
                    onChange={e => setNewCardFront(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    placeholder="Ej: ¿Qué es el modelo OSI y cuántas capas tiene?"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Reverso (Respuesta / Definición)</label>
                  <textarea
                    value={newCardBack}
                    onChange={e => setNewCardBack(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    placeholder="Ej: Es un marco conceptual de 7 capas..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingCard(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveFlashcard} disabled={!newCardFront.trim() || !newCardBack.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar Tarjeta</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Tarea Académica</h3>
                <button onClick={() => setIsAddingTask(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nombre / Tarea</label>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm"
                    placeholder="Ej: Entregar reporte de laboratorio"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Fecha límite</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Prioridad</label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>

                {units.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Asociar a Unidad (Opcional)</label>
                    <select
                      value={newTaskUnitId}
                      onChange={e => setNewTaskUnitId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    >
                      <option value="">Sin unidad específica</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowTaskMoreOptions(!showTaskMoreOptions)}
                    className="text-xs font-bold text-gray-900 dark:text-white hover:underline flex items-center gap-1"
                  >
                    <span>{showTaskMoreOptions ? 'Ocultar notas' : '+ Añadir notas/instrucciones'}</span>
                  </button>
                  {showTaskMoreOptions && (
                    <textarea
                      value={newTaskNotes}
                      onChange={e => setNewTaskNotes(e.target.value)}
                      rows={2}
                      className="w-full mt-2 px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Instrucciones del profesor o detalles adicionales..."
                    />
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl">Cancelar</button>
                <button onClick={handleSaveTask} disabled={!newTaskText.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50">Guardar Tarea</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Project Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingProject && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nuevo Proyecto Académico</h3>
                <button onClick={() => setIsAddingProject(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nombre del proyecto</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm"
                    placeholder="Ej: Trabajo de Investigación Semestral"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Descripción</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={e => setNewProjectDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Objetivos, integrantes del equipo o entregables..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => setIsAddingProject(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl">Cancelar</button>
                <button onClick={handleSaveProject} disabled={!newProjectName.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50">Guardar Proyecto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Quick Action Sheet */}
      <AnimatePresence>
        {showMobileActionSheet && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Añadir a {subject.name}</h3>
                <button
                  onClick={() => setShowMobileActionSheet(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setShowMobileActionSheet(false); setIsAddingTask(true); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Tarea</span>
                  <span className="text-[10px] text-gray-500">Pendiente de clase</span>
                </button>

                <button
                  onClick={() => { setShowMobileActionSheet(false); setIsAddingExam(true); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Examen</span>
                  <span className="text-[10px] text-gray-500">Evaluación parcial/final</span>
                </button>

                <button
                  onClick={() => { setShowMobileActionSheet(false); onAddNote(null, undefined, subject.id); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Apunte</span>
                  <span className="text-[10px] text-gray-500">Nota de clase</span>
                </button>

                <button
                  onClick={() => { setShowMobileActionSheet(false); setIsAddingResource(true); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Recurso</span>
                  <span className="text-[10px] text-gray-500">Enlace o archivo</span>
                </button>

                <button
                  onClick={() => { setShowMobileActionSheet(false); setIsAddingUnit(true); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Unidad</span>
                  <span className="text-[10px] text-gray-500">Temario oficial</span>
                </button>

                <button
                  onClick={() => { setShowMobileActionSheet(false); setIsAddingProject(true); }}
                  className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">Proyecto</span>
                  <span className="text-[10px] text-gray-500">Trabajo individual o grupal</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Category Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Categoría de Evaluación</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Disponible: {100 - categories.reduce((sum, c) => sum + (c.weight || 0), 0)}%
                  </p>
                </div>
                <button onClick={() => { setIsAddingCategory(false); setCategoryError(null); }} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {categoryError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nombre (ej. Parciales, Tareas)</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Ej: Exámenes Parciales"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Ponderación / Peso (%)</label>
                  <input
                    type="number"
                    value={newCategoryWeight}
                    onChange={e => { setNewCategoryWeight(e.target.value); setCategoryError(null); }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Ej: 30"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-2 bg-gray-50 dark:bg-[#111]/50">
                <button onClick={() => { setIsAddingCategory(false); setCategoryError(null); }} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveCategory} disabled={!newCategoryName.trim() || !newCategoryWeight} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Grade/Evaluation Modal / Bottom Sheet */}
      <AnimatePresence>
        {isAddingGrade && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10 max-h-[90vh] flex flex-col"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nueva Evaluación / Calificación</h3>
                <button onClick={() => setIsAddingGrade(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Nombre de la evaluación *</label>
                  <input
                    type="text"
                    value={newGradeName}
                    onChange={e => setNewGradeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Ej: Parcial 1"
                    autoFocus
                  />
                </div>

                {categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Categoría</label>
                    <select
                      value={newGradeCategoryId}
                      onChange={e => setNewGradeCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    >
                      <option value="">Sin categoría específica</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Calificación Obtenida</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newGradeScore}
                      onChange={e => setNewGradeScore(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Dejar vacío si es pendiente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Puntaje Máximo</label>
                    <input
                      type="number"
                      value={newGradeMaxScore}
                      onChange={e => setNewGradeMaxScore(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="10 o 100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGradeMoreOptions(!showGradeMoreOptions)}
                  className="text-xs text-gray-900 dark:text-white font-bold hover:underline block pt-1"
                >
                  {showGradeMoreOptions ? '- Menos opciones' : '+ Más opciones (Examen, Fecha, Unidad)'}
                </button>

                {showGradeMoreOptions && (
                  <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                    {exams.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Vincular a Examen</label>
                        <select
                          value={newGradeExamId}
                          onChange={e => setNewGradeExamId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        >
                          <option value="">Sin vinculación a examen</option>
                          {exams.map(e => (
                            <option key={e.id} value={e.id}>{e.title} ({e.date || 'Sin fecha'})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {units.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Unidad del Temario</label>
                        <select
                          value={newGradeUnitId}
                          onChange={e => setNewGradeUnitId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        >
                          <option value="">Sin unidad específica</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Fecha de la Evaluación</label>
                      <input
                        type="date"
                        value={newGradeDate}
                        onChange={e => setNewGradeDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Notas / Observaciones</label>
                      <input
                        type="text"
                        value={newGradeNotes}
                        onChange={e => setNewGradeNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        placeholder="Ej: Incluyó bonus de asistencia"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-2 bg-gray-50 dark:bg-[#111]/50 shrink-0">
                <button onClick={() => setIsAddingGrade(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveGrade} disabled={!newGradeName.trim()} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[100] bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
