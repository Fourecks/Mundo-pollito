import { Subject, GradeCategory, Grade } from '../types';

export interface GradeSummary {
  gradeScale: number;
  evaluatedPercentage: number; // e.g. 45 (%)
  currentAverage: number | null; // e.g. 8.7 or null if 0% evaluated
  categorySummaries: {
    category: GradeCategory;
    average: number | null; // 0-gradeScale
    evaluatedWeight: number; // weight evaluated so far for this category
    completedCount: number;
    pendingCount: number;
  }[];
  uncategorizedGrades: Grade[];
  targetProjection?: {
    targetGrade: number;
    maxPossibleGrade: number;
    requiredInRemaining: number | null;
    isAchieved: boolean;
    isImpossible: boolean;
    message: string;
  };
}

export function calculateGradeSummary(
  subject: Subject,
  categories: GradeCategory[],
  grades: Grade[]
): GradeSummary {
  const gradeScale = subject.grade_scale || 10;
  const targetGrade = subject.target_grade || (gradeScale === 100 ? 80 : 8.0);

  const subjectCategories = categories.filter(c => c.subject_id === subject.id);
  const subjectGrades = grades.filter(g => g.subject_id === subject.id);

  let totalEvaluatedWeight = 0;
  let weightedSum = 0;

  const categorySummaries = subjectCategories.map(category => {
    const catGrades = subjectGrades.filter(g => g.category_id === category.id);
    const completed = catGrades.filter(g => g.status === 'completed' && g.score !== null && g.score !== undefined);
    const pending = catGrades.filter(g => g.status === 'pending' || g.score === null || g.score === undefined);

    if (completed.length === 0) {
      return {
        category,
        average: null,
        evaluatedWeight: 0,
        completedCount: 0,
        pendingCount: pending.length,
      };
    }

    // Average score normalized to gradeScale
    const sumNormalized = completed.reduce((acc, g) => {
      const max = g.max_score || gradeScale;
      const score = g.score || 0;
      return acc + (score / max) * gradeScale;
    }, 0);

    const average = sumNormalized / completed.length;
    // Category contributes category.weight to total evaluated weight
    const catWeight = category.weight || 0;
    totalEvaluatedWeight += catWeight;
    weightedSum += (average / gradeScale) * catWeight;

    return {
      category,
      average,
      evaluatedWeight: catWeight,
      completedCount: completed.length,
      pendingCount: pending.length,
    };
  });

  const uncategorizedGrades = subjectGrades.filter(g => !g.category_id);

  const currentAverage = totalEvaluatedWeight > 0 
    ? (weightedSum / (totalEvaluatedWeight / 100)) 
    : null;

  let targetProjection: GradeSummary['targetProjection'];

  if (targetGrade && totalEvaluatedWeight < 100) {
    const evaluatedFrac = totalEvaluatedWeight / 100;
    const remainingFrac = 1 - evaluatedFrac;
    const currentContrib = totalEvaluatedWeight > 0 ? (currentAverage! / gradeScale) * evaluatedFrac : 0;
    
    const maxPossible = (currentContrib + remainingFrac) * gradeScale;
    const targetFrac = targetGrade / gradeScale;

    if (currentContrib >= targetFrac) {
      targetProjection = {
        targetGrade,
        maxPossibleGrade: maxPossible,
        requiredInRemaining: 0,
        isAchieved: true,
        isImpossible: false,
        message: 'Con las calificaciones registradas ya alcanzaste el mínimo necesario para tu meta.',
      };
    } else if (maxPossible < targetGrade) {
      targetProjection = {
        targetGrade,
        maxPossibleGrade: Number(maxPossible.toFixed(1)),
        requiredInRemaining: null,
        isAchieved: false,
        isImpossible: true,
        message: `Con las evaluaciones restantes, la calificación máxima posible es ${maxPossible.toFixed(1)}.`,
      };
    } else {
      const reqFrac = (targetFrac - currentContrib) / remainingFrac;
      const reqVal = reqFrac * gradeScale;
      targetProjection = {
        targetGrade,
        maxPossibleGrade: Number(maxPossible.toFixed(1)),
        requiredInRemaining: Number(reqVal.toFixed(1)),
        isAchieved: false,
        isImpossible: false,
        message: `Necesitas aproximadamente ${reqVal.toFixed(1)} en el porcentaje restante.`,
      };
    }
  }

  return {
    gradeScale,
    evaluatedPercentage: Math.min(100, Math.round(totalEvaluatedWeight)),
    currentAverage: currentAverage !== null ? Number(currentAverage.toFixed(2)) : null,
    categorySummaries,
    uncategorizedGrades,
    targetProjection,
  };
}
