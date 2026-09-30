import React, { useState, useEffect } from 'react';
import { Subject, Unit, Exam, Topic, Resource, StudySession, Grade, GradeCategory, Attendance, Deck, Flashcard } from './types';
import { Folder, Note, Todo, Project } from '../../types';
import NotesSection from '../NotesSection';
import { motion, AnimatePresence } from 'framer-motion';
import { syncableCreate, syncableUpdate, syncableDelete, getAll, ensureDB } from '../../db';
import { supabase } from '../../supabaseClient';
import { calculateGradeSummary } from './utils/gradeCalculator';
import { renderSubjectIcon } from './subjectIcons';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'notes' | 'tasks' | 'exams' | 'resources' | 'projects' | 'grades'>('overview');
  const [tasksSubTab, setTasksSubTab] = useState<'tasks' | 'sessions'>('tasks');
  
  // Mobile Navigation & View States
  const [mobileSubView, setMobileSubView] = useState<'main' | 'units' | 'notes' | 'tasks' | 'exams' | 'resources' | 'projects' | 'grades'>('main');
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
  const [newExamWeight, setNewExamWeight] = useState('');
  const [newExamCategoryId, setNewExamCategoryId] = useState('');
  const [newExamNotes, setNewExamNotes] = useState('');
  const [editingScoreExamId, setEditingScoreExamId] = useState<string | null>(null);
  const [editingScoreTaskId, setEditingScoreTaskId] = useState<number | null>(null);
  const [scoreInputValue, setScoreInputValue] = useState('');
  
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
    setActiveTab('overview');
    setMobileSubView('main');
    setActiveUnit(null);
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
          const [
            { data: remoteUnits },
            { data: remoteExams },
            { data: remoteGrades },
            { data: remoteCategories },
            { data: remoteResources },
            { data: remoteSessions },
            { data: remoteAttendances }
          ] = await Promise.all([
            supabase.from('student_units').select('*').eq('subject_id', subject.id),
            supabase.from('student_exams').select('*').eq('subject_id', subject.id),
            supabase.from('student_grades').select('*').eq('subject_id', subject.id),
            supabase.from('student_grade_categories').select('*').eq('subject_id', subject.id),
            supabase.from('student_resources').select('*').eq('subject_id', subject.id),
            supabase.from('student_study_sessions').select('*').eq('subject_id', subject.id),
            supabase.from('student_attendance').select('*').eq('subject_id', subject.id),
          ]);

          if (remoteUnits) setUnits(remoteUnits);
          if (remoteExams) setExams(remoteExams);
          if (remoteGrades) setGrades(remoteGrades);
          if (remoteCategories) setCategories(remoteCategories);
          if (remoteResources) setResources(remoteResources);
          if (remoteSessions) setStudySessions(remoteSessions);
          if (remoteAttendances) setAttendances(remoteAttendances);
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
    const isNowCompleted = !task.completed;
    const updated = { ...task, completed: isNowCompleted };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    showToast(isNowCompleted ? 'Tarea completada' : 'Tarea pendiente');
    try {
      await syncableUpdate('todos', updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskGrade = async (task: Todo, score: number) => {
    const existingGrade = grades.find(g => g.name === task.text && g.subject_id === subject.id);
    const userId = await getUserId();
    if (existingGrade) {
      const updatedGrade: Grade = {
        ...existingGrade,
        score: score,
        status: 'completed'
      };
      setGrades(prev => prev.map(g => g.id === existingGrade.id ? updatedGrade : g));
      try {
        await syncableUpdate('student_grades', updatedGrade);
      } catch (err) {
        console.error(err);
      }
    } else {
      const newGrade: Grade = {
        id: generateUUID(),
        user_id: userId,
        subject_id: subject.id,
        unit_id: task.unit_id || undefined,
        name: task.text,
        score: score,
        max_score: subject.grade_scale || 10,
        weight: 0,
        date: task.due_date || new Date().toISOString().split('T')[0],
        status: 'completed',
        created_at: new Date().toISOString()
      };
      setGrades(prev => [newGrade, ...prev]);
      try {
        await syncableCreate('student_grades', newGrade);
      } catch (err) {
        console.error(err);
      }
    }
    setEditingScoreTaskId(null);
    setScoreInputValue('');
    showToast(`Nota de tarea guardada: ${score}`);
    loadData();
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
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await syncableDelete('todos', taskId);
      if (taskToDelete) {
        const gradeToDelete = grades.find(g => g.name === taskToDelete.text && g.subject_id === subject.id);
        if (gradeToDelete) {
          setGrades(prev => prev.filter(g => g.id !== gradeToDelete.id));
          await syncableDelete('student_grades', gradeToDelete.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
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
  };

  const handleSaveExam = async () => {
    if (!newExamTitle.trim() || !newExamDate) return;
    const userId = await getUserId();
    const weightNum = newExamWeight ? parseFloat(newExamWeight) : undefined;
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
      weight: weightNum,
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
    setNewExamWeight('');
    setNewExamCategoryId('');
    setNewExamNotes('');
    showToast('Examen programado');

    try {
      await syncableCreate('student_exams', newExam);

      // Create linked Todo in main todos table for complete integration
      const examTodo: Todo = {
        id: Date.now(),
        user_id: userId,
        text: `[Examen] ${newExam.title}`,
        completed: false,
        priority: 'high',
        due_date: newExam.date,
        start_time: newExam.time || undefined,
        subject_id: subject.id,
        unit_id: newExam.unit_id,
        academic_type: 'exam',
        notes: newExam.notes ? `Examen de ${subject.name}\n${newExam.notes}` : `Examen de ${subject.name}`,
        created_at: new Date().toISOString()
      };
      await syncableCreate('todos', examTodo);

      // If category or weight specified, create pending grade entry
      if (newExamCategoryId || weightNum) {
        const pendingGrade: Grade = {
          id: generateUUID(),
          user_id: userId,
          subject_id: subject.id,
          category_id: newExamCategoryId || undefined,
          exam_id: newExam.id,
          unit_id: newExam.unit_id,
          name: newExam.title,
          score: null,
          max_score: subject.grade_scale || 10,
          weight: weightNum || 0,
          date: newExam.date,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        setGrades(prev => [pendingGrade, ...prev]);
        await syncableCreate('student_grades', pendingGrade);
      }
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleToggleExam = async (exam: Exam, newScore?: number) => {
    const isNowCompleted = exam.status !== 'completed';
    const updatedExam: Exam = {
      ...exam,
      status: isNowCompleted ? 'completed' : 'pending',
      grade: newScore !== undefined ? newScore : exam.grade
    };

    setExams(prev => prev.map(e => e.id === exam.id ? updatedExam : e));
    showToast(isNowCompleted ? 'Examen completado' : 'Examen marcado como pendiente');

    try {
      await syncableUpdate('student_exams', updatedExam);

      // Sync with linked todo in todos table
      const allTodos = await getAll<Todo>('todos');
      const linkedTodo = (allTodos || []).find(t => 
        t.subject_id === subject.id && 
        t.academic_type === 'exam' && 
        (t.text.includes(exam.title) || exam.title.includes(t.text.replace('[Examen] ', '')))
      );
      if (linkedTodo) {
        const updatedTodo = { ...linkedTodo, completed: isNowCompleted };
        await syncableUpdate('todos', updatedTodo);
      }

      // Sync grade record
      const existingGrade = grades.find(g => g.exam_id === exam.id || g.name === exam.title);
      if (existingGrade) {
        const updatedGrade: Grade = {
          ...existingGrade,
          score: updatedExam.grade ?? existingGrade.score,
          status: isNowCompleted ? 'completed' : 'pending'
        };
        setGrades(prev => prev.map(g => g.id === existingGrade.id ? updatedGrade : g));
        await syncableUpdate('student_grades', updatedGrade);
      } else if (updatedExam.grade !== undefined && updatedExam.grade !== null) {
        const newGrade: Grade = {
          id: generateUUID(),
          user_id: exam.user_id,
          subject_id: subject.id,
          exam_id: exam.id,
          unit_id: exam.unit_id,
          name: exam.title,
          score: updatedExam.grade,
          max_score: subject.grade_scale || 10,
          weight: exam.weight || 0,
          date: exam.date,
          status: 'completed',
          created_at: new Date().toISOString()
        };
        setGrades(prev => [newGrade, ...prev]);
        await syncableCreate('student_grades', newGrade);
      }
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleUpdateExamGrade = async (exam: Exam, score: number) => {
    const updatedExam: Exam = {
      ...exam,
      grade: score,
      status: 'completed'
    };
    setExams(prev => prev.map(e => e.id === exam.id ? updatedExam : e));
    setEditingScoreExamId(null);
    setScoreInputValue('');
    showToast(`Nota guardada: ${score}`);

    try {
      await syncableUpdate('student_exams', updatedExam);

      // Sync with linked todo in todos table
      const allTodos = await getAll<Todo>('todos');
      const linkedTodo = (allTodos || []).find(t => 
        t.subject_id === subject.id && 
        t.academic_type === 'exam' && 
        (t.text.includes(exam.title) || exam.title.includes(t.text.replace('[Examen] ', '')))
      );
      if (linkedTodo) {
        const updatedTodo = { ...linkedTodo, completed: true };
        await syncableUpdate('todos', updatedTodo);
      }

      const existingGrade = grades.find(g => g.exam_id === exam.id || g.name === exam.title);
      if (existingGrade) {
        const updatedGrade: Grade = {
          ...existingGrade,
          score: score,
          status: 'completed'
        };
        setGrades(prev => prev.map(g => g.id === existingGrade.id ? updatedGrade : g));
        await syncableUpdate('student_grades', updatedGrade);
      } else {
        const newGrade: Grade = {
          id: generateUUID(),
          user_id: exam.user_id,
          subject_id: subject.id,
          exam_id: exam.id,
          unit_id: exam.unit_id,
          name: exam.title,
          score: score,
          max_score: subject.grade_scale || 10,
          weight: exam.weight || 0,
          date: exam.date,
          status: 'completed',
          created_at: new Date().toISOString()
        };
        setGrades(prev => [newGrade, ...prev]);
        await syncableCreate('student_grades', newGrade);
      }
    } catch (err) {
      console.error(err);
    }
    loadData();
  };

  const handleDeleteExam = async (examId: string) => {
    const examToDelete = exams.find(e => e.id === examId);
    setExams(prev => prev.filter(e => e.id !== examId));
    try {
      await syncableDelete('student_exams', examId);

      const linkedGrade = grades.find(g => g.exam_id === examId);
      if (linkedGrade) {
        setGrades(prev => prev.filter(g => g.id !== linkedGrade.id));
        await syncableDelete('student_grades', linkedGrade.id);
      }

      if (examToDelete) {
        const allTodos = await getAll<Todo>('todos');
        const linkedTodo = (allTodos || []).find(t => 
          t.subject_id === subject.id && 
          t.academic_type === 'exam' && 
          (t.text.includes(examToDelete.title) || examToDelete.title.includes(t.text.replace('[Examen] ', '')))
        );
        if (linkedTodo) {
          await syncableDelete('todos', linkedTodo.id);
        }
      }
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
      
      {/* UNIFIED TOP APP BAR */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-gray-150 dark:border-white/10 bg-white dark:bg-[#111] sticky top-0 z-40 flex items-center justify-between gap-3 shadow-2xs" style={{ borderBottomColor: `${subject.color || '#0d9488'}30` }}>
        {activeUnit ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <button 
                onClick={() => setActiveUnit(null)} 
                className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-gray-700 dark:text-gray-300 flex items-center gap-1 shrink-0 text-xs font-semibold"
                title="Atrás"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <div className="min-w-0 flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">
                  Unidad {units.findIndex(u => u.id === activeUnit.id) + 1}: {activeUnit.name}
                </h2>
                <button
                  type="button"
                  onClick={(e) => handleToggleUnitStatus(activeUnit, e)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white cursor-pointer shrink-0"
                >
                  {activeUnit.status === 'completed' ? '✓ Completada' : activeUnit.status === 'in_progress' ? '⏳ En progreso' : '⭕ Sin iniciar'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteUnit(activeUnit.id)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                title="Eliminar unidad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowMobileActionSheet(true)}
                className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Añadir a esta unidad"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={onBack} 
                className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-gray-700 dark:text-gray-300 flex items-center gap-1 shrink-0 text-xs font-semibold active:scale-95"
                title="Regresar"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <div 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-sm shrink-0 border border-gray-150/80 dark:border-white/10"
                style={{
                  backgroundColor: `${subject.color || '#0d9488'}20`,
                  color: subject.color || '#0d9488'
                }}
              >
                {renderSubjectIcon(subject.icon_name || subject.emoji, "w-5 h-5")}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate leading-tight">{subject.name}</h2>
                {subject.professor && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{subject.professor}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (activeTab === 'units') {
                    setIsAddingUnit(true);
                  } else if (activeTab === 'tasks') {
                    setNewTaskUnitId('');
                    setIsAddingTask(true);
                  } else if (activeTab === 'exams') {
                    setNewExamUnitId('');
                    setIsAddingExam(true);
                  } else if (activeTab === 'notes') {
                    onAddNote(null, undefined, subject.id);
                  } else if (activeTab === 'projects') {
                    setIsAddingProject(true);
                  } else if (activeTab === 'grades') {
                    setIsAddingGrade(true);
                  } else {
                    setShowMobileActionSheet(true);
                  }
                }}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {activeTab === 'units' ? 'Nueva unidad' : activeTab === 'tasks' ? 'Nueva tarea' : activeTab === 'exams' ? 'Nuevo examen' : activeTab === 'projects' ? 'Nuevo proyecto' : activeTab === 'grades' ? 'Nueva nota' : 'Añadir'}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* DESKTOP TABS */}
      <div className="hidden md:flex px-8 pt-4 border-b border-gray-100 dark:border-white/5 gap-6 overflow-x-auto shrink-0 bg-white dark:bg-[#111]">
        {(['overview', 'units', 'tasks', 'exams', 'notes', 'grades', 'projects'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => {
              setActiveTab(tab);
              setMobileSubView(tab === 'overview' ? 'main' : tab as any);
              setActiveUnit(null);
            }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap cursor-pointer ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {tab === 'notes' ? 'Apuntes' : tab === 'exams' ? 'Evaluaciones' : tab === 'grades' ? 'Calificaciones' : tab === 'overview' ? 'Resumen' : tab === 'units' ? 'Unidades' : tab === 'tasks' ? 'Tareas' : tab === 'projects' ? 'Proyectos' : tab}
            {activeTab === tab && (
              <motion.div layoutId="subject-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-black dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto h-full">
          {activeUnit ? (
            <div className="space-y-4">
              {activeUnit.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-100 dark:border-white/5">
                  {activeUnit.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* TAREAS DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Tareas
                    </h3>
                    <button
                      onClick={() => { setNewTaskUnitId(activeUnit.id); setIsAddingTask(true); }}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      + Tarea
                    </button>
                  </div>
                  {tasks.filter(t => t.unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 italic text-center">Sin tareas</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tasks.filter(t => t.unit_id === activeUnit.id).map(task => (
                        <div key={task.id} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <button onClick={() => handleToggleTask(task)} className="cursor-pointer shrink-0">
                              {task.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-gray-900 dark:text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                            <span className={`truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
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
                <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Exámenes
                    </h3>
                    <button
                      onClick={() => { setNewExamUnitId(activeUnit.id); setIsAddingExam(true); }}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      + Examen
                    </button>
                  </div>
                  {exams.filter(e => e.unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 italic text-center">Sin exámenes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {exams.filter(e => e.unit_id === activeUnit.id).map(exam => (
                        <div key={exam.id} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate block">{exam.title}</span>
                            <span className="text-[10px] text-gray-400 block">{exam.date}</span>
                          </div>
                          <button onClick={() => handleDeleteExam(exam.id)} className="text-gray-400 hover:text-red-500 p-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* APUNTES DE LA UNIDAD */}
                <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Apuntes
                    </h3>
                    <button
                      onClick={() => onAddNote(null, undefined, subject.id)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      + Apunte
                    </button>
                  </div>
                  {notes.filter(n => (n as any).unit_id === activeUnit.id).length === 0 ? (
                    <p className="text-xs text-gray-400 py-2 italic text-center">Sin apuntes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {notes.filter(n => (n as any).unit_id === activeUnit.id).map(note => (
                        <div key={note.id} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between text-xs border border-gray-100 dark:border-white/5">
                          <span className="font-medium text-gray-900 dark:text-white truncate">{note.title || 'Sin título'}</span>
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

              {/* CONTENIDO ACADÉMICO - 2 COLUMNAS */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Unidades Block */}
                  <button
                    onClick={() => { setActiveTab('units'); setMobileSubView('units'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Unidades
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {units.length === 0 ? 'Sin unidades' : `${units.length} ${units.length === 1 ? 'unidad' : 'unidades'}`}
                      </p>
                    </div>
                  </button>

                  {/* Tareas Block */}
                  <button
                    onClick={() => { setActiveTab('tasks'); setMobileSubView('tasks'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Tareas
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {tasks.filter(t => !t.completed).length === 1 ? '1 pendiente' : `${tasks.filter(t => !t.completed).length} pendientes`}
                      </p>
                    </div>
                  </button>

                  {/* Evaluaciones Block */}
                  <button
                    onClick={() => { setActiveTab('exams'); setMobileSubView('exams'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Evaluaciones
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {exams.filter(e => e.status !== 'completed').length === 1 ? '1 próxima' : `${exams.filter(e => e.status !== 'completed').length} programadas`}
                      </p>
                    </div>
                  </button>

                  {/* Apuntes Block */}
                  <button
                    onClick={() => { setActiveTab('notes'); setMobileSubView('notes'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Apuntes
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {notes.length === 1 ? '1 apunte' : `${notes.length} apuntes`}
                      </p>
                    </div>
                  </button>

                  {/* Calificaciones Block */}
                  <button
                    onClick={() => { setActiveTab('grades'); setMobileSubView('grades'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Calificaciones
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {grades.length > 0 ? `Promedio ${currentGrade.toFixed(1)}` : 'Sin notas'}
                      </p>
                    </div>
                  </button>

                  {/* Proyectos Block */}
                  <button
                    onClick={() => { setActiveTab('projects'); setMobileSubView('projects'); }}
                    className="p-4 sm:p-5 bg-white dark:bg-[#16141f] rounded-2xl sm:rounded-3xl border border-gray-150/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[125px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:text-black dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block group-hover:opacity-80 transition-opacity">
                        Proyectos
                      </h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {projects.length === 1 ? '1 vinculado' : `${projects.length} vinculados`}
                      </p>
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
              {units.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                  <FolderKanban className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No has creado unidades todavía.</p>
                  <button
                    onClick={() => setIsAddingUnit(true)}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear unidad</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit, i) => (
                    <div
                      key={unit.id}
                      onClick={() => setActiveUnit(unit)}
                      className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group relative"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-xs font-bold border border-gray-200 dark:border-white/10">
                            Unidad {i + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleToggleUnitStatus(unit, e)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                              {unit.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
                              <span>{unit.status === 'completed' ? 'Completada' : unit.status === 'in_progress' ? 'En progreso' : 'Sin iniciar'}</span>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Eliminar unidad"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors leading-snug">
                          {unit.name}
                        </h4>
                        {unit.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {unit.description}
                          </p>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Tareas / Sesiones Toggle */}
              <div className="flex items-center justify-start pb-2 border-b border-gray-150 dark:border-white/10">
                <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTasksSubTab('tasks')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      tasksSubTab === 'tasks'
                        ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Tareas ({tasks.filter(t => !t.completed).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTasksSubTab('sessions')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      tasksSubTab === 'sessions'
                        ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Registro de Sesiones ({studySessions.length})
                  </button>
                </div>
              </div>

              {tasksSubTab === 'tasks' ? (
                tasks.length === 0 ? (
                  <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                    <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay tareas asociadas a esta materia.</p>
                    <p className="text-xs text-gray-400 mt-1">Crea una tarea desde aquí para organizar tus pendientes de clase.</p>
                    <button
                      onClick={() => setIsAddingTask(true)}
                      className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
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
                        {tasks.filter(t => !t.completed).length === 0 ? (
                          <div className="p-4 bg-gray-50/70 dark:bg-white/5 rounded-2xl text-center text-xs text-gray-500">
                            ¡No tienes tareas pendientes en esta materia! 🎉
                          </div>
                        ) : (
                          tasks.filter(t => !t.completed).map(task => {
                            const taskUnit = units.find(u => u.id === task.unit_id);
                            const taskGrade = grades.find(g => g.name === task.text && g.subject_id === subject.id);
                            return (
                              <div
                                key={task.id}
                                className="bg-white dark:bg-[#151515] p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button
                                    onClick={() => handleToggleTask(task)}
                                    className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-900 dark:hover:border-white transition-colors cursor-pointer shrink-0"
                                  >
                                    {task.completed && <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />}
                                  </button>
                                  <div className="min-w-0">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white block truncate">
                                      {task.text}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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

                                <div className="flex items-center gap-2 shrink-0">
                                  {editingScoreTaskId === task.id ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const score = parseFloat(scoreInputValue);
                                        if (!isNaN(score)) handleUpdateTaskGrade(task, score);
                                      }}
                                      className="flex items-center gap-1"
                                    >
                                      <input
                                        type="number"
                                        step="0.1"
                                        autoFocus
                                        value={scoreInputValue}
                                        onChange={e => setScoreInputValue(e.target.value)}
                                        placeholder="Nota"
                                        className="w-16 px-2 py-0.5 text-xs bg-gray-50 dark:bg-[#111] border border-gray-300 dark:border-white/20 rounded-lg focus:outline-none"
                                      />
                                      <button type="submit" className="px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded text-[11px] font-bold">✓</button>
                                      <button type="button" onClick={() => setEditingScoreTaskId(null)} className="px-1 text-gray-400 text-xs">✕</button>
                                    </form>
                                  ) : taskGrade && taskGrade.score !== null && taskGrade.score !== undefined ? (
                                    <button
                                      onClick={() => { setEditingScoreTaskId(task.id); setScoreInputValue(String(taskGrade.score)); }}
                                      className="px-2 py-0.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:opacity-80"
                                      title="Editar calificación"
                                    >
                                      Nota: {taskGrade.score}/{taskGrade.max_score}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setEditingScoreTaskId(task.id); setScoreInputValue(''); }}
                                      className="text-[11px] font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                      + Nota
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* COMPLETADAS */}
                    {tasks.some(t => t.completed) && (
                      <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                          Completadas ({tasks.filter(t => t.completed).length})
                        </h4>
                        <div className="space-y-2 opacity-85">
                          {tasks.filter(t => t.completed).map(task => {
                            const taskGrade = grades.find(g => g.name === task.text && g.subject_id === subject.id);
                            return (
                              <div
                                key={task.id}
                                className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button onClick={() => handleToggleTask(task)} className="w-5 h-5 rounded-md border-2 border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center cursor-pointer shrink-0">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-sm font-medium text-gray-500 line-through truncate">
                                    {task.text}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {editingScoreTaskId === task.id ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const score = parseFloat(scoreInputValue);
                                        if (!isNaN(score)) handleUpdateTaskGrade(task, score);
                                      }}
                                      className="flex items-center gap-1"
                                    >
                                      <input
                                        type="number"
                                        step="0.1"
                                        autoFocus
                                        value={scoreInputValue}
                                        onChange={e => setScoreInputValue(e.target.value)}
                                        placeholder="Nota"
                                        className="w-16 px-2 py-0.5 text-xs bg-gray-50 dark:bg-[#111] border border-gray-300 dark:border-white/20 rounded-lg focus:outline-none"
                                      />
                                      <button type="submit" className="px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded text-[11px] font-bold">✓</button>
                                      <button type="button" onClick={() => setEditingScoreTaskId(null)} className="px-1 text-gray-400 text-xs">✕</button>
                                    </form>
                                  ) : taskGrade && taskGrade.score !== null && taskGrade.score !== undefined ? (
                                    <button
                                      onClick={() => { setEditingScoreTaskId(task.id); setScoreInputValue(String(taskGrade.score)); }}
                                      className="px-2 py-0.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:opacity-80"
                                      title="Editar calificación"
                                    >
                                      Nota: {taskGrade.score}/{taskGrade.max_score}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setEditingScoreTaskId(task.id); setScoreInputValue(''); }}
                                      className="text-[11px] font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                      + Nota
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* REGISTRO DE SESIONES DE ESTUDIO */
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#151515] p-5 sm:p-6 rounded-3xl border border-gray-150/70 dark:border-white/5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Historial de Sesiones
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Total acumulado: {studySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)} minutos de estudio
                        </p>
                      </div>
                    </div>

                    {studySessions.length === 0 ? (
                      <div className="py-8 text-center space-y-1 bg-gray-50/60 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                        <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          Aún no hay sesiones registradas para esta materia
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Inicia una sesión de estudio desde el inicio en el módulo de estudio.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {studySessions.map(session => (
                          <div
                            key={session.id}
                            className="p-4 bg-gray-50 dark:bg-[#16141f] rounded-2xl border border-gray-150/70 dark:border-white/5 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                {session.objective || 'Sesión de estudio'}
                              </h5>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                                <span>📅 {new Date(session.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>🕒 {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </p>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white shrink-0">
                              {session.duration_minutes} min
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
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
              {exams.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay exámenes programados.</p>
                  <button
                    onClick={() => setIsAddingExam(true)}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Programar examen</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map(exam => {
                    const examUnit = units.find(u => u.id === exam.unit_id);
                    const isCompleted = exam.status === 'completed';
                    return (
                      <div key={exam.id} className="bg-white dark:bg-[#151515] p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Chequesito para completar o desmarcar */}
                          <button
                            type="button"
                            onClick={() => handleToggleExam(exam)}
                            className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-black'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-white'
                            }`}
                            title={isCompleted ? 'Desmarcar examen' : 'Marcar examen como completado'}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold text-base text-gray-900 dark:text-gray-100 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                {exam.title}
                              </h4>
                              {examUnit && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-md">
                                  {examUnit.name}
                                </span>
                              )}
                              {exam.weight !== undefined && exam.weight !== null && exam.weight > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-white/10">
                                  {exam.weight}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1 text-xs text-gray-500 flex-wrap">
                              <span className="capitalize font-medium">{exam.type}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                {exam.date} {exam.time && `(${exam.time})`}
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
                        </div>

                        {/* Calificación y Acciones */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {editingScoreExamId === exam.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const score = parseFloat(scoreInputValue);
                                if (!isNaN(score)) handleUpdateExamGrade(exam, score);
                              }}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="number"
                                step="0.1"
                                autoFocus
                                value={scoreInputValue}
                                onChange={e => setScoreInputValue(e.target.value)}
                                placeholder="Nota"
                                className="w-16 px-2 py-1 text-xs bg-gray-50 dark:bg-[#111] border border-gray-300 dark:border-white/20 rounded-lg focus:outline-none"
                              />
                              <button type="submit" className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-bold">✓</button>
                              <button type="button" onClick={() => setEditingScoreExamId(null)} className="px-1.5 text-gray-400 text-xs">✕</button>
                            </form>
                          ) : exam.grade !== undefined && exam.grade !== null ? (
                            <button
                              onClick={() => { setEditingScoreExamId(exam.id); setScoreInputValue(String(exam.grade)); }}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:opacity-80"
                              title="Editar nota del examen"
                            >
                              Nota: {exam.grade}/{subject.grade_scale || 10}
                            </button>
                          ) : (
                            <button
                              onClick={() => { setEditingScoreExamId(exam.id); setScoreInputValue(''); }}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                            >
                              + Nota
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
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
              {resources.length === 0 ? (
                <div className="bg-white dark:bg-[#151515] p-8 rounded-3xl border border-gray-100 dark:border-white/5 text-center">
                  <Paperclip className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Guarda enlaces, PDFs, videos y materiales de estudio para esta materia.</p>
                  <button
                    onClick={() => setIsAddingResource(true)}
                    className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar recurso</span>
                  </button>
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

          {activeTab === 'grades' && (() => {
            const summary = calculateGradeSummary(subject, categories, grades);
            const usedWeight = categories.reduce((sum, c) => sum + (c.weight || 0), 0);

            return (
              <div className="space-y-6">
                {/* Resumen integrado directamente en el fondo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-150 dark:border-white/10">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                      Promedio del Curso
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {summary.currentAverage !== null ? summary.currentAverage.toFixed(1) : 'S/N'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">/ {summary.gradeScale}</span>
                      <span className="ml-2 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-semibold">
                        {summary.evaluatedPercentage}% Evaluado
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddingCategory(true)}
                      className="px-3.5 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200 dark:border-white/10"
                    >
                      + Categoría
                    </button>
                    <button
                      onClick={() => setIsAddingGrade(true)}
                      className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      + Evaluación
                    </button>
                  </div>
                </div>

                {/* Categorías y Ponderaciones Integradas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                      Ponderaciones ({usedWeight}% / 100%)
                    </h4>
                    <button
                      onClick={() => setIsAddingCategory(true)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                    >
                      + Nueva categoría
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1">Sin categorías configuradas (ej. Parciales 40%, Tareas 30%, Final 30%).</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {categories.map(cat => {
                        const catSummary = summary.categorySummaries.find(cs => cs.category.id === cat.id);
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-gray-900 dark:text-white">{cat.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono font-medium">({cat.weight}%)</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
                              <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                                {catSummary?.average !== null && catSummary?.average !== undefined ? catSummary.average.toFixed(1) : '—'}
                              </span>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                                title="Eliminar categoría"
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

                {/* Registro de Evaluaciones Integrado */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-white/10">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                      Historial de Evaluaciones ({grades.length})
                    </h4>
                    <button
                      onClick={() => setIsAddingGrade(true)}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:underline cursor-pointer"
                    >
                      + Añadir nota
                    </button>
                  </div>

                  {grades.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">No hay calificaciones registradas aún en esta materia.</p>
                  ) : (
                    <div className="divide-y divide-gray-150 dark:divide-white/10">
                      {grades.map(grade => {
                        const cat = categories.find(c => c.id === grade.category_id);
                        const isPending = grade.score === null || grade.status === 'pending';
                        return (
                          <div key={grade.id} className="py-3 flex items-center justify-between gap-3 group">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{grade.name}</span>
                                {cat && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 shrink-0">
                                    {cat.name} ({cat.weight}%)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                {grade.date && <span>📅 {grade.date}</span>}
                                {grade.notes && <span className="truncate">• {grade.notes}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {isPending ? (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
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
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-opacity"
                                title="Eliminar evaluación"
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
              </div>
            );
          })()}
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
              className="bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-t sm:border border-gray-200 dark:border-white/10 max-h-[90vh] flex flex-col"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
              <div className="px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Programar Examen / Evaluación</h3>
                  <p className="text-[11px] text-gray-400">Se sincronizará con tu calendario y módulo de tareas</p>
                </div>
                <button onClick={() => setIsAddingExam(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3.5 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Título del examen *</label>
                  <input
                    type="text"
                    value={newExamTitle}
                    onChange={e => setNewExamTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-sm"
                    placeholder="Ej: Primer Examen Parcial"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Tipo</label>
                    <select
                      value={newExamType}
                      onChange={e => setNewExamType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    >
                      <option value="midterm">Parcial</option>
                      <option value="quiz">Quiz / Corto</option>
                      <option value="final">Examen Final</option>
                      <option value="lab">Laboratorio / Práctica</option>
                      <option value="presentation">Presentación / Defensa</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Ponderación (%)</label>
                    <input
                      type="number"
                      value={newExamWeight}
                      onChange={e => setNewExamWeight(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                      placeholder="Ej: 25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={newExamDate}
                      onChange={e => setNewExamDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Hora</label>
                    <input
                      type="time"
                      value={newExamTime}
                      onChange={e => setNewExamTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Ubicación / Aula (Opcional)</label>
                  <input
                    type="text"
                    value={newExamLocation}
                    onChange={e => setNewExamLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    placeholder="Ej: Aula Magna 201 o Zoom"
                  />
                </div>

                {categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Categoría de Calificación</label>
                    <select
                      value={newExamCategoryId}
                      onChange={e => setNewExamCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-xs"
                    >
                      <option value="">Sin categoría asignada</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>
                      ))}
                    </select>
                  </div>
                )}

                {units.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Unidad del Temario</label>
                    <select
                      value={newExamUnitId}
                      onChange={e => setNewExamUnitId(e.target.value)}
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Temas / Instrucciones a Estudiar</label>
                  <textarea
                    value={newExamNotes}
                    onChange={e => setNewExamNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Capítulos 1 al 4, fórmulas de derivadas..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-[#111]/50 shrink-0">
                <button onClick={() => setIsAddingExam(false)} className="px-4 py-2 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSaveExam} disabled={!newExamTitle.trim() || !newExamDate} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer">Guardar Examen</button>
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
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate pr-2">
                  {activeUnit ? `Añadir a Unidad: ${activeUnit.name}` : `Añadir a ${subject.name}`}
                </h3>
                <button
                  onClick={() => setShowMobileActionSheet(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeUnit ? (
                /* ACCIONES EXCLUSIVAS PARA LA UNIDAD ACTIVA */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => { setShowMobileActionSheet(false); setNewTaskUnitId(activeUnit.id); setIsAddingTask(true); }}
                    className="p-3.5 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Tarea</span>
                    <span className="text-[10px] text-gray-500">Asignada a esta unidad</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); setNewExamUnitId(activeUnit.id); setIsAddingExam(true); }}
                    className="p-3.5 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Examen</span>
                    <span className="text-[10px] text-gray-500">Evaluación de la unidad</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); onAddNote(null, undefined, subject.id); }}
                    className="p-3.5 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Apunte</span>
                    <span className="text-[10px] text-gray-500">Nota de la materia</span>
                  </button>
                </div>
              ) : (
                /* ACCIONES GENERALES DE LA MATERIA */
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => { setShowMobileActionSheet(false); setNewTaskUnitId(''); setIsAddingTask(true); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Tarea</span>
                    <span className="text-[10px] text-gray-500">Pendiente de clase</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); setNewExamUnitId(''); setIsAddingExam(true); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Examen</span>
                    <span className="text-[10px] text-gray-500">Evaluación parcial/final</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); onAddNote(null, undefined, subject.id); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Apunte</span>
                    <span className="text-[10px] text-gray-500">Nota de clase</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); setIsAddingResource(true); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Recurso</span>
                    <span className="text-[10px] text-gray-500">Enlace o archivo</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); setIsAddingUnit(true); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Unidad</span>
                    <span className="text-[10px] text-gray-500">Temario oficial</span>
                  </button>

                  <button
                    onClick={() => { setShowMobileActionSheet(false); setIsAddingProject(true); }}
                    className="p-3 bg-gray-50 dark:bg-[#222] rounded-2xl border border-gray-150 dark:border-white/5 text-left hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Proyecto</span>
                    <span className="text-[10px] text-gray-500">Trabajo individual o grupal</span>
                  </button>
                </div>
              )}
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
