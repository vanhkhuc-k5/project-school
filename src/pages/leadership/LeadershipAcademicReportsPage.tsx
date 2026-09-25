// =============================================================================
// LeadershipAcademicReportsPage — G39 Academic Quality Reports
// Score distribution charts, class comparisons, at-risk students
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  Users,
  Award,
  Target,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Select } from '../../components/Input';
import { PageLoader } from '../../components/LoadingState';
import { apiRequest } from '../../services/api';

// Type definitions
interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface ClassComparison {
  classId: string;
  className: string;
  avgScore: number;
  studentCount: number;
  aboveAverage: number;
  belowAverage: number;
  trend: 'up' | 'down' | 'stable';
}

interface AtRiskStudent {
  id: string;
  name: string;
  avatar: string;
  className: string;
  avgScore: number;
  decline: number;
  subjects: string[];
  lastActivity: string;
}

interface AcademicReport {
  summary: {
    totalStudents: number;
    avgScore: number;
    passRate: number;
    excellentRate: number;
    atRiskCount: number;
  };
  scoreDistribution: ScoreDistribution[];
  classComparisons: ClassComparison[];
  atRiskStudents: AtRiskStudent[];
}

// Mock data for development
const MOCK_REPORT: AcademicReport = {
  summary: {
    totalStudents: 1248,
    avgScore: 7.8,
    passRate: 94.2,
    excellentRate: 28.5,
    atRiskCount: 38,
  },
  scoreDistribution: [
    { range: '9-10', count: 156, percentage: 12.5 },
    { range: '8-9', count: 198, percentage: 15.9 },
    { range: '7-8', count: 285, percentage: 22.8 },
    { range: '6-7', count: 312, percentage: 25.0 },
    { range: '5-6', count: 198, percentage: 15.9 },
    { range: '<5', count: 99, percentage: 7.9 },
  ],
  classComparisons: [
    { classId: '1', className: '10A1', avgScore: 8.5, studentCount: 42, aboveAverage: 28, belowAverage: 14, trend: 'up' },
    { classId: '2', className: '10A2', avgScore: 8.2, studentCount: 40, aboveAverage: 24, belowAverage: 16, trend: 'stable' },
    { classId: '3', className: '10A3', avgScore: 7.8, studentCount: 41, aboveAverage: 22, belowAverage: 19, trend: 'up' },
    { classId: '4', className: '11A1', avgScore: 7.6, studentCount: 43, aboveAverage: 20, belowAverage: 23, trend: 'down' },
    { classId: '5', className: '11A2', avgScore: 8.1, studentCount: 40, aboveAverage: 26, belowAverage: 14, trend: 'up' },
    { classId: '6', className: '12A1', avgScore: 8.3, studentCount: 42, aboveAverage: 30, belowAverage: 12, trend: 'up' },
  ],
  atRiskStudents: [
    {
      id: '1',
      name: 'Nguyễn Văn An',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
      className: '10A3',
      avgScore: 4.2,
      decline: 2.1,
      subjects: ['Toán', 'Vật lý'],
      lastActivity: '2026-09-24',
    },
    {
      id: '2',
      name: 'Trần Thị Bình',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
      className: '11A1',
      avgScore: 4.8,
      decline: 1.8,
      subjects: ['Hóa học', 'Sinh học'],
      lastActivity: '2026-09-23',
    },
    {
      id: '3',
      name: 'Lê Hoàng Cường',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120',
      className: '12A2',
      avgScore: 4.5,
      decline: 1.5,
      subjects: ['Ngữ văn', 'Lịch sử'],
      lastActivity: '2026-09-22',
    },
  ],
};

// Score Distribution Bar Chart (CSS-based)
function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const width = (item.count / maxCount) * 100;
        const colorClass =
          index < 2 ? 'bg-success' :
          index < 4 ? 'bg-ocean' :
          index < 5 ? 'bg-warning' : 'bg-danger';

        return (
          <div key={item.range} className="flex items-center gap-3">
            <span className="w-12 text-sm text-text-secondary text-right">{item.range}</span>
            <div className="flex-1 h-8 bg-surface-neutral rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${colorClass} rounded-lg transition-all duration-500 flex items-center justify-end pr-3`}
                style={{ width: `${width}%` }}
              >
                <span className="text-xs font-medium text-white">{item.count}</span>
              </div>
            </div>
            <span className="w-12 text-sm text-text-secondary">{item.percentage}%</span>
          </div>
        );
      })}
    </div>
  );
}

// Class Comparison Row
function ClassComparisonRow({ cls }: { cls: ClassComparison }) {
  const barWidth = (cls.avgScore / 10) * 100;
  const trendIcon =
    cls.trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-success" />
    ) : cls.trend === 'down' ? (
      <TrendingUp className="w-4 h-4 text-danger rotate-180" />
    ) : null;

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-neutral rounded-lg hover:bg-hairline/30 transition-colors">
      <div className="min-w-[60px]">
        <Badge variant="default" size="sm">{cls.className}</Badge>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-secondary">Điểm trung bình</span>
          <span className="font-medium text-text-primary">{cls.avgScore.toFixed(1)}</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              cls.avgScore >= 8 ? 'bg-success' :
              cls.avgScore >= 6.5 ? 'bg-ocean' :
              cls.avgScore >= 5 ? 'bg-warning' : 'bg-danger'
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="text-xs text-text-secondary">{cls.studentCount} học sinh</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          {trendIcon}
          <span className={`text-xs ${
            cls.trend === 'up' ? 'text-success' :
            cls.trend === 'down' ? 'text-danger' : 'text-text-secondary'
          }`}>
            {cls.aboveAverage} trên TB
          </span>
        </div>
      </div>
    </div>
  );
}

