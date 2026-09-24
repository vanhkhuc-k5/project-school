/**
 * Admin Report Center Page
 * Phase 10 - Report Center
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, FileText, Download, Filter, Search,
  GraduationCap, Users, BookOpen, CalendarCheck, ClipboardList, Wallet,
  UserCheck, RefreshCw, Table, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  hasData: boolean;
  exportFormats: string[];
}

interface ReportFilters {
  academicYears: Array<{ id: string; name: string }>;
  semesters: Array<{ id: string; name: string; academic_year_id: string }>;
  classes: Array<{ id: string; name: string; grade_level: number }>;
  subjects: Array<{ id: string; name: string; code: string }>;
  teachers: Array<{ id: string; name: string; email: string }>;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============================================================================
// Icon Map
// ============================================================================

const IconMap: Record<string, React.ElementType> = {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Wallet,
  UserCheck,
  FileText,
};

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
// Report Card Component
// ============================================================================

function ReportCard({ report, onClick }: { report: ReportType; onClick: () => void }) {
  const Icon = IconMap[report.icon] || FileText;

  return (
    <button
      onClick={onClick}
      disabled={!report.hasData}
      className={`text-left w-full p-4 rounded-xl border transition-all ${
        report.hasData
          ? 'bg-white hover:shadow-md hover:border-blue-300 cursor-pointer'
          : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          report.hasData ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[#0F3D5C]">{report.name}</h4>
          <p className="text-sm text-[#6B7280] line-clamp-2 mt-1">{report.description}</p>
          {!report.hasData && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-yellow-600">
              <AlertTriangle className="w-3 h-3" /> Chưa có dữ liệu
            </span>
          )}
          {report.hasData && report.exportFormats.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {report.exportFormats.map((format) => (
                <span key={format} className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded uppercase">
                  {format}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Report View Component
// ============================================================================

function ReportView({ report, filters, onBack, onExport }: {
  report: ReportType;
  filters: ReportFilters;
  onBack: () => void;
  onExport: () => void;
}) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [selectedFilters, setSelectedFilters] = useState({
    gradeLevel: '',
    classId: '',
    semesterId: '',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.getReportData(report.id, {
        ...(selectedFilters.gradeLevel && { gradeLevel: parseInt(selectedFilters.gradeLevel) }),
        ...(selectedFilters.classId && { classId: selectedFilters.classId }),
        ...(selectedFilters.semesterId && { semesterId: selectedFilters.semesterId }),
        page,
        limit: 100,
      });
      setRecords(data.records);
      setPagination(data.pagination);
    } catch {
      showToast('error', 'Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  }, [report.id, selectedFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    const blob = await api.exportReport(report.id, {
      ...(selectedFilters.gradeLevel && { gradeLevel: parseInt(selectedFilters.gradeLevel) }),
      ...(selectedFilters.classId && { classId: selectedFilters.classId }),
    });
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${report.id}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Đã tải xuống báo cáo');
    } else {
      showToast('error', 'Không thể xuất báo cáo');
    }
  };

  const columns = records.length > 0 ? Object.keys(records[0]) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#6B7280] hover:text-[#1C6FA8]">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* Compact Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-[#374151]">Bộ lọc:</span>
          <select
            value={selectedFilters.gradeLevel}
            onChange={(e) => setSelectedFilters((f) => ({ ...f, gradeLevel: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          >
            <option value="">Tất cả khối</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>Khối {g}</option>
            ))}
          </select>
          <select
            value={selectedFilters.classId}
            onChange={(e) => setSelectedFilters((f) => ({ ...f, classId: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          >
            <option value="">Tất cả lớp</option>
            {filters.classes
              .filter((c) => !selectedFilters.gradeLevel || c.grade_level === parseInt(selectedFilters.gradeLevel))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          <button
            onClick={() => fetchData(1)}
            className="px-3 py-1.5 bg-[#1C6FA8] text-white rounded-lg text-sm hover:bg-[#0F3D5C]"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-[#374151]">
            {pagination.total} kết quả
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
            <p className="text-sm text-[#6B7280] mt-2">Đang tải dữ liệu...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <Table className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-[#6B7280] mt-2">Không có dữ liệu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2 text-[#374151] whitespace-nowrap">
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length > 50 && (
              <div className="p-3 text-center text-sm text-[#6B7280] border-t">
                Hiển thị 50/{records.length} dòng. Xuất CSV để xem đầy đủ.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => {}} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminReportCenterPage() {
  const navigate = useNavigate();
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    academicYears: [],
    semesters: [],
    classes: [],
    subjects: [],
    teachers: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [typesData, filtersData] = await Promise.all([
          api.getReportTypes(),
          api.getReportFilters(),
        ]);
        setReportTypes(typesData);
        setFilters(filtersData);
      } catch {
        showToast('error', 'Không thể tải danh sách báo cáo');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  // Group reports by category
  const groupedReports = reportTypes.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportType[]>);

  const categoryLabels: Record<string, string> = {
    students: 'Học sinh',
    classes: 'Lớp học',
    teachers: 'Giáo viên',
    attendance: 'Điểm danh',
    grades: 'Điểm số',
    assignments: 'Bài tập',
    parents: 'Phụ huynh',
    finance: 'Tài chính',
  };

  if (selectedReport) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-[#0F3D5C]">{selectedReport.name}</h2>
            <p className="text-sm text-[#6B7280] mt-1">{selectedReport.description}</p>
          </div>
          <ReportView
            report={selectedReport}
            filters={filters}
            onBack={() => setSelectedReport(null)}
            onExport={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Trung tâm Báo cáo</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Trung tâm Báo cáo</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Xem và xuất các báo cáo của trường
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#1C6FA8]/30 border-t-[#1C6FA8] rounded-full animate-spin mb-4" />
            <span className="text-sm text-[#6B7280]">Đang tải...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReports).map(([category, reports]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-[#374151] mb-3 uppercase">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onClick={() => setSelectedReport(report)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
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

export default AdminReportCenterPage;
