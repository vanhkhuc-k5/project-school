-- =============================================================================
-- Migration: 0037 - Smart Learning Hub: Flashcards, Flipped Classroom, Periodic Table
-- Phase: Student Smart Learning Features & Teacher Exam Parser Tools
-- Created: 2026-09-25
-- =============================================================================
-- This migration implements:
-- 1. Flashcard system with SM-2 spaced repetition algorithm
-- 2. Flipped classroom materials and warm-up quizzes
-- 3. Smart reference tools (formulas, periodic table data)
-- 4. Exam parsing data structures
-- =============================================================================

-- =============================================================================
-- FLASHCARD DECKS TABLE
-- Represents a collection of flashcards organized by subject/topic
-- =============================================================================
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL,
  subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name VARCHAR(100),
  grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deck_type VARCHAR(32) DEFAULT 'general' CHECK (deck_type IN (
    'general', 'vocabulary', 'formula', 'history', 'geography', 'science'
  )),
  is_system BOOLEAN DEFAULT FALSE, -- System decks vs user-created decks
  is_public BOOLEAN DEFAULT TRUE,  -- Shareable with class
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  card_count INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,  -- Number of students using this deck
  avg_success_rate DECIMAL(5,2),   -- Average mastery rate
  tags TEXT,                       -- JSON array of tags for search
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_school ON flashcard_decks(school_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject ON flashcard_decks(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_grade ON flashcard_decks(grade_level);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_created_by ON flashcard_decks(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_type ON flashcard_decks(deck_type);

-- =============================================================================
-- FLASHCARD CARDS TABLE
-- Individual flashcard with front/back content
-- Supports rich content: text, formulas (LaTeX), audio, images
-- =============================================================================
CREATE TABLE IF NOT EXISTS flashcard_cards (
  id VARCHAR(64) PRIMARY KEY,
  deck_id VARCHAR(64) NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  
  -- Front side (question/prompt)
  front_text TEXT NOT NULL,
  front_type VARCHAR(16) DEFAULT 'text' CHECK (front_type IN ('text', 'formula', 'image', 'mixed')),
  front_image_url VARCHAR(500),
  
  -- Back side (answer)
  back_text TEXT NOT NULL,
  back_type VARCHAR(16) DEFAULT 'text' CHECK (back_type IN ('text', 'formula', 'image', 'mixed')),
  back_image_url VARCHAR(500),
  
  -- English-specific fields
  phonetic VARCHAR(100),           -- IPA pronunciation: /ˈwɜːrd/
  audio_url VARCHAR(500),         -- TTS or recorded audio URL
  example_sentence TEXT,           -- Example sentence using the word
  
  -- Math/Science fields
  formula_latex VARCHAR(500),      -- LaTeX formula: E=mc^2
  formula_type VARCHAR(32),        -- 'equation', 'theorem', 'definition', 'constant'
  
  -- Hint
  hint TEXT,
  
  -- Card metadata
  difficulty INTEGER DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  tags TEXT,                       -- JSON array of tags
  
  -- Statistics
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck ON flashcard_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_difficulty ON flashcard_cards(difficulty);

-- =============================================================================
-- STUDENT FLASHCARD PROGRESS TABLE
-- SM-2 Spaced Repetition Algorithm Tracking
-- Fields: repetitions, ease_factor, interval_days, next_review_date
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_flashcard_progress (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  card_id VARCHAR(64) NOT NULL REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  deck_id VARCHAR(64) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  
  -- SM-2 Algorithm Fields
  repetitions INTEGER DEFAULT 0,           -- Number of successful reviews
  ease_factor DECIMAL(4,2) DEFAULT 2.5,   -- Difficulty multiplier (min 1.3)
  interval_days INTEGER DEFAULT 1,         -- Days until next review
  repetitions_in_row INTEGER DEFAULT 0,   -- Consecutive correct answers
  
  -- Review tracking
  next_review_date DATE NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  last_quality INTEGER,                   -- Last review quality (0-5)
  
  -- Statistics
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  total_response_time_ms INTEGER DEFAULT 0,
  
  -- Mastery level (derived from SM-2)
  mastery_level VARCHAR(16) DEFAULT 'new' CHECK (mastery_level IN (
    'new', 'learning', 'review', 'mastered'
  )),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (student_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_student ON student_flashcard_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_card ON student_flashcard_progress(card_id);
CREATE INDEX IF NOT EXISTS idx_progress_next_review ON student_flashcard_progress(next_review_date);
CREATE INDEX IF NOT EXISTS idx_progress_deck ON student_flashcard_progress(deck_id);

-- =============================================================================
-- FLIPPED CLASSROOM MATERIALS TABLE
-- Pre-class preparation materials linked to timetable entries
-- =============================================================================
CREATE TABLE IF NOT EXISTS flipped_classroom_materials (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL,
  class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name VARCHAR(100),
  timetable_entry_id VARCHAR(64),         -- Link to specific timetable period
  
  -- Material content
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Content URLs
  slide_url VARCHAR(500),                 -- Slide/presentation URL
  mindmap_url VARCHAR(500),               -- Mind map image URL
  video_url VARCHAR(500),                -- Pre-class video
  
  -- Summary content
  summary_text TEXT,                     -- Text summary of lesson
  key_points TEXT,                       -- JSON array of key points
  prerequisites TEXT,                     -- JSON array of prerequisite knowledge
  
  -- Warm-up quiz (3 questions)
  warmup_questions_json TEXT,            -- JSON array of warmup questions
  
  -- Visibility
  is_published BOOLEAN DEFAULT FALSE,
  available_from TIMESTAMPTZ,           -- When to show to students
  available_until TIMESTAMPTZ,          -- When to hide from students
  
  -- Statistics
  view_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),          -- % of students who viewed
  
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flipped_class ON flipped_classroom_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_flipped_subject ON flipped_classroom_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_flipped_timetable ON flipped_classroom_materials(timetable_entry_id);

-- =============================================================================
-- STUDENT FLIPPED MATERIAL VIEWS TABLE
-- Track which students have viewed/completed flipped materials
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_flipped_views (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_id VARCHAR(64) NOT NULL REFERENCES flipped_classroom_materials(id) ON DELETE CASCADE,
  
  viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Quiz results
  quiz_score INTEGER,
  quiz_completed BOOLEAN DEFAULT FALSE,
  quiz_answers_json TEXT,                -- JSON of student's answers
  
  UNIQUE (student_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_flipped_views_student ON student_flipped_views(student_id);
CREATE INDEX IF NOT EXISTS idx_flipped_views_material ON student_flipped_views(material_id);

-- =============================================================================
-- PERIODIC TABLE ELEMENTS TABLE
-- Reference data for interactive periodic table
-- =============================================================================
CREATE TABLE IF NOT EXISTS periodic_table_elements (
  atomic_number INTEGER PRIMARY KEY,
  symbol VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  name_vietnamese VARCHAR(50),
  atomic_mass DECIMAL(7,3),
  category VARCHAR(32) CHECK (category IN (
    'alkali_metal', 'alkaline_earth', 'transition_metal', 'post_transition_metal',
    'metalloid', 'nonmetal', 'halogen', 'noble_gas', 'lanthanide', 'actinide', 'unknown'
  )),
  group_number INTEGER,
  period_number INTEGER,
  electron_configuration VARCHAR(100),
  electronegativity DECIMAL(4,2),
  density DECIMAL(7,3),
  melting_point DECIMAL(7,2),
  boiling_point DECIMAL(7,2),
  discovered_year INTEGER,
  discovered_by VARCHAR(100),
  description TEXT
);

-- =============================================================================
-- EXAM PARSER QUEUE TABLE
-- Queue for processing uploaded exam documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_parser_queue (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL,
  
  -- File info
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  
  -- Processing status
  status VARCHAR(16) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  error_message TEXT,
  
  -- Parsed result
  parsed_questions_json TEXT,             -- JSON array of parsed questions
  questions_count INTEGER,
  parsing_confidence DECIMAL(5,2),        -- Confidence score 0-100%
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parser_queue_teacher ON exam_parser_queue(teacher_id);
CREATE INDEX IF NOT EXISTS idx_parser_queue_status ON exam_parser_queue(status);

-- =============================================================================
-- INSERT PERIODIC TABLE DATA (First 20 elements for demo)
-- =============================================================================
INSERT INTO periodic_table_elements (atomic_number, symbol, name, name_vietnamese, atomic_mass, category, group_number, period_number, electron_configuration, description) VALUES
(1, 'H', 'Hydrogen', 'Hiđro', 1.008, 'nonmetal', 1, 1, '1s¹', 'Khí hiếm nhẹ nhất, là nhiên liệu tên lửa'),
(2, 'He', 'Helium', 'Heli', 4.003, 'noble_gas', 18, 1, '1s²', 'Khí hiếm, được dùng trong khinh khí cầu'),
(3, 'Li', 'Lithium', 'Liti', 6.941, 'alkali_metal', 1, 2, '[He] 2s¹', 'Kim loại nhẹ nhất, dùng trong pin'),
(4, 'Be', 'Beryllium', 'Beri', 9.012, 'alkaline_earth', 2, 2, '[He] 2s²', 'Kim loại kiềm thổ nhẹ'),
(5, 'B', 'Boron', 'Bo', 10.81, 'metalloid', 13, 2, '[He] 2s² 2p¹', 'Phi kim, dùng trong thủy tinh'),
(6, 'C', 'Carbon', 'Cacbon', 12.011, 'nonmetal', 14, 2, '[He] 2s² 2p²', 'Nguyên tố của sự sống'),
(7, 'N', 'Nitrogen', 'Nitơ', 14.007, 'nonmetal', 15, 2, '[He] 2s² 2p³', 'Chiếm 78% khí quyển trái đất'),
(8, 'O', 'Oxygen', 'Oxi', 15.999, 'nonmetal', 16, 2, '[He] 2s² 2p⁴', 'Cần thiết cho sự cháy và hô hấp'),
(9, 'F', 'Fluorine', 'Flo', 18.998, 'halogen', 17, 2, '[He] 2s² 2p⁵', 'Halogen có tính oxi hóa mạnh nhất'),
(10, 'Ne', 'Neon', 'Neon', 20.180, 'noble_gas', 18, 2, '[He] 2s² 2p⁶', 'Khí hiếm, dùng trong đèn quảng cáo'),
(11, 'Na', 'Sodium', 'Natri', 22.990, 'alkali_metal', 1, 3, '[Ne] 3s¹', 'Kim loại kiềm, phản ứng mãnh liệt với nước'),
(12, 'Mg', 'Magnesium', 'Magie', 24.305, 'alkaline_earth', 2, 3, '[Ne] 3s²', 'Kim loại nhẹ, dùng trong hợp kim'),
(13, 'Al', 'Aluminium', 'Nhôm', 26.982, 'post_transition_metal', 13, 3, '[Ne] 3s² 3p¹', 'Kim loại nhẹ, dùng rộng rãi trong công nghiệp'),
(14, 'Si', 'Silicon', 'Silic', 28.086, 'metalloid', 14, 3, '[Ne] 3s² 3p²', 'Nguyên tố bán dẫn quan trọng'),
(15, 'P', 'Phosphorus', 'Photpho', 30.974, 'nonmetal', 15, 3, '[Ne] 3s² 3p³', 'Cần thiết cho sự sống, có trong DNA'),
(16, 'S', 'Sulfur', 'Lưu huỳnh', 32.065, 'nonmetal', 16, 3, '[Ne] 3s² 3p⁴', 'Dùng trong phân bón và thuốc nổ'),
(17, 'Cl', 'Chlorine', 'Clo', 35.453, 'halogen', 17, 3, '[Ne] 3s² 3p⁵', 'Halogen, dùng khử trùng nước'),
(18, 'Ar', 'Argon', 'Argon', 39.948, 'noble_gas', 18, 3, '[Ne] 3s² 3p⁶', 'Khí hiếm, dùng trong đèn chiếu sáng'),
(19, 'K', 'Potassium', 'Kali', 39.098, 'alkali_metal', 1, 4, '[Ar] 4s¹', 'Kim loại kiềm, dùng trong phân bón'),
(20, 'Ca', 'Calcium', 'Canxi', 40.078, 'alkaline_earth', 2, 4, '[Ar] 4s²', 'Kim loại kiềm thổ, có trong xương')
ON CONFLICT (atomic_number) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETED
-- =============================================================================
