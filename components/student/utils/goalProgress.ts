import { Goal, Subject, GradeCategory, Grade, Reading } from '../types';
import { Todo, Project } from '../../../types';
import { calculateGradeSummary } from './gradeCalculator';

export interface GoalProgressInfo {
  currentText: string;
  targetText: string;
  progressPercent: number;
  subtitle: string;
  status: 'in_progress' | 'achieved' | 'missed';
}

export function computeGoalProgress(
  goal: Goal,
  subjects: Subject[],
  categories: GradeCategory[],
  grades: Grade[],
  todos: Todo[],
  readings: Reading[],
  projects: Project[]
): GoalProgressInfo {
  // Goal types: 'grade' | 'subject' | 'task' | 'reading' | 'project' | 'personal'
  const goalType = goal.type || 'personal';

  if (goalType === 'grade') {
    // Overall GPA target or Subject grade target
    let avgSum = 0;
    let countedSubjects = 0;

    const activeSubjects = subjects.filter(s => s.status !== 'archived');
    activeSubjects.forEach(s => {
      const summary = calculateGradeSummary(s, categories, grades);
      if (summary.currentAverage !== null) {
        avgSum += summary.currentAverage;
        countedSubjects++;
      }
    });

    const currentGpa = countedSubjects > 0 ? avgSum / countedSubjects : 0;
    const targetGpa = goal.target_value || 8.0;
    const percent = Math.min(100, Math.round((currentGpa / targetGpa) * 100));

    return {
      currentText: currentGpa > 0 ? currentGpa.toFixed(1) : 'S/N',
      targetText: targetGpa.toFixed(1),
      progressPercent: percent,
      subtitle: `Promedio actual: ${currentGpa > 0 ? currentGpa.toFixed(2) : 'S/N'} · Meta: ${targetGpa.toFixed(1)}`,
      status: currentGpa >= targetGpa ? 'achieved' : goal.status,
    };
  }

  if (goalType === 'subject' && goal.subject_id) {
    const subject = subjects.find(s => s.id === goal.subject_id);
    if (!subject) {
      return {
        currentText: 'S/N',
        targetText: (goal.target_value || 8.0).toString(),
        progressPercent: 0,
        subtitle: 'Materia no encontrada',
        status: goal.status,
      };
    }
    const summary = calculateGradeSummary(subject, categories, grades);
    const current = summary.currentAverage !== null ? summary.currentAverage : 0;
    const target = goal.target_value || subject.target_grade || 8.0;
    const percent = Math.min(100, Math.round((current / target) * 100));

    return {
      currentText: current > 0 ? current.toFixed(1) : 'S/N',
      targetText: target.toFixed(1),
      progressPercent: percent,
      subtitle: `${subject.name}: ${current > 0 ? current.toFixed(2) : 'S/N'} / ${target.toFixed(1)}`,
      status: current >= target ? 'achieved' : goal.status,
    };
  }

  if (goalType === 'task') {
    const targetTasks = goal.target_value || 5;
    let relevantTodos = todos;
    if (goal.subject_id) {
      relevantTodos = todos.filter(t => t.subject_id === goal.subject_id);
    }
    const completedCount = relevantTodos.filter(t => t.completed).length;
    const percent = Math.min(100, Math.round((completedCount / targetTasks) * 100));
    const subjName = goal.subject_id ? subjects.find(s => s.id === goal.subject_id)?.name : null;

    return {
      currentText: completedCount.toString(),
      targetText: targetTasks.toString(),
      progressPercent: percent,
      subtitle: `${completedCount} de ${targetTasks} tareas completadas${subjName ? ` (${subjName})` : ''}`,
      status: completedCount >= targetTasks ? 'achieved' : goal.status,
    };
  }

  if (goalType === 'reading') {
    if (goal.reading_id) {
      const reading = readings.find(r => r.id === goal.reading_id);
      if (reading) {
        const curPages = reading.current_page || 0;
        const totalPages = reading.total_pages || goal.target_value || 100;
        const percent = Math.min(100, Math.round((curPages / totalPages) * 100));

        return {
          currentText: curPages.toString(),
          targetText: totalPages.toString(),
          progressPercent: percent,
          subtitle: `${reading.title}: ${curPages} de ${totalPages} pág.`,
          status: reading.status === 'completed' || curPages >= totalPages ? 'achieved' : goal.status,
        };
      }
    }
    const completedReadings = readings.filter(r => r.status === 'completed').length;
    const targetReadings = goal.target_value || 4;
    const percent = Math.min(100, Math.round((completedReadings / targetReadings) * 100));

    return {
      currentText: completedReadings.toString(),
      targetText: targetReadings.toString(),
      progressPercent: percent,
      subtitle: `${completedReadings} de ${targetReadings} lecturas terminadas`,
      status: completedReadings >= targetReadings ? 'achieved' : goal.status,
    };
  }

  if (goalType === 'project') {
    if (goal.project_id) {
      const proj = projects.find(p => p.id === goal.project_id);
      if (proj) {
        const isCompleted = proj.status === 'completed' || (proj.status as string) === 'Done';
        return {
          currentText: isCompleted ? '100%' : 'En desarrollo',
          targetText: '100%',
          progressPercent: isCompleted ? 100 : 50,
          subtitle: `Proyecto ${proj.name}: ${isCompleted ? 'Completado' : 'En curso'}`,
          status: isCompleted ? 'achieved' : goal.status,
        };
      }
    }
  }

  // Personal / Default
  const isAchieved = goal.status === 'achieved';
  const curVal = goal.current_value || (isAchieved ? 100 : 0);
  const targetVal = goal.target_value || 100;
  const percent = Math.min(100, Math.round((curVal / targetVal) * 100));

  return {
    currentText: isAchieved ? 'Logrado' : 'En progreso',
    targetText: goal.target_date || 'Meta personal',
    progressPercent: percent,
    subtitle: goal.description || (goal.target_date ? `Fecha límite: ${goal.target_date}` : 'Meta académica'),
    status: goal.status,
  };
}