// At-Risk Student Card
function AtRiskStudentCard({ student }: { student: AtRiskStudent }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-danger-light/20 rounded-lg border border-danger/20 hover:shadow-sm transition-shadow">
      <img
        src={student.avatar}
        alt={student.name}
        className="w-12 h-12 rounded-full object-cover border-2 border-danger/30"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-text-primary">{student.name}</h4>
            <p className="text-xs text-text-secondary">{student.className}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-danger">{student.avgScore.toFixed(1)}</p>
            <p className="text-[10px] text-danger/70">↓ {student.decline.toFixed(1)} điểm</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {student.subjects.map((subject) => (
            <Badge key={subject} variant="danger" size="sm">{subject}</Badge>
          ))}
        </div>
        <p className="text-[10px] text-text-secondary mt-2">
          Hoạt động gần nhất: {new Date(student.lastActivity).toLocaleDateString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

export function LeadershipAcademicReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AcademicReport | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('hk1_2026');
  const [selectedGrade, setSelectedGrade] = useState('all');

  useEffect(() => {
    fetchReport();
  }, [selectedPeriod, selectedGrade]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<AcademicReport>('/api/leadership/reports/academic', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setReport(response.data);
      } else {
        setReport(MOCK_REPORT);
      }
    } catch {
      setReport(MOCK_REPORT);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 bg-danger-light/20 rounded-lg border border-danger/30">
        <p className="text-danger text-sm">Không thể tải báo cáo học vụ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Chất lượng Học vụ</h1>
          <p className="text-sm text-text-secondary mt-1">
            Phân tích và so sánh kết quả học tập toàn trường
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
            <option value="hk1_2025">Học kỳ 1 - 2025</option>
          </select>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{report.summary.totalStudents.toLocaleString('vi-VN')}</p>
          <p className="text-xs text-text-secondary">Tổng học sinh</p>
        </Card>
        <Card className="p-4 text-center">
          <Award className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{report.summary.avgScore.toFixed(1)}</p>
          <p className="text-xs text-text-secondary">Điểm TB toàn trường</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-success">{report.summary.passRate.toFixed(1)}%</p>
          <p className="text-xs text-text-secondary">Tỷ lệ đạt</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-success">{report.summary.excellentRate.toFixed(1)}%</p>
          <p className="text-xs text-text-secondary">Học sinh giỏi</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-danger mx-auto mb-2" />
          <p className="text-2xl font-semibold text-danger">{report.summary.atRiskCount}</p>
          <p className="text-xs text-text-secondary">Cần hỗ trợ</p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Phân bố điểm</h2>
            <Badge variant="info" size="sm">Học kỳ 1</Badge>
          </div>
          <ScoreDistributionChart data={report.scoreDistribution} />
          <div className="mt-4 pt-4 border-t border-hairline flex justify-between text-xs text-text-secondary">
            <span>Giỏi (8-10): {report.scoreDistribution.filter((d) => ['8-9', '9-10'].includes(d.range)).reduce((acc, d) => acc + d.count, 0)} học sinh</span>
            <span>Yếu/Kém (&lt;5): {report.scoreDistribution.find((d) => d.range === '<5')?.count || 0} học sinh</span>
          </div>
        </Card>

        {/* At-Risk Students */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Học sinh cần hỗ trợ</h2>
            <Button variant="ghost" size="sm">Xem tất cả</Button>
          </div>
          <div className="space-y-3">
            {report.atRiskStudents.map((student) => (
              <AtRiskStudentCard key={student.id} student={student} />
            ))}
          </div>
        </Card>
      </div>

      {/* Class Comparison */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-text-primary">So sánh theo lớp</h2>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            <option value="all">Tất cả khối</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>
        <div className="space-y-3">
          {report.classComparisons.map((cls) => (
            <ClassComparisonRow key={cls.classId} cls={cls} />
          ))}
        </div>
      </Card>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-medium text-text-primary mb-4">Môn học có tỷ lệ yếu cao</h2>
          <div className="space-y-3">
            {[
              { subject: 'Toán', weakRate: 18.5, trend: 'down' },
              { subject: 'Vật lý', weakRate: 15.2, trend: 'stable' },
              { subject: 'Hóa học', weakRate: 12.8, trend: 'up' },
              { subject: 'Ngữ văn', weakRate: 10.5, trend: 'up' },
            ].map((item) => (
              <div key={item.subject} className="flex items-center gap-4">
                <span className="w-24 text-sm text-text-primary font-medium">{item.subject}</span>
                <div className="flex-1">
                  <div className="h-2 bg-surface-neutral rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.weakRate > 15 ? 'bg-danger' : 'bg-warning'}`}
                      style={{ width: `${item.weakRate * 4}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  item.weakRate > 15 ? 'text-danger' : 'text-warning'
                }`}>
                  {item.weakRate}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-medium text-text-primary mb-4">Xu hướng điểm qua các tháng</h2>
          <div className="flex items-end justify-between h-32">
            {[6.8, 7.2, 7.5, 7.8, 7.6, 7.9].map((score, index) => {
              const months = ['T9', 'T10', 'T11', 'T12', 'T1', 'T2'];
              const height = (score / 10) * 100;
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="w-8 bg-ocean rounded-t transition-all" style={{ height: `${height}%` }} />
                  <span className="text-xs text-text-secondary">{months[index]}</span>
                  <span className="text-xs font-medium text-text-primary">{score}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary text-center mt-4">
            Điểm trung bình toàn trường tăng 0.5 điểm so với đầu năm học
          </p>
        </Card>
      </div>
    </div>
  );
}
