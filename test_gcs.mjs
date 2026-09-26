import * as repo from './server/modules/gradebook/gradebook.repository.js';

const gradeId = await repo.createGrade({
  data: {
    studentId: 'std_khang',
    subject: 'Toán',
    subjectId: 'sub_toan',
    classId: 'cls_10A1',
    rawScore: 7.5,
    maxScore: 10,
    academicYearId: 'ay_2024_2025',
    semesterId: 'sem_2024_1',
    status: 'draft',
  },
  teacherId: 'usr_teacher_1',
  schoolId: 'sch_bacau'
});
console.log('Created grade:', gradeId);
