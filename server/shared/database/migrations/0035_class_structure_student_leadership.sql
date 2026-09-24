-- Migration: Class Groups, Group Members, and Student Leadership Positions
-- Phase 05: Class Structure & Student Leadership

-- =============================================================================
-- CLASS GROUPS TABLE
-- Represents study groups within a class (e.g., "Nhóm 1", "Nhóm A")
-- =============================================================================
CREATE TABLE IF NOT EXISTS class_groups (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  academic_year VARCHAR(32) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_id, name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_class_groups_class_id ON class_groups(class_id);
CREATE INDEX IF NOT EXISTS idx_class_groups_academic_year ON class_groups(academic_year);

-- =============================================================================
-- CLASS GROUP MEMBERS TABLE
-- Represents student membership in class groups
-- =============================================================================
CREATE TABLE IF NOT EXISTS class_group_members (
  id VARCHAR(64) PRIMARY KEY,
  group_id VARCHAR(64) NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (group_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_group_members_group_id ON class_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_class_group_members_student_id ON class_group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_class_group_members_active ON class_group_members(is_active);

-- =============================================================================
-- STUDENT CLASS POSITIONS TABLE
-- Represents leadership positions within a class (class_monitor, group_leader)
-- These are scoped positions, NOT global roles - role remains 'student'
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_class_positions (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  position_type VARCHAR(32) NOT NULL CHECK (position_type IN ('class_monitor', 'group_leader')),
  group_id VARCHAR(64) REFERENCES class_groups(id) ON DELETE SET NULL,  -- NULL for class_monitor
  academic_year VARCHAR(32) NOT NULL,
  semester_id VARCHAR(64),  -- NULL if position applies to full year
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(16) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'removed')),
  assigned_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, class_id, position_type, academic_year, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_student_positions_student_id ON student_class_positions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_positions_class_id ON student_class_positions(class_id);
CREATE INDEX IF NOT EXISTS idx_student_positions_type ON student_class_positions(position_type);
CREATE INDEX IF NOT EXISTS idx_student_positions_academic_year ON student_class_positions(academic_year);

-- =============================================================================
-- INSERT SAMPLE DATA FOR TESTING
-- =============================================================================

-- Sample class groups
INSERT INTO class_groups (id, class_id, name, description, academic_year)
SELECT 
  'grp_' || substr(md5(random()::text), 1, 8),
  c.id,
  'Nhóm ' || (ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY c.id))::text,
  'Nhóm học tập số ' || (ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY c.id))::text,
  c.academic_year
FROM classes c
WHERE c.academic_year = '2025-2026'
  AND NOT EXISTS (SELECT 1 FROM class_groups WHERE class_id = c.id)
LIMIT 10
ON CONFLICT DO NOTHING;

-- =============================================================================
-- POSITION TYPE CONSTANTS (for reference)
-- =============================================================================
-- 'class_monitor' : Biên chế lớp - full class responsibility
-- 'group_leader'  : Nhóm trưởng - group-specific leadership
