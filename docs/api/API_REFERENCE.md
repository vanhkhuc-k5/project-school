# EduPortal API Documentation

**Base URL:** `https://api.eduportal.edu.vn` (production) or `http://localhost:5000` (development)  
**API Version:** v1  
**Authentication:** Bearer JWT Token

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users Management](#2-users-management)
3. [Profiles](#3-profiles)
4. [Academic Structure](#4-academic-structure)
5. [Enrollments](#5-enrollments)
6. [Assignments](#6-assignments)
7. [Submissions](#7-submissions)
8. [Gradebook](#8-gradebook)
9. [Attendance](#9-attendance)
10. [Announcements](#10-announcements)
11. [Notifications](#11-notifications)
12. [Messages](#12-messages)
13. [Leave Requests](#13-leave-requests)
14. [Tuition & Payments](#14-tuition--payments)
15. [Dashboard](#15-dashboard)
16. [Leadership](#16-leadership)
17. [Department Head](#17-department-head)
18. [Reports](#18-reports)
19. [Import/Export](#19-importexport)
20. [Audit](#20-audit)
21. [AI Tutor](#21-ai-tutor)
22. [Student Routes](#22-student-routes-legacy)
23. [Teacher Routes](#23-teacher-routes-legacy)
24. [Parent Routes](#24-parent-routes-legacy)
25. [Admin Routes](#25-admin-routes-legacy)
26. [Error Codes](#26-error-codes)

---

## Common Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes (for POST/PUT/PATCH) |
| `Authorization` | `Bearer <access_token>` | Yes (protected endpoints) |
| `X-Request-ID` | UUID | No (for request tracing) |

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Thông tin đầu vào không hợp lệ",
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" }
  ]
}
```

---

## 1. Authentication

**Base Path:** `/api/auth`

### 1.1 Login
```
POST /api/auth/login
```

**Rate Limited:** 10 requests per minute

**Request Body:**
```json
{
  "identifier": "hoainam",
  "password": "password123",
  "role": "admin"  // optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "usr_abc123",
    "username": "hoainam",
    "email": "hoainam@school.edu.vn",
    "role": "admin",
    "name": "Hoa Nam",
    "schoolId": "sch_bacau"
  }
}
```

**Error Responses:**
| Code | Status | Message |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Thông tin đăng nhập không chính xác |
| `RATE_LIMIT_EXCEEDED` | 429 | Quá nhiều yêu cầu đăng nhập |

---

### 1.2 Refresh Token
```
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "new_refresh_token...",
  "user": { ... }
}
```

---

### 1.3 Logout
```
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Request Body (optional):**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

---

### 1.4 Get Current User
```
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "usr_abc123",
    "username": "hoainam",
    "email": "hoainam@school.edu.vn",
    "role": "admin",
    "name": "Hoa Nam",
    "schoolId": "sch_bacau",
    "permissions": ["user.read", "user.create", ...]
  }
}
```

---

### 1.5 Change Password
```
POST /api/auth/change-password
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Validation Rules:**
- `currentPassword`: required, min 1 char
- `newPassword`: required, min 6 chars

**Success Response (200):**
```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công. Các phiên làm việc khác đã được đăng xuất an toàn."
}
```

---

### 1.6 Forgot Password
```
POST /api/auth/forgot-password
```

**Rate Limited:** 5 requests per minute

**Request Body:**
```json
{
  "email": "user@school.edu.vn"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."
}
```
*Note: Same message returned regardless of email existence to prevent enumeration.*

---

### 1.7 Reset Password
```
POST /api/auth/reset-password
```

**Rate Limited:** 5 requests per minute

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newPassword456"
}
```

**Validation Rules:**
- `token`: required, min 1 char
- `newPassword`: required, min 6 chars

**Success Response (200):**
```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."
}
```

**Error Responses:**
| Code | Status | Message |
|------|--------|---------|
| `BAD_REQUEST` | 400 | Mã đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng |
| `BAD_REQUEST` | 400 | Mã đặt lại mật khẩu đã hết hạn |

---

### 1.8 Register User (Admin Only)
```
POST /api/auth/register
```

**Headers:** `Authorization: Bearer <token>`  
**Permission:** `user.create`

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@school.edu.vn",
  "name": "New User",
  "role": "teacher",
  "code": "T001",
  "phone": "0909123456",
  "password": "password123"  // optional, auto-generated if omitted
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "usr_new123",
    "username": "newuser",
    "email": "newuser@school.edu.vn",
    "name": "New User",
    "role": "teacher"
  },
  "defaultPassword": "abc12345"
}
```

---

## 2. Users Management

**Base Path:** `/api/users`  
**Permission:** `user.read`, `user.create`, `user.update`, `user.disable`

### 2.1 List Users
```
GET /api/users
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | "" | Search by name, username, email, code, phone |
| `role` | string | "all" | Filter by role |
| `status` | string | "all" | Filter by status: active, disabled, locked |
| `schoolId` | string | - | Filter by school (super_admin only) |
| `sortBy` | string | "created_at" | Sort field: created_at, name, username, code |
| `sortOrder` | string | "desc" | Sort order: asc, desc |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "usr_abc123",
      "username": "hoainam",
      "email": "hoainam@school.edu.vn",
      "name": "Hoa Nam",
      "role": "admin",
      "status": "active",
      "schoolId": "sch_bacau",
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

### 2.2 Get User by ID
```
GET /api/users/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "username": "hoainam",
    "email": "hoainam@school.edu.vn",
    "name": "Hoa Nam",
    "role": "admin",
    "status": "active",
    "schoolId": "sch_bacau",
    "phone": "0909123456",
    "code": "ADMIN001",
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

---

### 2.3 Create User
```
POST /api/users
```

**Permission:** `user.create`

**Request Body:**
```json
{
  "name": "Nguyen Van A",
  "username": "nguyenvana",
  "email": "nguyenvana@school.edu.vn",
  "role": "teacher",
  "phone": "0909123456",
  "code": "T001",
  "password": "password123",
  "schoolId": "sch_bacau"
}
```

**Validation Rules:**
- `name`: required, 2-100 chars
- `username`: required, 3-50 chars, alphanumeric with ._- only
- `email`: optional, valid email format
- `role`: required, one of: super_admin, school_admin, admin, principal, vice_principal, department_head, teacher, student, parent
- `password`: optional, min 6 chars

---

### 2.4 Update User
```
PUT /api/users/:id
```

**Permission:** `user.update`

**Request Body:**
```json
{
  "name": "Nguyen Van B",
  "email": "nguyenvanb@school.edu.vn",
  "phone": "0912345678",
  "code": "T002"
}
```

---

### 2.5 Update User Status
```
PATCH /api/users/:id/status
```

**Permission:** `user.disable`

**Request Body:**
```json
{
  "status": "disabled",
  "reason": "User requested account suspension"
}
```

**Status Values:** `active`, `disabled`, `locked`

---

### 2.6 Assign Roles
```
PUT /api/users/:id/roles
```

**Permission:** `user.update`

**Request Body:**
```json
{
  "role": "teacher",
  "roles": ["teacher", "department_head"]
}
```

---

### 2.7 Reset Password
```
POST /api/users/:id/reset-password
```

**Permission:** `user.update`

**Request Body:**
```json
{
  "newPassword": "newPassword123",
  "mustChangePassword": true
}
```

---

### 2.8 Delete User
```
DELETE /api/users/:id
```

**Permission:** `user.disable`

**Note:** Users with academic history (students with grades, teachers with assignments) cannot be deleted.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Người dùng đã được xóa thành công"
}
```

**Error Response:**
```json
{
  "success": false,
  "code": "USER_HAS_HISTORY",
  "message": "Không thể xóa người dùng có lịch sử học vụ. Vui lòng vô hiệu hóa tài khoản."
}
```

---

## 3. Profiles

**Base Path:** `/api/profiles`

### 3.1 Teacher Profiles

#### Get My Teacher Profile
```
GET /api/profiles/teachers/me
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "tch_abc123",
    "userId": "usr_teacher1",
    "name": "Le Thi B",
    "email": "lethib@school.edu.vn",
    "department": "Toán",
    "phone": "0909123456",
    "subjects": ["Toán", "Tin học"]
  }
}
```

#### Update My Profile
```
PUT /api/profiles/teachers/me
```

**Request Body:**
```json
{
  "phone": "0912345678",
  "bio": "Giáo viên 10 năm kinh nghiệm"
}
```

#### List Teachers
```
GET /api/profiles/teachers
```

**Query Parameters:** Same as Users list

#### Get Teacher by ID
```
GET /api/profiles/teachers/:id
```

#### Create Teacher
```
POST /api/profiles/teachers
```

**Permission:** `teacher.manage`
**Roles:** admin, school_admin, super_admin, principal

#### Update Teacher
```
PUT /api/profiles/teachers/:id
```

---

### 3.2 Student Profiles

#### Get My Student Profile
```
GET /api/profiles/students/me
```

#### List Students
```
GET /api/profiles/students
```

#### Get Student by ID
```
GET /api/profiles/students/:id
```

#### Create Student
```
POST /api/profiles/students
```

#### Update Student
```
PUT /api/profiles/students/:id
```

#### Student Guardians
```
GET /api/profiles/students/:id/guardians
POST /api/profiles/students/:id/guardians
DELETE /api/profiles/students/:studentId/guardians/:parentId
```

---

### 3.3 Parent Profiles

#### Get My Parent Profile
```
GET /api/profiles/parents/me
```

#### List Parents
```
GET /api/profiles/parents
```

#### Get Parent by ID
```
GET /api/profiles/parents/:id
```

#### Create Parent
```
POST /api/profiles/parents
```

#### Update Parent
```
PUT /api/profiles/parents/:id
```

#### Get Parent's Children
```
GET /api/profiles/parents/:id/children
```

---

## 4. Academic Structure

**Base Path:** `/api/academic-structure`

### 4.1 Departments

#### List Departments
```
GET /api/academic-structure/departments
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name |
| `schoolId` | string | Filter by school (super_admin) |

#### Get Department
```
GET /api/academic-structure/departments/:id
```

#### Create Department
```
POST /api/academic-structure/departments
```

**Permission:** `class.manage`
**Roles:** admin, school_admin, super_admin, principal

**Request Body:**
```json
{
  "name": "Toán",
  "code": "MATH",
  "description": "Bộ môn Toán học",
  "headId": "tch_abc123"
}
```

#### Update Department
```
PUT /api/academic-structure/departments/:id
```

#### Delete Department
```
DELETE /api/academic-structure/departments/:id
```

---

### 4.2 Subjects

#### List Subjects
```
GET /api/academic-structure/subjects
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `departmentId` | string | Filter by department |
| `search` | string | Search by name |

#### Get Subject
```
GET /api/academic-structure/subjects/:id
```

#### Create Subject
```
POST /api/academic-structure/subjects
```

#### Update Subject
```
PUT /api/academic-structure/subjects/:id
```

#### Delete Subject
```
DELETE /api/academic-structure/subjects/:id
```

---

### 4.3 Classes

#### List Classes
```
GET /api/academic-structure/classes
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `academicYearId` | string | Filter by academic year |
| `gradeLevel` | number | Filter by grade (10, 11, 12) |
| `status` | string | Filter by status: active, archived |
| `search` | string | Search by name |

#### Get Class
```
GET /api/academic-structure/classes/:id
```

#### Create Class
```
POST /api/academic-structure/classes
```

**Request Body:**
```json
{
  "name": "10A1",
  "gradeLevel": 10,
  "academicYearId": "ay_2024_2025",
  "homeroomTeacherId": "tch_abc123",
  "maxCapacity": 45,
  "room": "P.101"
}
```

#### Update Class
```
PUT /api/academic-structure/classes/:id
```

#### Delete Class
```
DELETE /api/academic-structure/classes/:id
```

---

## 5. Enrollments

**Base Path:** `/api/enrollments`
**Permission:** `enrollment.manage`, `enrollment.read`

### 5.1 Enroll Student
```
POST /api/enrollments/enroll
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "classId": "cls_10a1",
  "academicYearId": "ay_2024_2025",
  "semesterId": "sem_1",
  "enrollmentDate": "2024-09-01"
}
```

### 5.2 Transfer Student
```
POST /api/enrollments/transfer
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "fromClassId": "cls_10a1",
  "toClassId": "cls_10a2",
  "effectiveDate": "2025-01-15",
  "reason": "Chuyển lớp theo nguyện vọng"
}
```

### 5.3 Withdraw Student
```
POST /api/enrollments/withdraw
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "classId": "cls_10a1",
  "withdrawalDate": "2025-06-15",
  "reason": "Chuyển trường"
}
```

### 5.4 Bulk Enroll
```
POST /api/enrollments/bulk
```

**Request Body:**
```json
{
  "classId": "cls_10a1",
  "studentIds": ["std_1", "std_2", "std_3"],
  "academicYearId": "ay_2024_2025",
  "semesterId": "sem_1"
}
```

### 5.5 Get Student Enrollment History
```
GET /api/enrollments/students/:studentId/history
```

### 5.6 Get Student Current Enrollment
```
GET /api/enrollments/students/:studentId/current
```

### 5.7 Get Class Roster
```
GET /api/enrollments/classes/:classId/roster
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `semesterId` | string | Filter by semester |
| `includeInactive` | boolean | Include withdrawn students |

---

## 6. Assignments

**Base Path:** `/api/assignments`
**Permission:** `assignment.read`, `assignment.create`, `assignment.grade`

### 6.1 List Assignments
```
GET /api/assignments
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `classId` | string | Filter by class |
| `subject` | string | Filter by subject |
| `status` | string | Filter by status: draft, published, archived |
| `academicYearId` | string | Filter by academic year |
| `page` | number | Page number |
| `limit` | number | Items per page |

### 6.2 Get Assignment
```
GET /api/assignments/:id
```

### 6.3 Create Assignment
```
POST /api/assignments
```

**Request Body:**
```json
{
  "title": "Bài tập Chương 3",
  "subject": "Toán",
  "classId": "cls_10a1",
  "type": "homework",
  "instructions": "Làm bài tập từ 1 đến 10",
  "dueDate": "2025-01-20",
  "dueTime": "23:59",
  "totalScore": 10,
  "durationMinutes": 60,
  "gradingScale": "Thang 10",
  "allowResubmit": true,
  "maxResubmitCount": 2
}
```

### 6.4 Update Assignment
```
PUT /api/assignments/:id
```

### 6.5 Publish Assignment
```
POST /api/assignments/:id/publish
```

**Request Body:**
```json
{
  "publishAt": "2025-01-15T08:00:00Z"  // optional, immediate if omitted
}
```

### 6.6 Delete Assignment
```
DELETE /api/assignments/:id
```

*Note: Only draft assignments can be deleted.*

### 6.7 Get Grading Queue
```
GET /api/assignments/grading-queue
```

*Returns assignments with pending submissions to grade.*

### 6.8 Grade Submission
```
POST /api/assignments/grade
```

**Request Body:**
```json
{
  "submissionId": "sub_abc123",
  "score": 8.5,
  "feedback": "Bài làm tốt, cần cải thiện phần giải thích"
}
```

---

## 7. Submissions

**Base Path:** `/api/submissions`

### 7.1 List Submissions
```
GET /api/submissions
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `assignmentId` | string | Filter by assignment |
| `studentId` | string | Filter by student |
| `status` | string | Filter by status |

### 7.2 Get Submission
```
GET /api/submissions/:id
```

### 7.3 Submit Assignment
```
POST /api/submissions
```

**Request Body:**
```json
{
  "assignmentId": "asg_abc123",
  "answers": [
    { "questionId": "q1", "answer": "A" },
    { "questionId": "q2", "answer": "B" }
  ]
}
```

---

## 8. Gradebook

**Base Path:** `/api/gradebook`
**Permission:** `grade.read`, `grade.create`, `grade.update`, `grade.publish`

### 8.1 List Grades
```
GET /api/gradebook/grades
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `studentId` | string | Filter by student |
| `classId` | string | Filter by class |
| `subject` | string | Filter by subject |
| `semesterId` | string | Filter by semester |
| `academicYearId` | string | Filter by academic year |

### 8.2 Get Grade
```
GET /api/gradebook/grades/:id
```

### 8.3 Create Grade
```
POST /api/gradebook/grades
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "subject": "Toán",
  "testName": "Giữa kỳ 1",
  "score": 8.5,
  "maxScore": 10,
  "categoryId": "cat_exam",
  "weight": 30,
  "semesterId": "sem_1",
  "academicYearId": "ay_2024_2025",
  "comment": "Bài làm tốt"
}
```

### 8.4 Update Grade (Draft Only)
```
PATCH /api/gradebook/grades/:id
```

### 8.5 Publish Grade
```
POST /api/gradebook/grades/:id/publish
```

### 8.6 Batch Publish Grades
```
POST /api/gradebook/grades/publish/batch
```

**Request Body:**
```json
{
  "gradeIds": ["grd_1", "grd_2", "grd_3"]
}
```

### 8.7 Calculate Student Grade
```
POST /api/gradebook/calculate/student
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "semesterId": "sem_1",
  "academicYearId": "ay_2024_2025"
}
```

### 8.8 Open Class Gradebook
```
GET /api/gradebook/class/:classId/students
```

*Returns all students in a class with their grade summaries.*

### 8.9 Bulk Enter Grades
```
POST /api/gradebook/grades/bulk
```

**Request Body:**
```json
{
  "classId": "cls_10a1",
  "subject": "Toán",
  "testName": "Giữa kỳ 1",
  "grades": [
    { "studentId": "std_1", "score": 8.5 },
    { "studentId": "std_2", "score": 7.0 }
  ]
}
```

### 8.10 Grade Categories
```
GET /api/gradebook/categories
POST /api/gradebook/categories
PATCH /api/gradebook/categories/:id
```

### 8.11 Calculation Configs
```
GET /api/gradebook/configs
POST /api/gradebook/configs
```

### 8.12 Grade Snapshots
```
GET /api/gradebook/snapshots
```

### 8.13 Grade Audit Trail
```
GET /api/gradebook/audit
```

---

## 9. Attendance

**Base Path:** `/api/attendance`
**Permission:** `attendance.read`, `attendance.take`, `attendance.correct`, `attendance.report`

### 9.1 Get My Attendance
```
GET /api/attendance/student
GET /api/attendance/my-history
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

### 9.2 Get Parent Child Attendance
```
GET /api/attendance/parent/child/:id
```

### 9.3 Get Class Roster
```
GET /api/attendance/roster
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `classId` | string | Class ID (required) |
| `date` | string | Date (YYYY-MM-DD, default today) |

### 9.4 Get Attendance Session
```
GET /api/attendance/sessions
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `classId` | string | Class ID (required) |
| `date` | string | Date (YYYY-MM-DD) |

### 9.5 Take Attendance
```
POST /api/attendance/sessions
POST /api/attendance/take
```

**Request Body:**
```json
{
  "classId": "cls_10a1",
  "date": "2025-01-15",
  "records": [
    { "studentId": "std_1", "status": "present" },
    { "studentId": "std_2", "status": "absent", "reason": "Óng" },
    { "studentId": "std_3", "status": "late", "minutesLate": 15 }
  ]
}
```

**Status Values:** `present`, `absent`, `late`, `excused`

### 9.6 Correct Attendance Record
```
PATCH /api/attendance/records/:id
```

**Request Body:**
```json
{
  "status": "excused",
  "reason": "Có giấy xác nhận của phụ huynh"
}
```

### 9.7 Attendance Report
```
GET /api/attendance/report
GET /api/attendance/stats
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `classId` | string | Filter by class |
| `startDate` | string | Start date |
| `endDate` | string | End date |
| `groupBy` | string | Group by: class, student, date |

---

## 10. Announcements

**Base Path:** `/api/announcements`
**Permission:** `announcement.read`, `announcement.create`, `announcement.update`, `announcement.publish`, `announcement.delete`

### 10.1 Get My Announcements
```
GET /api/announcements
GET /api/announcements/me
```

*Returns announcements relevant to the current user.*

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category |
| `status` | string | Filter by status |
| `page` | number | Page number |

### 10.2 Mark as Read
```
POST /api/announcements/me/read
```

**Request Body:**
```json
{
  "announcementIds": ["ann_1", "ann_2"]
}
```

### 10.3 List All Announcements (Admin)
```
GET /api/announcements/all
```

### 10.4 Get Announcement
```
GET /api/announcements/:id
```

### 10.5 Create Announcement
```
POST /api/announcements
```

**Request Body:**
```json
{
  "title": "Thông báo nghỉ lễ",
  "content": "Trường nghỉ lễ từ ngày...",
  "category": "academic",
  "priority": "normal",
  "targetRoles": ["student", "teacher"],
  "targetClassIds": ["cls_10a1"],
  "publishAt": "2025-01-15T08:00:00Z"
}
```

### 10.6 Update Announcement
```
PUT /api/announcements/:id
```

### 10.7 Publish Announcement
```
POST /api/announcements/:id/publish
```

### 10.8 Archive Announcement
```
POST /api/announcements/:id/archive
```

### 10.9 Delete Announcement
```
DELETE /api/announcements/:id
```

### 10.10 List Categories
```
GET /api/announcements/categories
```

---

## 11. Notifications

**Base Path:** `/api/notifications`

### 11.1 Get Notifications
```
GET /api/notifications
```

### 11.2 Get Unread Count
```
GET /api/notifications/unread-count
```

### 11.3 Mark as Read
```
POST /api/notifications/read
```

**Request Body:**
```json
{
  "notificationIds": ["notif_1", "notif_2"]
}
```

### 11.4 Mark All as Read
```
POST /api/notifications/read-all
```

---

## 12. Messages

**Base Path:** `/api/messages`
**Permission:** `message.send`, `message.read`

### 12.1 Get Conversations
```
GET /api/messages/conversations
```

### 12.2 Get Messages
```
GET /api/messages/conversations/:conversationId/messages
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Messages per page |
| `before` | string | Cursor for pagination |

### 12.3 Send Message
```
POST /api/messages/send
```

**Request Body:**
```json
{
  "recipientId": "usr_abc123",
  "content": "Nội dung tin nhắn",
  "priority": "normal"
}
```

### 12.4 Mark as Read
```
POST /api/messages/read
```

**Request Body:**
```json
{
  "messageIds": ["msg_1", "msg_2"]
}
```

---

## 13. Leave Requests

**Base Path:** `/api/leave-requests`
**Permission:** `leave_request.read`, `leave_request.create`, `leave_request.review`

### 13.1 Get Leave Requests
```
GET /api/leave-requests
```

*Filtered by role (students see own, parents see children's, staff see all).*

### 13.2 Get Pending Requests
```
GET /api/leave-requests/pending
```

*For staff with review permission.*

### 13.3 Get Leave Request
```
GET /api/leave-requests/:id
```

### 13.4 Get Student Requests
```
GET /api/leave-requests/students/:studentId
```

### 13.5 Create Leave Request
```
POST /api/leave-requests
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "startDate": "2025-01-20",
  "endDate": "2025-01-22",
  "reason": "Gia đình có việc",
  "type": "personal"
}
```

### 13.6 Cancel Leave Request
```
PATCH /api/leave-requests/:id/cancel
```

*Only the requester can cancel.*

### 13.7 Review Leave Request
```
PATCH /api/leave-requests/:id/review
```

**Request Body:**
```json
{
  "status": "approved",
  "comment": "Được nghỉ"
}
```

**Status Values:** `approved`, `rejected`

---

## 14. Tuition & Payments

**Base Path:** `/api/tuition`
**Permission:** `tuition.read`, `tuition.create`, `tuition.pay`

### 14.1 List Invoices
```
GET /api/tuition/invoices
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `studentId` | string | Filter by student |
| `status` | string | Filter by status: draft, issued, paid, cancelled |
| `semesterId` | string | Filter by semester |

### 14.2 Get Outstanding Summary
```
GET /api/tuition/invoices/summary
```

*Returns total outstanding for current user or their children.*

### 14.3 Get Invoice
```
GET /api/tuition/invoices/:id
```

### 14.4 Get Student Invoices
```
GET /api/tuition/invoices/students/:studentId
```

### 14.5 Create Invoice (Draft)
```
POST /api/tuition/invoices
```

**Request Body:**
```json
{
  "studentId": "std_abc123",
  "billingPeriod": "Học kỳ 1 năm học 2024-2025",
  "dueDate": "2025-02-15",
  "discount": 100000,
  "lineItems": [
    { "description": "Học phí", "quantity": 1, "unitPrice": 1500000 },
    { "description": "Phí bảo hiểm", "quantity": 1, "unitPrice": 150000 }
  ],
  "notes": "Thanh toán trước ngày đáo hạn"
}
```

### 14.6 Issue Invoice
```
PATCH /api/tuition/invoices/:id/issue
```

*Changes status from draft to issued.*

### 14.7 Record Payment
```
POST /api/tuition/invoices/:id/payments
```

**Request Body:**
```json
{
  "amount": 1650000,
  "method": "bank_transfer",
  "transactionId": "TXN123456",
  "paidAt": "2025-01-15T10:30:00Z"
}
```

### 14.8 Cancel Invoice
```
PATCH /api/tuition/invoices/:id/cancel
```

### 14.9 Payment Webhook (Public)
```
POST /api/payments/webhook/:provider
```

*No authentication required. Uses signature verification.*

### 14.10 Payment Health Check
```
GET /api/payments/health
```

---

## 15. Dashboard

**Base Path:** `/api/dashboard`

### 15.1 Get Dashboard Metrics
```
GET /api/dashboard/metrics
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `academicYearId` | string | Academic year |
| `period` | string | Period: week, month, semester, year |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalStudents": 500,
    "totalTeachers": 50,
    "avgAttendance": 95.5,
    "pendingAssignments": 12,
    "totalRevenue": 450000000,
    "collectionRate": 85.5
  }
}
```

### 15.2 Get Attendance Trends
```
GET /api/dashboard/attendance-trends
```

---

## 16. Leadership

**Base Path:** `/api/leadership`
**Roles:** principal, vice_principal, super_admin

### 16.1 Get Overview
```
GET /api/leadership/overview
```

### 16.2 Get Staff Management
```
GET /api/leadership/staff
```

### 16.3 Get Academic Overview
```
GET /api/leadership/academic
```

---

## 17. Department Head

**Base Path:** `/api/department-head`
**Roles:** department_head

### 17.1 Get Department Overview
```
GET /api/department-head/overview
```

### 17.2 Get Department Teachers
```
GET /api/department-head/teachers
```

### 17.3 Get Department Subjects
```
GET /api/department-head/subjects
```

### 17.4 Get Department Reports
```
GET /api/department-head/reports
```

---

## 18. Reports

**Base Path:** `/api/reports`
**Permission:** `grade.read`, `attendance.read`, `assignment.read`, `enrollment.read`, `tuition.read`

### 18.1 Dashboard Summary
```
GET /api/reports/dashboard
```

### 18.2 Student Academic Record
```
GET /api/reports/students/:studentId/academic-record
```

### 18.3 Class Grade Report
```
GET /api/reports/classes/:classId/grades
```

### 18.4 Attendance Report
```
GET /api/reports/attendance
```

### 18.5 Assignment Report
```
GET /api/reports/assignments
```

### 18.6 Enrollment Report
```
GET /api/reports/enrollment
```

### 18.7 Tuition Report
```
GET /api/reports/tuition
```

---

## 19. Import/Export

**Base Path:** `/api/import`, `/api/export`
**Permission:** `import.export`

### 19.1 Import Students
```
POST /api/import/students
```

**Request:** Multipart form with Excel/CSV file

### 19.2 Import Teachers
```
POST /api/import/teachers
```

### 19.3 Import Grades
```
POST /api/import/grades
```

### 19.4 Export Students
```
GET /api/export/students
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `classId` | string | Filter by class |
| `format` | string | Format: csv, xlsx |

### 19.5 Export Grades
```
GET /api/export/grades
```

### 19.6 Export Attendance
```
GET /api/export/attendance
```

---

## 20. Audit

**Base Path:** `/api/audit`
**Permission:** `audit.read`

### 20.1 Get Audit Logs
```
GET /api/audit
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Start date |
| `endDate` | string | End date |
| `userId` | string | Filter by user |
| `action` | string | Filter by action type |
| `resourceType` | string | Filter by resource type |

---

## 21. AI Tutor

**Base Path:** `/api/ai-tutor`
**Permission:** `ai_tutor.read`, `ai_tutor.chat`

### 21.1 Health Check
```
GET /api/ai-tutor/health
```

*No authentication required.*

### 21.2 Send Chat Message
```
POST /api/ai-tutor/chat
```

**Request Body:**
```json
{
  "message": "Giải thích bài toán: 2x + 5 = 15",
  "topic": "Toán Đại số",
  "context": {
    "classLevel": 8,
    "currentChapter": "Phương trình bậc nhất"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "msg_abc123",
    "text": "Để giải bài toán...",
    "topic": "Toán Đại số",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "rateLimit": {
      "remaining": 19,
      "resetAt": "2025-01-15T11:00:00Z"
    }
  }
}
```

### 21.3 Get Messages
```
GET /api/ai-tutor/messages
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `topic` | string | Filter by topic |
| `limit` | number | Messages per page |

### 21.4 Get Topics
```
GET /api/ai-tutor/topics
```

### 21.5 Clear Messages
```
DELETE /api/ai-tutor/messages
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `topic` | string | Clear specific topic |

### 21.6 Get Stats
```
GET /api/ai-tutor/stats
```

*Returns usage statistics for current user.*

### 21.7 Reset Rate Limit (Admin)
```
POST /api/ai-tutor/admin/reset-rate
```

**Request Body:**
```json
{
  "studentId": "std_abc123"
}
```

---

## 22. Student Routes (Legacy)

**Base Path:** `/api/student`

### 22.1 Dashboard
```
GET /api/student/dashboard
```

### 22.2 Assignments
```
GET /api/student/assignments
```

### 22.3 Assignment Details
```
GET /api/student/assignments/:id
```

### 22.4 Submit Assignment
```
POST /api/student/assignments/:id/submit
```

### 22.5 Submissions
```
GET /api/student/submissions
```

### 22.6 Submission Details
```
GET /api/student/submissions/:id
```

### 22.7 Grades
```
GET /api/student/grades
```

### 22.8 Timetable
```
GET /api/student/timetable
```

### 22.9 Attendance
```
GET /api/student/attendance
```

---

## 23. Teacher Routes (Legacy)

**Base Path:** `/api/teacher`

### 23.1 Dashboard
```
GET /api/teacher/dashboard
```

### 23.2 Classes
```
GET /api/teacher/classes
```

### 23.3 Class Students
```
GET /api/teacher/class/:classId/students
```

### 23.4 Assignments
```
GET /api/teacher/assignments
```

### 23.5 Create Assignment
```
POST /api/teacher/assignments
```

### 23.6 Grade Entry
```
POST /api/teacher/grades
```

### 23.7 Attendance
```
GET /api/teacher/attendance
POST /api/teacher/attendance/take
```

### 23.8 Messages
```
GET /api/teacher/messages
POST /api/teacher/messages/send
```

---

## 24. Parent Routes (Legacy)

**Base Path:** `/api/parent`

### 24.1 Dashboard
```
GET /api/parent/dashboard
```

### 24.2 Children
```
GET /api/parent/children
```

### 24.3 Child Grades
```
GET /api/parent/student/:studentId/grades
```

### 24.4 Child Attendance
```
GET /api/parent/student/:studentId/attendance
```

### 24.5 Child Assignments
```
GET /api/parent/student/:studentId/assignments
```

### 24.6 Messages
```
GET /api/parent/messages
POST /api/parent/messages/send
```

### 24.7 Leave Requests
```
GET /api/parent/leave-requests
POST /api/parent/leave-requests
```

### 24.8 Tuition
```
GET /api/parent/tuition
```

---

## 25. Admin Routes (Legacy)

**Base Path:** `/api/admin`

### 25.1 Dashboard
```
GET /api/admin/dashboard
```

### 25.2 Emergency Announcement
```
POST /api/admin/emergency-announcement
```

---

## 26. Error Codes

### Authentication Errors
| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 403 | Token is invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Authorization Errors
| Code | Status | Description |
|------|--------|-------------|
| `FORBIDDEN_PERMISSION` | 403 | Insufficient permissions |
| `FORBIDDEN_OWNERSHIP` | 403 | Not resource owner |
| `TENANT_FORBIDDEN` | 403 | Cross-tenant access denied |
| `ROLE_REQUIRED` | 403 | Role not authorized |

### Validation Errors
| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `BAD_REQUEST` | 400 | Malformed request |

### Resource Errors
| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `DUPLICATE_CLASS_NAME` | 400 | Class name already exists |

### Server Errors
| Code | Status | Description |
|------|--------|-------------|
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 10 requests | 1 minute |
| `/auth/forgot-password` | 5 requests | 1 minute |
| `/auth/reset-password` | 5 requests | 1 minute |
| `/ai-tutor/chat` | 20 requests | 1 hour |

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /api/users?page=2&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Filtering & Sorting

Common query parameters for list endpoints:

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search |
| `sortBy` | string | Field to sort by |
| `sortOrder` | string | asc or desc |
| `status` | string | Filter by status |
| `schoolId` | string | Filter by school |

---

**Last Updated:** 2026-09-23  
**API Version:** 1.0.0
