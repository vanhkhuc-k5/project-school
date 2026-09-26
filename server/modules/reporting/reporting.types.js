/**
 * G34 — Reporting Architecture
 * Stable Report DTOs and Types
 * 
 * These DTOs are designed to be stable APIs:
 * - Consistent field names across reports
 * - No leaking internal DB column names
 * - Proper null handling
 * - ISO date formats
 */

// ─────────────────────────────────────────────────────────────────────────────
// Common Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard pagination metadata
 */
export const PAGINATION_META = {
  page: 'number',      // Current page (1-indexed)
  limit: 'number',     // Items per page
  total: 'number',     // Total items
  totalPages: 'number', // Total pages
};

/**
 * Standard report metadata
 */
export function createReportMeta({ schoolId, academicYearId, semesterId, generatedAt = new Date().toISOString() }) {
  return {
    schoolId,
    academicYearId,
    semesterId,
    generatedAt,
    reportVersion: '1.0',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Student Academic Record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} StudentAcademicRecordHeader
 * @property {string} studentId
 * @property {string} studentCode
 * @property {string} studentName
 * @property {string} className
 * @property {string} gradeLevel
 * @property {string} academicYear
 * @property {number} overallGPA
 * @property {number} attendanceRate
 */

/**
 * @typedef {Object} SubjectGradeSummary
 * @property {string} subjectId
 * @property {string} subjectName
 * @property {string} subjectCode
 * @property {number} averageScore
 * @property {number} maxScore
 * @property {string} letterGrade
 * @property {number} creditHours
 */

/**
 * @typedef {Object} GradeEntry
 * @property {string} assignmentId
 * @property {string} assignmentTitle
 * @property {string} categoryName
 * @property {number} score
 * @property {number} maxScore
 * @property {number} percentage
 * @property {string} status - 'draft' | 'published'
 * @property {string} gradedAt
 */

// ─────────────────────────────────────────────────────────────────────────────
// Class Grade Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ClassGradeReportHeader
 * @property {string} classId
 * @property {string} className
 * @property {string} gradeLevel
 * @property {string} academicYear
 * @property {string} semesterName
 * @property {number} studentCount
 * @property {number} classAverage
 */

/**
 * @typedef {Object} StudentGradeSummary
 * @property {string} studentId
 * @property {string} studentCode
 * @property {string} studentName
 * @property {Object} subjectGrades - Map of subjectId -> SubjectGradeSummary
 * @property {number} averageScore
 * @property {string} rank
 * @property {string} status - 'active' | 'warning' | 'failing'
 */

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AttendanceSummary
 * @property {string} entityId - studentId or classId
 * @property {string} entityName
 * @property {number} totalDays
 * @property {number} presentDays
 * @property {number} absentDays
 * @property {number} lateDays
 * @property {number} excusedDays
 * @property {number} attendanceRate - percentage
 */

/**
 * @typedef {Object} AttendanceDetail
 * @property {string} date
 * @property {string} status - 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
 * @property {string|null} note
 * @property {string|null} subjectName
 */

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AssignmentSummary
 * @property {string} assignmentId
 * @property {string} title
 * @property {string} subjectName
 * @property {string} className
 * @property {string} dueDate
 * @property {string} status
 * @property {number} totalStudents
 * @property {number} submittedCount
 * @property {number} gradedCount
 * @property {number} averageScore
 * @property {number} completionRate - percentage
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enrollment Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EnrollmentSummary
 * @property {string} academicYearId
 * @property {string} academicYearName
 * @property {Object} byGrade - Array of { gradeLevel, classCount, studentCount }
 * @property {Object} byClass - Array of { classId, className, gradeLevel, studentCount, capacity }
 * @property {number} totalStudents
 * @property {number} totalClasses
 */

/**
 * @typedef {Object} EnrollmentChange
 * @property {string} date
 * @property {number} enrolledCount
 * @property {number} withdrawnCount
 * @property {number} transferredIn
 * @property {number} transferredOut
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tuition Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TuitionSummary
 * @property {string} academicYearId
 * @property {string} academicYearName
 * @property {number} totalInvoiced
 * @property {number} totalPaid
 * @property {number} totalOutstanding
 * @property {number} collectionRate - percentage
 * @property {Object} byClass - Array of { classId, className, invoiced, paid, outstanding }
 */

/**
 * @typedef {Object} TuitionDetail
 * @property {string} invoiceId
 * @property {string} studentName
 * @property {string} className
 * @property {number} amount
 * @property {number} paidAmount
 * @property {string} status - 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled'
 * @property {string} dueDate
 */

// ─────────────────────────────────────────────────────────────────────────────
// Report Query Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ReportQueryOptions
 * @property {string} schoolId - REQUIRED: School scope
 * @property {string} [academicYearId] - Filter by academic year
 * @property {string} [semesterId] - Filter by semester
 * @property {number} [gradeLevel] - Filter by grade (10-12)
 * @property {string} [classId] - Filter by class
 * @property {string} [studentId] - Filter by student
 * @property {string} [teacherId] - Filter by teacher
 * @property {string} [subjectId] - Filter by subject
 * @property {string} [startDate] - Date range start (ISO format)
 * @property {string} [endDate] - Date range end (ISO format)
 * @property {number} [page=1] - Page number
 * @property {number} [limit=50] - Items per page
 * @property {string} [sortBy] - Sort field
 * @property {string} [sortOrder='asc'] - Sort direction
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} data - Result array
 * @property {Object} pagination - Pagination metadata
 * @property {Object} meta - Report metadata
 */
