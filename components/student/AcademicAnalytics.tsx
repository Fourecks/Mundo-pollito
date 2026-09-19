import React, { useState } from 'react';
import { Subject, Grade, GradeCategory, AcademicPeriod, Exam, Goal, Reading } from './types';
import { Todo, Project } from '../../types';
import { calculateGradeSummary } from './utils/gradeCalculator';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, FileText, BarChart2 } from 'lucide-react';

interface Props {
  subjects: Subject[];
  grades: Grade[];
  categories?: GradeCategory[];
  exams: Exam[];
  periods: AcademicPeriod[];
  todos?: Todo[];
  projects?: Project[];
  goals?: Goal[];
  readings?: Reading[];
  onSelectSubject: (subject: Subject) => void;
  onBack?: () => void;
}

export const AcademicAnalytics: React.FC<Props> = ({
  subjects,
  grades,
  categories = [],
  exams,
  periods,
  todos = [],
  projects = [],
  onSelectSubject,
  onBack,
}) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods.find(p => p.is_current)?.id || (periods[0]?.id || 'current')
  );

  // Filter active subjects
  const activeSubjects = subjects.filter(s => s.status !== 'archived');

  // Calculate subject averages using calculateGradeSummary
  const subjectSummaries = activeSubjects.map(subj => {
    const summary = calculateGradeSummary(subj, categories, grades);
    return {
      subject: subj,
      summary,
      avg: summary.currentAverage
    };
  });

  // Calculate overall GPA from subjects that have grades
  const evaluatedSummaries = subjectSummaries.filter(s => s.avg !== null);
  const overallGpa = evaluatedSummaries.length > 0
    ? evaluatedSummaries.reduce((sum, s) => sum + s.avg!, 0) / evaluatedSummaries.length
    : null;

  // Real task metrics
  const academicTodos = todos.filter(t => t.subject_id || t.project_id);
  const completedTodosCount = academicTodos.filter(t => t.completed).length;
  const totalTodosCount = academicTodos.length;

  // Real evaluation metrics
  const completedGradesCount = grades.filter(g => g.score !== null && g.score !== undefined && g.status === 'completed').length;

  // Upcoming in next 7 days calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const next7DaysStr = next7Days.toISOString().split('T')[0];

  // Upcoming tasks in next 7 days
  const upcomingTasks = todos.filter(t => !t.completed && t.due_date && t.due_date >= todayStr && t.due_date <= next7DaysStr);
  // Upcoming exams in next 7 days
  const upcomingExams = exams.filter(e => e.date >= todayStr && e.date <= next7DaysStr);
  // Upcoming projects in next 7 days
  const upcomingProjects = projects.filter(p => p.due_date && p.due_date >= todayStr && p.due_date <= next7DaysStr);

  const totalUpcomingCount = upcomingTasks.length + upcomingExams.length + upcomingProjects.length;

  // Events list sorted by date
  const upcomingEvents = [
    ...upcomingExams.map(e => ({ id: `exam-${e.id}`, type: 'eval' as const, title: e.title, date: e.date, subjectId: e.subject_id })),
    ...upcomingTasks.map(t => ({ id: `task-${t.id}`, type: 'task' as const, title: t.text, date: t.due_date!, subjectId: t.subject_id })),
    ...upcomingProjects.map(p => ({ id: `project-${p.id}`, type: 'project' as const, title: p.title, date: p.due_date!, subjectId: p.subject_id }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Evolution trend data (grades with dates)
  const datedGrades = grades
    .filter(g => g.score !== null && g.score !== undefined && g.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Calculate cumulative average at each evaluation point
  const trendPoints: { date: string; avg: number }[] = [];
  let runningSum = 0;
  datedGrades.forEach((g, idx) => {
    const scale = g.max_score || 10;
    const normScore = (g.score! / scale) * 10;
    runningSum += normScore;
    const currentRunningAvg = runningSum / (idx + 1);
    trendPoints.push({
      date: g.date!,
      avg: currentRunningAvg
    });
  });

  const selectedPeriodObj = periods.find(p => p.id === selectedPeriodId);
  const periodLabel = selectedPeriodObj ? selectedPeriodObj.name : 'Ciclo II · 2026';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 px-1">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase block">
              Módulo Académico
            </span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              Estadísticas
            </h2>
          </div>
        </div>

        {/* Period Selector */}
        {periods.length > 0 ? (
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-[#1A1A1A] text-xs font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_current ? ' (Actual)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl">
            {periodLabel}
          </span>
        )}
      </div>

      {/* 2. Resumen Académico Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Promedio Actual */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-150 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Promedio Actual
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overallGpa !== null ? overallGpa.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-gray-400 font-semibold">/ 10</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {evaluatedSummaries.length} de {activeSubjects.length} materias con notas
          </p>
        </div>

        {/* Materias Activas */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-150 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Materias Activas
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {activeSubjects.length}
          </div>
          <p className="text-[10px] text-gray-400">
            Inscritas en {periodLabel}
          </p>
        </div>

        {/* Tareas Completadas */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-150 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Tareas Completadas
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {completedTodosCount} <span className="text-xs font-normal text-gray-400">/ {totalTodosCount}</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {totalTodosCount > 0 ? `${Math.round((completedTodosCount / totalTodosCount) * 100)}% avance total` : 'Sin tareas asignadas'}
          </p>
        </div>

        {/* Evaluaciones Registradas */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-150 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Evaluaciones Registradas
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {completedGradesCount}
          </div>
          <p className="text-[10px] text-gray-400">
            Calificaciones calificadas
          </p>
        </div>
      </div>

      {/* 4. Rendimiento por Materia */}
      <div className="bg-white dark:bg-[#151515] p-4 sm:p-5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
          Rendimiento por Materia
        </h3>

        {activeSubjects.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">
            No tienes materias activas registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {subjectSummaries.map(({ subject, summary, avg }) => {
              const gradeScale = subject.grade_scale || 10;
              const displayAvg = avg !== null ? avg.toFixed(1) : '--';
              const percentage = avg !== null ? (avg / gradeScale) * 100 : 0;

              return (
                <div
                  key={subject.id}
                  onClick={() => onSelectSubject(subject)}
                  className="p-3 bg-gray-50/70 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl border border-gray-100 dark:border-white/5 transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: subject.color || '#3B82F6' }}
                      >
                        {subject.emoji || '📚'}
                      </div>
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {subject.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs text-gray-900 dark:text-white">
                        {displayAvg} <span className="text-[10px] font-normal text-gray-400">/ {gradeScale}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Horizontal mini bar */}
                  <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, percentage))}%`,
                        backgroundColor: subject.color || '#3B82F6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Carga Próxima (Próximos 7 días) */}
      <div className="bg-white dark:bg-[#151515] p-4 sm:p-5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
            Próximos 7 Días
          </h3>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {upcomingTasks.length} tareas · {upcomingExams.length} evaluaciones · {upcomingProjects.length} entregas
          </span>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-gray-400">Sin actividades o evaluaciones programadas para los próximos 7 días.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {upcomingEvents.map((evt) => {
              const subj = subjects.find(s => s.id === evt.subjectId);
              return (
                <div key={evt.id} className="p-3 bg-gray-50/70 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase ${
                        evt.type === 'eval'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                          : evt.type === 'project'
                          ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {evt.type === 'eval' ? 'Evaluación' : evt.type === 'project' ? 'Proyecto' : 'Tarea'}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{evt.title}</h4>
                      {subj && <p className="text-[10px] text-gray-400 truncate">{subj.name}</p>}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 shrink-0">
                    {evt.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Gráficas - Evolución del Promedio */}
      <div className="bg-white dark:bg-[#151515] p-4 sm:p-5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
          Evolución del Promedio
        </h3>

        {trendPoints.length < 2 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400">
              Aún no hay suficiente historial para mostrar una tendencia.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="h-32 w-full flex items-end gap-2 pt-4 px-2">
              {trendPoints.map((pt, idx) => {
                const heightPct = Math.min(100, Math.max(10, (pt.avg / 10) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                      {pt.avg.toFixed(1)}
                    </span>
                    <div className="w-full bg-blue-100 dark:bg-blue-950/40 rounded-t-lg h-24 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-blue-600 rounded-t-lg transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 truncate max-w-full">
                      {pt.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Tendencia acumulada basada en las {trendPoints.length} evaluaciones calificados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
