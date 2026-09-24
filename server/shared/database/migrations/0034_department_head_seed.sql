-- ========================================================================
-- Migration 0034: G33 Department Head Module - Seed Data
-- Creates department head users and assigns them to departments.
-- ========================================================================

-- 1. Update existing teacher user to be department head of Math-IT department
-- This user (usr_teacher_1 / nguyenvana) will be the department head
UPDATE users
SET role = 'department_head'
WHERE id = 'usr_teacher_1' AND email = 'nguyenvana@school.edu.vn';

-- 2. Update departments to reference the head teachers
UPDATE departments
SET head_teacher_id = 'usr_teacher_1'
WHERE id = 'dept_math_it';

-- 3. Verify the setup
SELECT 
  d.id as department_id,
  d.name as department_name,
  d.head_teacher_id,
  u.name as head_teacher_name,
  u.email as head_teacher_email,
  u.role as user_role
FROM departments d
LEFT JOIN users u ON d.head_teacher_id = u.id
WHERE d.head_teacher_id IS NOT NULL;
