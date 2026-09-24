// =============================================================================
// Gradebook Module — Barrel Export (G20)
// =============================================================================
export { gradebookRoutes } from './gradebook.routes.js';
export { calculateGradebook, validateCategoryCoverage, computeCategoryAverages, applyCategoryWeights, TEST_HELPERS } from './gradebook.calculation.js';

// Re-export entire service module as gradebookService
import * as gradebookServiceModule from './gradebook.service.js';
export { gradebookServiceModule as gradebookService };
