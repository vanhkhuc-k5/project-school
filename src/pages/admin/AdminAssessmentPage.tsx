/**
 * Admin Academic Assessment Page
 * Phase 07 - Academic Assessment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Users, BookOpen, GraduationCap, ChevronRight, RefreshCw, Filter,
  Lock, Unlock, Eye
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface AssessmentOverview {
  assignments: { total_assignments: number; pending_assignments: number; past_assignments: number };
  submissions: { total_submissions: number; submitted: number; graded: number; late: number; missing: number };
  grades: { total_grades: number; draft_grades: number; published_grades: number };
  gradingProgress: number;
  ungradedSubmissions: number;
}

interface GradingProgress {
  classProgress: Array<{
    class_id: string;
    class_name: string;
    grade_level: number;
    total_grades: number;
    published_grades: number;
    progress_percent: number;
  }>;
  subjectProgress: Array<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    total_grades: number;
    published_grades: number;
    progress_percent: number;
  }>;
  teacherProgress: Array<{
    teacher_id: string;
    teacher_name: string;
    total_grades: number;
    published_grades: number;
    progress_percent: number;
  }>;
}

interface GradeAnalysis {
  gradeDistribution: Array<{ range: string; count: number }>;
  classAverages: Array<{
    class_id: string;
    class_name: string;
    grade_level: number;
    average_score: number;
    average_percent: number;
    grade_count: number;
  }>;
  subjectAverages: Array<{
    subject_id: string;
    subject_name: string;
    average_score: number;
    grade_count: number;
  }>;
  overallStats: {
    total_published_grades: number;
    overall_average: number;
    min_score: number;
    max_score: number;
  };
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============================================================================
// Toast Component
// ============================================================================

function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">✕</button>
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-[#1C6FA8]/30 border-t-[#1C6FA8] rounded-full animate-spin mb-4" />
      <span className="text-sm text-[#6B7280]">Đang tải dữ liệu...</span>
    </div>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({ label, value, icon: Icon, color, subtitle }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-[#0F3D5C]">{value}</div>
          <div className="text-xs text-[#6B7280]">{label}</div>
        </div>
      </div>
      {subtitle && <div className="text-sm text-[#6B7280]">{subtitle}</div>}
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

function ProgressBar({ percent, color = 'bg-[#1C6FA8]' }: { percent: number; color?: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

type TabId = 'overview' | 'progress' | 'analysis';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan', icon: TrendingUp },
  { id: 'progress', label: 'Tiến độ chấm điểm', icon: Clock },
  { id: 'analysis', label: 'Phân tích điểm', icon: GraduationCap },
];

export function AdminAssessmentPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Data states
  const [overview, setOverview] = useState<AssessmentOverview | null>(null);
  const [gradingProgress, setGradingProgress] = useState<GradingProgress | null>(null);
  const [gradeAnalysis, setGradeAnalysis] = useState<GradeAnalysis | null>(null);

  // Filters
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [semesterId, setSemesterId] = useState<string>('');

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        semesterId: semesterId || undefined,
      };

      const [overviewData, progressData, analysisData] = await Promise.all([
        api.getAssessmentOverview(params),
        api.getGradingProgress(params),
        api.getGradeAnalysis(params),
      ]);

      setOverview(overviewData);
      setGradingProgress(progressData);
      setGradeAnalysis(analysisData);
    } catch {
      showToast('error', 'Không thể tải dữ liệu đánh giá');
    } finally {
      setLoading(false);
    }
  }, [gradeLevel, semesterId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render Overview Tab
  const renderOverviewTab = () => {
    if (!overview) return null;

    return (
      <div className="space-y-6">
        {/* Assignment Stats */}
        <div>
          <h3 className="text-sm font-semibold text-[#374151] mb-3">Bài tập</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Tổng bài tập"
              value={overview.assignments.total_assignments}
              icon={FileText}
              color="text-blue-600"
            />
            <StatCard
              label="Đang chờ"
              value={overview.assignments.pending_assignments}
              icon={Clock}
              color="text-yellow-600"
            />
            <StatCard
              label="Đã qua hạn"
              value={overview.assignments.past_assignments}
              icon={AlertTriangle}
              color="text-red-600"
            />
          </div>
        </div>

        {/* Submission Stats */}
        <div>
          <h3 className="text-sm font-semibold text-[#374151] mb-3">Nộp bài</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Đã nộp"
              value={overview.submissions.submitted}
              icon={CheckCircle2}
              color="text-green-600"
            />
            <StatCard
              label="Đã chấm"
              value={overview.submissions.graded}
              icon={CheckCircle2}
              color="text-purple-600"
            />
            <StatCard
              label="Nộp muộn"
              value={overview.submissions.late}
              icon={Clock}
              color="text-yellow-600"
            />
            <StatCard
              label="Chưa nộp"
              value={overview.submissions.missing}
              icon={AlertTriangle}
              color="text-red-600"
            />
          </div>
        </div>

        {/* Grading Stats */}
        <div>
          <h3 className="text-sm font-semibold text-[#374151] mb-3">Chấm điểm</h3>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-[#0F3D5C]">{overview.gradingProgress}%</div>
                <div className="text-sm text-[#6B7280]">Tiến độ chấm điểm</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#374151]">
                  {overview.grades.published_grades} / {overview.grades.total_grades} điểm
                </div>
                <div className="text-xs text-[#6B7280]">
                  {overview.grades.draft_grades} bản nháp
                </div>
              </div>
            </div>
            <ProgressBar percent={overview.gradingProgress} />
          </div>
        </div>

        {/* Ungraded Alert */}
        {overview.ungradedSubmissions > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="font-medium text-yellow-800">
                {overview.ungradedSubmissions} bài chưa được chấm
              </div>
              <div className="text-sm text-yellow-700">
                Có bài nộp đang chờ giáo viên chấm điểm
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Progress Tab
  const renderProgressTab = () => {
    if (!gradingProgress) return null;

    return (
      <div className="space-y-6">
        {/* Class Progress */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Theo lớp</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {gradingProgress.classProgress.length === 0 ? (
              <div className="p-8 text-center text-[#6B7280]">Chưa có dữ liệu</div>
            ) : (
              gradingProgress.classProgress.map((item) => (
                <div key={item.class_id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#0F3D5C]">{item.class_name}</div>
                    <div className="text-xs text-[#6B7280]">Khối {item.grade_level}</div>
                  </div>
                  <div className="text-right w-48">
                    <div className="text-sm font-medium text-[#374151]">
                      {item.progress_percent}%
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {item.published_grades} / {item.total_grades} điểm
                    </div>
                  </div>
                  <div className="w-32">
                    <ProgressBar percent={item.progress_percent} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subject Progress */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Theo môn học</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {gradingProgress.subjectProgress.length === 0 ? (
              <div className="p-8 text-center text-[#6B7280]">Chưa có dữ liệu</div>
            ) : (
              gradingProgress.subjectProgress.map((item) => (
                <div key={item.subject_id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#0F3D5C]">{item.subject_name}</div>
                    <div className="text-xs text-[#6B7280]">{item.subject_code}</div>
                  </div>
                  <div className="text-right w-48">
                    <div className="text-sm font-medium text-[#374151]">
                      {item.progress_percent}%
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {item.published_grades} / {item.total_grades} điểm
                    </div>
                  </div>
                  <div className="w-32">
                    <ProgressBar percent={item.progress_percent} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teacher Progress */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Theo giáo viên</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {gradingProgress.teacherProgress.length === 0 ? (
              <div className="p-8 text-center text-[#6B7280]">Chưa có dữ liệu</div>
            ) : (
              gradingProgress.teacherProgress.map((item) => (
                <div key={item.teacher_id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8F2FA] flex items-center justify-center">
                      <span className="text-sm font-bold text-[#1C6FA8]">
                        {(item.teacher_name || 'GV').charAt(0)}
                      </span>
                    </div>
                    <div className="font-medium text-[#0F3D5C]">{item.teacher_name}</div>
                  </div>
                  <div className="text-right w-48">
                    <div className="text-sm font-medium text-[#374151]">
                      {item.progress_percent}%
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {item.published_grades} / {item.total_grades} điểm
                    </div>
                  </div>
                  <div className="w-32">
                    <ProgressBar percent={item.progress_percent} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Analysis Tab
  const renderAnalysisTab = () => {
    if (!gradeAnalysis) return null;

    return (
      <div className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Điểm TB toàn trường"
            value={gradeAnalysis.overallStats.overall_average.toFixed(2)}
            icon={TrendingUp}
            color="text-blue-600"
          />
          <StatCard
            label="Tổng điểm công bố"
            value={gradeAnalysis.overallStats.total_published_grades}
            icon={CheckCircle2}
            color="text-green-600"
          />
          <StatCard
            label="Điểm thấp nhất"
            value={gradeAnalysis.overallStats.min_score}
            icon={TrendingUp}
            color="text-red-600"
          />
          <StatCard
            label="Điểm cao nhất"
            value={gradeAnalysis.overallStats.max_score}
            icon={TrendingUp}
            color="text-green-600"
          />
        </div>

        {/* Grade Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Phân bố điểm</h3>
          </div>
          <div className="p-4">
            {gradeAnalysis.gradeDistribution.length === 0 ? (
              <div className="text-center text-[#6B7280] py-8">Chưa có dữ liệu</div>
            ) : (
              <div className="space-y-3">
                {gradeAnalysis.gradeDistribution.map((item) => {
                  const total = gradeAnalysis.gradeDistribution.reduce((sum, d) => sum + d.count, 0);
                  const percent = total > 0 ? (item.count / total * 100).toFixed(1) : '0';
                  return (
                    <div key={item.range} className="flex items-center gap-3">
                      <div className="w-40 text-sm text-[#374151]">{item.range}</div>
                      <div className="flex-1">
                        <ProgressBar percent={parseFloat(percent)} color="bg-blue-500" />
                      </div>
                      <div className="w-20 text-right text-sm text-[#6B7280]">
                        {item.count} ({percent}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Class Averages */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Điểm TB theo lớp</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151]">Lớp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151]">Khối</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151]">Điểm TB</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151]">Số điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeAnalysis.classAverages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">Chưa có dữ liệu</td>
                  </tr>
                ) : (
                  gradeAnalysis.classAverages.map((item) => (
                    <tr key={item.class_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#0F3D5C]">{item.class_name}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{item.grade_level}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F3D5C]">
                        {item.average_score.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">{item.grade_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subject Averages */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-[#0F3D5C]">Điểm TB theo môn học</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151]">Môn học</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151]">Điểm TB</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151]">Số điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeAnalysis.subjectAverages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[#6B7280]">Chưa có dữ liệu</td>
                  </tr>
                ) : (
                  gradeAnalysis.subjectAverages.map((item) => (
                    <tr key={item.subject_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#0F3D5C]">{item.subject_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F3D5C]">
                        {item.average_score.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">{item.grade_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Quản lý Đánh giá</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Quản lý Đánh giá Học tập</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Giám sát bài tập, nộp bài và tiến độ chấm điểm
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#1C6FA8] border-[#1C6FA8]'
                      : 'text-[#6B7280] border-transparent hover:text-[#374151] hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#6B7280]">Khối:</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              >
                <option value="">Tất cả</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Khối {g}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#6B7280]">Học kỳ:</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              >
                <option value="">Tất cả</option>
                <option value="sem_1">Học kỳ 1</option>
                <option value="sem_2">Học kỳ 2</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              className="ml-auto px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'progress' && renderProgressTab()}
            {activeTab === 'analysis' && renderAnalysisTab()}
          </>
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default AdminAssessmentPage;
