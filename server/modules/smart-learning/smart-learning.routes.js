// =============================================================================
// Smart Learning Routes — Express Router
// Implements: Flashcards SM-2, Flipped Classroom, Periodic Table, Exam Parser
// Role-based access:
//   - student: flashcards, flipped classroom, periodic table
//   - teacher: flashcards management, flipped materials, exam parser
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../shared/auth/auth.middleware.js';
import { validateRequest } from '../../shared/validation/index.js';
import {
  createFlashcardDeckSchema,
  createFlashcardCardSchema,
  reviewFlashcardSchema,
  queryFlashcardDecksSchema,
  createFlippedMaterialSchema,
  queryFlippedMaterialsSchema,
  parseExamDocxSchema,
} from './smart-learning.schema.js';
import {
  // Flashcard endpoints
  listFlashcardDecks,
  createFlashcardDeck,
  getFlashcardDeck,
  createFlashcardCard,
  getStudyCards,
  getDeckStats,
  reviewFlashcard,
  // Flipped classroom endpoints
  getFlippedMaterial,
  createFlippedMaterial,
  listFlippedMaterials,
  // Periodic table endpoints
  getPeriodicTable,
  getElement,
  // Exam parser endpoints
  parseExamDocx,
} from './smart-learning.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARD ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/smart-learning/flashcards/decks — List decks
router.get(
  '/flashcards/decks',
  validateRequest({ query: queryFlashcardDecksSchema }),
  listFlashcardDecks
);

// POST /api/smart-learning/flashcards/decks — Create deck
router.post(
  '/flashcards/decks',
  validateRequest({ body: createFlashcardDeckSchema }),
  createFlashcardDeck
);

// GET /api/smart-learning/flashcards/decks/:id — Get deck with cards
router.get('/flashcards/decks/:id', getFlashcardDeck);

// POST /api/smart-learning/flashcards/decks/:id/cards — Create card
router.post(
  '/flashcards/decks/:id/cards',
  validateRequest({ body: createFlashcardCardSchema }),
  createFlashcardCard
);

// GET /api/smart-learning/flashcards/decks/:id/study — Get study session cards
router.get('/flashcards/decks/:id/study', getStudyCards);

// GET /api/smart-learning/flashcards/decks/:id/stats — Get deck stats
router.get('/flashcards/decks/:id/stats', getDeckStats);

// POST /api/smart-learning/flashcards/cards/:id/review — Review card (SM-2)
router.post(
  '/flashcards/cards/:id/review',
  validateRequest({ body: reviewFlashcardSchema }),
  reviewFlashcard
);

// ─────────────────────────────────────────────────────────────────────────────
// FLIPPED CLASSROOM ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/smart-learning/flipped/:timetableId — Get material for timetable entry
router.get('/flipped/:timetableId', getFlippedMaterial);

// POST /api/smart-learning/flipped/materials — Create flipped material
router.post(
  '/flipped/materials',
  validateRequest({ body: createFlippedMaterialSchema }),
  createFlippedMaterial
);

// GET /api/smart-learning/flipped/materials — List flipped materials
router.get(
  '/flipped/materials',
  validateRequest({ query: queryFlippedMaterialsSchema }),
  listFlippedMaterials
);

// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC TABLE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/smart-learning/periodic-table — Get all elements
router.get('/periodic-table', getPeriodicTable);

// GET /api/smart-learning/periodic-table/:atomicNumber — Get element
router.get('/periodic-table/:atomicNumber', getElement);

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PARSER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/smart-learning/parse-exam-docx — Parse exam document
router.post(
  '/parse-exam-docx',
  validateRequest({ body: parseExamDocxSchema }),
  parseExamDocx
);

export default router;
