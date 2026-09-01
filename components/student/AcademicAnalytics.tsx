import React, { useState } from 'react';
import { Subject, Grade, StudySession, Attendance, Goal, Reading, Exam, AcademicPeriod } from './types';
import { motion } from 'framer-motion';

interface Props {
  subjects: Subject[];
  grades: Grade[];
  studySessions: StudySession[];
  attendances: Attendance[];
  goals: Goal[];
  readings: Reading[];
  exams: Exam[];
  periods: AcademicPeriod[];
  onSelectSubject: (subject: Subject) => void;
}

export const AcademicAnalytics: React.FC<Props> = ({
  subjects,
  grades,
  studySessions,
  attendances,
  goals,
  readings,
  exams,
  periods,
  onSelectSubject,
}) => {
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(12);

  // 1. Calculate GPA / General Weighted Grade
  const subjectGradesMap: { [subjectId: string]: { currentGrade: number; totalWeight: number } } = {};
  
  subjects.forEach(subject => {
    const subGrades = grades.filter(g => g.subject_id === subject.id);
    const totalWeight = subGrades.reduce((sum, g) => sum + (g.weight || 0), 0);
    const weightedSum = subGrades.reduce((sum, g) => sum + (g.score / (g.max_score || 10)) * (g.weight || 0), 0);
    const currentGrade = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : 0;
    subjectGradesMap[subject.id] = { currentGrade, totalWeight };
  });

  const subjectsWithGrades = Object.values(subjectGradesMap).filter(sg => sg.totalWeight > 0);
  const generalGPA = subjectsWithGrades.length > 0
    ? subjectsWithGrades.reduce((sum, sg) => sum + sg.currentGrade, 0) / subjectsWithGrades.length
    : 0;

  // 2. Study Time Statistics
  const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  // Filter study sessions for last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const weeklySessions = studySessions.filter(s => {
    const sessionDate = new Date(s.start_time || s.created_at);
    return sessionDate >= sevenDaysAgo;
  });
  const weeklyStudyMinutes = weeklySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const weeklyStudyHours = (weeklyStudyMinutes / 60).toFixed(1);
  const weeklyProgress = Math.min(100, Math.round((parseFloat(weeklyStudyHours) / weeklyTargetHours) * 100));

  // Study hours per subject
  const studyHoursBySubject: { [subjectId: string]: number } = {};
  studySessions.forEach(s => {
    studyHoursBySubject[s.subject_id] = (studyHoursBySubject[s.subject_id] || 0) + (s.duration_minutes || 0);
  });

  // 3. Attendance Rate
  const totalAttendanceRecords = attendances.length;
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendanceRecords > 0
    ? Math.round((presentCount / totalAttendanceRecords) * 100)
    : 100;

  // 4. Goals Rate
  const totalGoals = goals.length;
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;
  const goalsRate = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;

  // 5. Readings Stats
  const completedReadings = readings.filter(r => r.status === 'completed').length;
  const activeReadings = readings.filter(r => r.status === 'reading').length;

  // 6. Upcoming Exams (sorted by date)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingExams = exams
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Estadísticas y Analíticas Académicas</h3>
          <p className="text-sm text-gray-500 mt-1">Rendimiento integral, dedicación y métricas de estudio en tiempo real.</p>
        </div>
      </div>

      {/* Top Metric Cards (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Promedio General */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Promedio General</span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {generalGPA > 0 ? generalGPA.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-400">/ 10</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {subjectsWithGrades.length} {subjectsWithGrades.length === 1 ? 'materia evaluada' : 'materias evaluadas'}
          </p>
        </div>

        {/* Tiempo Total de Estudio */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tiempo Estudiado</span>
            <span className="text-lg">⏱️</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalStudyHours}</span>
            <span className="text-xs text-gray-400">hrs</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {studySessions.length} {studySessions.length === 1 ? 'sesión registrada' : 'sesiones registradas'}
          </p>
        </div>

        {/* Tasa de Asistencia */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Asistencia Global</span>
            <span className="text-lg">📅</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{attendanceRate}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {presentCount} de {totalAttendanceRecords} clases
          </p>
        </div>

        {/* Metas Cumplidas */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Metas Logradas</span>
            <span className="text-lg">🏆</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{goalsRate}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {achievedGoals} de {totalGoals} completadas
          </p>
        </div>
      </div>

      {/* Main Grid: Weekly Study Target & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Weekly Target & Dedication Distribution */}
        <div className="space-y-6">
          
          {/* Weekly Goal Card */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Meta Semanal de Estudio</h4>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={weeklyTargetHours}
                  onChange={(e) => setWeeklyTargetHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 px-1.5 py-0.5 text-xs text-center font-bold bg-gray-100 dark:bg-white/10 rounded-md border-0"
                />
                <span className="text-xs text-gray-400">h</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{weeklyStudyHours} hrs esta semana</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{weeklyProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${weeklyProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-400 pt-1">
                {parseFloat(weeklyStudyHours) >= weeklyTargetHours
                  ? '🎉 ¡Felicitaciones! Has alcanzado tu meta semanal.'
                  : `Te faltan ${(weeklyTargetHours - parseFloat(weeklyStudyHours)).toFixed(1)} hrs para completar la semana.`}
              </p>
            </div>
          </div>

          {/* Dedicated Study Hours by Subject */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Dedicación por Materia</h4>
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay materias registradas.</p>
            ) : (
              <div className="space-y-4">
                {subjects.map(subject => {
                  const mins = studyHoursBySubject[subject.id] || 0;
                  const hrs = (mins / 60).toFixed(1);
                  const pct = totalStudyMinutes > 0 ? Math.round((mins / totalStudyMinutes) * 100) : 0;
                  
                  return (
                    <div key={subject.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium flex items-center gap-1.5 truncate max-w-[180px]">
                          <span>{subject.emoji || '📘'}</span>
                          <span>{subject.name}</span>
                        </span>
                        <span className="text-gray-500">{hrs}h ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: subject.color || '#3B82F6' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Academic Summary */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-2">Lecturas y Biblioteca</h4>
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-white/5">
              <span className="text-gray-500">Lecturas en Curso:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{activeReadings}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-white/5">
              <span className="text-gray-500">Lecturas Completadas:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{completedReadings}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-gray-500">Total en Biblioteca:</span>
              <span className="font-semibold">{readings.length}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Table & Upcoming Exams */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Subject Performance Breakdown */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Boletín de Rendimiento Académico</h4>
            
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hay materias añadidas.</p>
            ) : (
              <div className="space-y-3">
                {subjects.map(subject => {
                  const gradeInfo = subjectGradesMap[subject.id];
                  const subAttendances = attendances.filter(a => a.subject_id === subject.id);
                  const subPresent = subAttendances.filter(a => a.status === 'present').length;
                  const subAttRate = subAttendances.length > 0 ? Math.round((subPresent / subAttendances.length) * 100) : 100;
                  const currentGrade = gradeInfo?.currentGrade || 0;
                  const totalWeight = gradeInfo?.totalWeight || 0;

                  // Status Badge
                  let statusBadge = { label: 'Sin Notas', color: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400' };
                  if (totalWeight > 0) {
                    if (currentGrade >= 8.5) {
                      statusBadge = { label: 'Excelente', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' };
                    } else if (currentGrade >= 6.0) {
                      statusBadge = { label: 'Aprobando', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' };
                    } else {
                      statusBadge = { label: 'En Riesgo', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' };
                    }
                  }

                  return (
                    <div
                      key={subject.id}
                      onClick={() => onSelectSubject(subject)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-100/80 dark:border-white/5 cursor-pointer gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 text-white shadow-sm"
                          style={{ backgroundColor: subject.color || '#3B82F6' }}
                        >
                          {subject.emoji || '📚'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-base">{subject.name}</h5>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {subject.professor ? `Prof. ${subject.professor}` : 'Sin profesor asignado'} • Asistencia: {subAttRate}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Nota ({totalWeight}%)</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {totalWeight > 0 ? currentGrade.toFixed(2) : '--'}
                            <span className="text-xs font-normal text-gray-400"> / 10</span>
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-blue-500 shadow-sm">
                          →
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Exams & Critical Deliveries */}
          <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Próximos Exámenes y Evaluaciones</h4>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hay exámenes programados próximamente.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingExams.slice(0, 4).map(exam => {
                  const subject = subjects.find(s => s.id === exam.subject_id);
                  const examDate = new Date(exam.date);
                  const diffDays = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={exam.id}
                      className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: subject?.color ? `${subject.color}20` : '#3B82F620',
                              color: subject?.color || '#3B82F6',
                            }}
                          >
                            {subject?.name || 'Materia'}
                          </span>
                          <span className={`text-xs font-medium ${diffDays <= 3 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            {diffDays === 0 ? '¡Hoy!' : diffDays === 1 ? '¡Mañana!' : `en ${diffDays} días`}
                          </span>
                        </div>
                        <h6 className="font-semibold text-sm text-gray-900 dark:text-white mt-1">{exam.title}</h6>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between text-xs text-gray-400">
                        <span>{exam.date} {exam.time && `• ${exam.time}`}</span>
                        {exam.weight && <span>Peso: {exam.weight}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
