// =============================================================================
// Gradebook Module — Barrel Export (G20)
// =============================================================================
export { gradebookRoutes } from './gradebook.routes.js';
export {
  calculateGradebook,
  validateCategoryCoverage,
  computeCategoryAverages,
  applyCategoryWeights,
  TEST_HELPERS,
} from './gradebook.calculation.js';
export {
  evaluateStudentTT22,
  classifyAcademicPerformance,
  classifyConduct,
  determineHonorTitle,
  computeClassSummary,
  computeDTBmhk,
  computeDTBmcn,
  buildSubjectScore,
  generateVerificationCode,
  roundTT22,
  TT22_TEST_HELPERS,
} from './tt22.engine.js';

// Re-export service functions as a namespace for convenience
export {
  listCategories,
  createCategory,
  updateCategory,
  listGrades,
  getGradeById,
  createGrade,
  updateGrade,
  publishGrade,
  batchPublishGrades,
  computeStudentGrade,
  batchComputeGrades,
  listCalculationConfigs,
  createCalculationConfig,
  listSnapshots,
  openClassGradebook,
  saveDraftGrade,
  unlockGrade,
  bulkEnterGrades,
  getGradeAuditLogs,
  getStudentGradesForParent,
  getClassAcademicSummary,
  getStudentReportCard,
  lockClassGradebook,
} from './gradebook.service.js';

// Legacy namespace export for backwards compatibility
import * as gradebookService from './gradebook.service.js';
export { gradebookService };
