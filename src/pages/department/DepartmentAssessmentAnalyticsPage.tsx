// =============================================================================
// DepartmentAssessmentAnalyticsPage — G39 Score Analytics
// Score analytics by teacher/class
// =============================================================================

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Target,
  Download,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

interface TeacherScore {
  teacherId: string;
  teacherName: string;
  avatar: string;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  gradedCount: number;
  totalStudents: number;
}

interface ClassScore {
  classId: string;
  className: string;
  avgScore: number;
  studentCount: number;
  excellentRate: number;
  passRate: number;
}

interface ScoreTrend {
  month: string;
  departmentAvg: number;
  schoolAvg: number;
}

const MOCK_TEACHERS: TeacherScore[] = [
  { teacherId: '1', teacherName: 'Nguyễn Thị Lan Anh', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120', avgScore: 8.5, trend: 'up', gradedCount: 142, totalStudents: 145 },
  { teacherId: '2', teacherName: 'Trần Văn Minh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120', avgScore: 7.8, trend: 'stable', gradedCount: 108, totalStudents: 112 },
  { teacherId: '3', teacherName: 'Phạm Quốc Hùng', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120', avgScore: 7.2, trend: 'down', gradedCount: 95, totalStudents: 98 },
  { teacherId: '4', teacherName: 'Lê Thị Hương', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120', avgScore: 8.2, trend: 'up', gradedCount: 178, totalStudents: 180 },
];

const MOCK_CLASSES: ClassScore[] = [
  { classId: '1', className: '10A1', avgScore: 8.4, studentCount: 42, excellentRate: 35, passRate: 98 },
  { classId: '2', className: '10A2', avgScore: 7.9, studentCount: 40, excellentRate: 28, passRate: 95 },
  { classId: '3', className: '11A1', avgScore: 7.5, studentCount: 43, excellentRate: 22, passRate: 93 },
  { classId: '4', className: '11A2', avgScore: 8.1, studentCount: 40, excellentRate: 30, passRate: 97 },
  { classId: '5', className: '12A1', avgScore: 8.3, studentCount: 42, excellentRate: 38, passRate: 98 },
];

const MOCK_TRENDS: ScoreTrend[] = [
  { month: 'T9', departmentAvg: 7.5, schoolAvg: 7.3 },
  { month: 'T10', departmentAvg: 7.6, schoolAvg: 7.4 },
  { month: 'T11', departmentAvg: 7.8, schoolAvg: 7.5 },
  { month: 'T12', departmentAvg: 7.7, schoolAvg: 7.4 },
  { month: 'T1', departmentAvg: 7.9, schoolAvg: 7.5 },
  { month: 'T2', departmentAvg: 8.0, schoolAvg: 7.6 },
];

export function DepartmentAssessmentAnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('hk1_2026');
  const [selectedGrade, setSelectedGrade] = useState('all');

  const departmentAvg = (MOCK_TEACHERS.reduce((acc, t) => acc + t.avgScore, 0) / MOCK_TEACHERS.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Khảo Thí & Phân Tích</h1>
          <p className="text-sm text-text-secondary mt-1">
            Thống kê và phân tích kết quả học tập theo giáo viên và lớp
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            <option value="hk1_2026">Học kỳ 1 - 2026</option>
            <option value="hk2_2026">Học kỳ 2 - 2026</option>
          </select>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{departmentAvg}</p>
          <p className="text-xs text-text-secondary">Điểm TB bộ môn</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-success">96%</p>
          <p className="text-xs text-text-secondary">Tỷ lệ đạt</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-success">+0.3</p>
          <p className="text-xs text-text-secondary">Tăng so với HK trước</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">523</p>
          <p className="text-xs text-text-secondary">Tổng học sinh</p>
        </Card>
      </div>

      {/* Score Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-text-primary">Xu hướng điểm số</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-ocean" />
              <span className="text-text-secondary">Bộ môn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-text-secondary" />
              <span className="text-text-secondary">Toàn trường</span>
            </div>
          </div>
        </div>
        <div className="h-48 flex items-end justify-between gap-2">
          {MOCK_TRENDS.map((item, index) => {
            const deptHeight = (item.departmentAvg / 10) * 100;
            const schoolHeight = (item.schoolAvg / 10) * 100;
            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  <div
                    className="w-6 bg-ocean rounded-t transition-all"
                    style={{ height: `${deptHeight}%` }}
                  />
                  <div
                    className="w-6 bg-text-secondary/40 rounded-t transition-all"
                    style={{ height: `${schoolHeight}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary">{item.month}</span>
                <span className="text-xs font-medium text-ocean">{item.departmentAvg}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher Performance */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Theo Giáo viên</h2>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Lọc
            </Button>
          </div>
          <div className="space-y-4">
            {MOCK_TEACHERS.map((teacher) => (
              <div key={teacher.teacherId} className="flex items-center gap-4 p-3 bg-surface-neutral rounded-lg">
                <img
                  src={teacher.avatar}
                  alt={teacher.teacherName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-text-primary truncate">{teacher.teacherName}</p>
                    <div className="flex items-center gap-2">
                      {teacher.trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
                      {teacher.trend === 'down' && <TrendingDown className="w-4 h-4 text-danger" />}
                      <span className={`text-lg font-semibold ${
                        teacher.avgScore >= 8 ? 'text-success' :
                        teacher.avgScore >= 7 ? 'text-ocean' :
                        teacher.avgScore >= 6 ? 'text-warning' : 'text-danger'
                      }`}>
                        {teacher.avgScore}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-text-secondary">
                      Đã chấm: {teacher.gradedCount}/{teacher.totalStudents} bài
                    </p>
                    <div className="w-20 h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ocean rounded-full"
                        style={{ width: `${(teacher.gradedCount / teacher.totalStudents) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Class Performance */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Theo Lớp</h2>
            <div className="flex gap-2">
              {[10, 11, 12, 'all'].map((grade) => (
                <Button
                  key={grade}
                  variant={selectedGrade === grade ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedGrade(grade as string)}
                >
                  {grade === 'all' ? 'Tất cả' : `Khối ${grade}`}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {MOCK_CLASSES.map((cls) => (
              <div key={cls.classId} className="p-3 bg-surface-neutral rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{cls.className}</Badge>
                    <span className="text-sm text-text-secondary">{cls.studentCount} HS</span>
                  </div>
                  <span className={`text-lg font-semibold ${
                    cls.avgScore >= 8 ? 'text-success' :
                    cls.avgScore >= 7 ? 'text-ocean' :
                    cls.avgScore >= 6 ? 'text-warning' : 'text-danger'
                  }`}>
                    {cls.avgScore}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-text-secondary">Giỏi</span>
                      <span className="font-medium text-success">{cls.excellentRate}%</span>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${cls.excellentRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-text-secondary">Đạt</span>
                      <span className="font-medium text-ocean">{cls.passRate}%</span>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ocean rounded-full"
                        style={{ width: `${cls.passRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-text-primary mb-4">Phân bố điểm toàn bộ môn</h2>
        <div className="space-y-3">
          {[
            { range: '9-10', count: 78, color: 'bg-success' },
            { range: '8-9', count: 156, color: 'bg-success/80' },
            { range: '7-8', count: 142, color: 'bg-ocean' },
            { range: '6-7', count: 98, color: 'bg-ocean/70' },
            { range: '5-6', count: 38, color: 'bg-warning' },
            { range: '<5', count: 11, color: 'bg-danger' },
          ].map((item) => {
            const percentage = (item.count / 523) * 100;
            return (
              <div key={item.range} className="flex items-center gap-4">
                <span className="w-12 text-sm text-text-secondary text-right">{item.range}</span>
                <div className="flex-1 h-8 bg-surface-neutral rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${item.color} rounded-lg transition-all flex items-center justify-end pr-3`}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-xs font-medium text-white">{item.count}</span>
                  </div>
                </div>
                <span className="w-12 text-sm text-text-secondary">{percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
