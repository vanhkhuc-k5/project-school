/**
 * Admin Data Operations Page
 * Phase 11 - Data Operations (Import/Export/Data Quality)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight, Upload, Download, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, FileSpreadsheet, Users, BookOpen, GraduationCap, AlertCircle,
  ChevronLeft, Eye, X, Search, Filter
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ImportResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  errors: Array<{ rowNumber: number; row: Record<string, unknown>; errors: Array<{ field: string; message: string }> }>;
  warnings: Array<{ rowNumber: number; row: Record<string, unknown>; warnings: Array<{ field: string; message: string }> }>;
  preview: Array<{ rowNumber: number; row: Record<string, unknown> }>;
}

interface QualityIssue {
  type: string;
  title: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
  records: Record<string, unknown>[];
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
// Import Wizard Component
// ============================================================================

function ImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [entityType, setEntityType] = useState<'students' | 'teachers'>('students');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const parseCSV = (text: string): Record<string, unknown>[] => {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      data.push(row);
    }

    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        showToast('error', 'File không có dữ liệu hoặc định dạng không hợp lệ');
        setParsing(false);
        return;
      }

      // Preview validation
      const preview = await api.importPreview(entityType, data);
      if (preview) {
        setResult(preview);
        setStep('preview');
      } else {
        showToast('error', 'Không thể xem trước dữ liệu');
      }
    } catch (err) {
      showToast('error', 'Không thể đọc file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = parseCSV(text);

      const commit = await api.importCommit(entityType, data);
      if (commit) {
        setCommitResult(commit);
        setStep('result');
        showToast('success', `Đã import ${commit.imported} bản ghi`);
      } else {
        showToast('error', 'Import thất bại');
      }
    } catch (err) {
      showToast('error', 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-[#0F3D5C]">Import Dữ liệu</h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Entity Type Selection */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Loại dữ liệu</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEntityType('students')}
                    className={`p-4 border rounded-xl text-left transition-colors ${
                      entityType === 'students'
                        ? 'border-[#1C6FA8] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <GraduationCap className="w-6 h-6 text-[#1C6FA8] mb-2" />
                    <div className="font-medium text-[#0F3D5C]">Học sinh</div>
                    <div className="text-xs text-[#6B7280]">Import danh sách học sinh</div>
                  </button>
                  <button
                    onClick={() => setEntityType('teachers')}
                    className={`p-4 border rounded-xl text-left transition-colors ${
                      entityType === 'teachers'
                        ? 'border-[#1C6FA8] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <BookOpen className="w-6 h-6 text-[#1C6FA8] mb-2" />
                    <div className="font-medium text-[#0F3D5C]">Giáo viên</div>
                    <div className="text-xs text-[#6B7280]">Import danh sách giáo viên</div>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Chọn file CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1C6FA8] transition-colors"
                >
                  {parsing ? (
                    <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-[#6B7280]">
                        Kéo thả file hoặc click để chọn
                      </div>
                      <div className="text-xs text-[#6B7280] mt-1">
                        Định dạng: CSV (tối đa 5MB, 10000 dòng)
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Template Download */}
              <button
                onClick={async () => {
                  const blob = await api.downloadImportTemplate(entityType);
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `template_${entityType}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('success', 'Đã tải template');
                  }
                }}
                className="text-sm text-[#1C6FA8] hover:underline"
              >
                Tải file mẫu (CSV)
              </button>
            </div>
          )}

          {step === 'preview' && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#0F3D5C]">{result.totalRows}</div>
                  <div className="text-xs text-[#6B7280]">Tổng dòng</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{result.validRows}</div>
                  <div className="text-xs text-[#6B7280]">Hợp lệ</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{result.warningRows}</div>
                  <div className="text-xs text-[#6B7280]">Cảnh báo</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{result.errorRows}</div>
                  <div className="text-xs text-[#6B7280]">Lỗi</div>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Lỗi ({result.errors.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-red-700">
                        Dòng {err.rowNumber}: {err.errors.map((e) => e.message).join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Cảnh báo ({result.warnings.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                    {result.warnings.slice(0, 5).map((warn, idx) => (
                      <div key={idx} className="text-yellow-700">
                        Dòng {warn.rowNumber}: {warn.warnings.map((w) => w.message).join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50 border-b">
                  <span className="text-sm font-medium text-[#374151]">Xem trước (10 dòng đầu)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        {result.preview[0] && Object.keys(result.preview[0].row).map((h) => (
                          <th key={h} className="px-3 py-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.preview.map((p) => (
                        <tr key={p.rowNumber}>
                          <td className="px-3 py-2 text-[#6B7280]">{p.rowNumber}</td>
                          {Object.values(p.row).map((v, idx) => (
                            <td key={idx} className="px-3 py-2">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('upload'); setFile(null); setResult(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || result.validRows === 0}
                  className="flex-1 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
                >
                  {importing ? 'Đang import...' : `Import ${result.validRows} dòng hợp lệ`}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && commitResult && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-[#0F3D5C] mb-2">Import hoàn tất!</h4>
              <div className="text-sm text-[#6B7280] space-y-1">
                <p>Đã import: <strong className="text-green-600">{commitResult.imported}</strong> bản ghi</p>
                <p>Đã bỏ qua: <strong className="text-yellow-600">{commitResult.skipped}</strong> bản ghi</p>
                <p>Lỗi: <strong className="text-red-600">{commitResult.errors}</strong> bản ghi</p>
              </div>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
              >
                Đóng
              </button>
            </div>
          )}
        </div>

        {/* Toasts */}
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Data Quality Panel Component
// ============================================================================

function DataQualityPanel({ onClose }: { onClose: () => void }) {
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await api.getDataQualityIssues();
        if (data) setIssues(data.issues);
      } catch {
        showToast('error', 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const totalIssues = issues.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0F3D5C]">Kiểm tra chất lượng dữ liệu</h3>
            <p className="text-sm text-[#6B7280]">{totalIssues} vấn đề được phát hiện</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
              <p className="text-sm text-[#6B7280] mt-2">Đang kiểm tra...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-green-600">Dữ liệu tốt!</h4>
              <p className="text-sm text-[#6B7280]">Không phát hiện vấn đề nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    issue.severity === 'error' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                    issue.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                    'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {issue.severity === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                      {issue.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                      {issue.severity === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                      <div>
                        <div className="font-medium text-[#0F3D5C]">{issue.title}</div>
                        <div className="text-xs text-[#6B7280]">{issue.type}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#0F3D5C]">{issue.count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issue Detail Modal */}
        {selectedIssue && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-bold text-[#0F3D5C]">{selectedIssue.title}</h4>
                <button onClick={() => setSelectedIssue(null)} className="hover:opacity-70"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedIssue.records[0] && Object.keys(selectedIssue.records[0]).map((k) => (
                        <th key={k} className="px-3 py-2 text-left">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedIssue.records.map((r, idx) => (
                      <tr key={idx}>
                        {Object.values(r).map((v, idx2) => (
                          <td key={idx2} className="px-3 py-2">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export Card Component
// ============================================================================

function ExportCard({ type, label, description, icon: Icon, onExport }: {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  onExport: () => void;
}) {
  return (
    <div className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-[#0F3D5C]">{label}</h4>
            <p className="text-sm text-[#6B7280]">{description}</p>
          </div>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminDataOperationsPage() {
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleExport = async (type: string) => {
    const blob = await api.exportData(type);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${type}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Đã tải xuống file CSV');
    } else {
      showToast('error', 'Không thể xuất dữ liệu');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Thao tác Dữ liệu</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Thao tác Dữ liệu</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Import, xuất dữ liệu và kiểm tra chất lượng
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3D5C]">Import Dữ liệu</h2>
                <p className="text-sm text-[#6B7280]">Tải lên file CSV để nhập liệu hàng loạt</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowImportWizard(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1C6FA8] transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-[#6B7280]">Click để bắt đầu import</div>
              </button>

              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium text-[#374151] mb-2">Hỗ trợ:</div>
                <ul className="space-y-1 text-[#6B7280]">
                  <li className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Học sinh
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Giáo viên
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Quality Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3D5C]">Kiểm tra chất lượng</h2>
                <p className="text-sm text-[#6B7280]">Phát hiện các vấn đề về dữ liệu</p>
              </div>
            </div>

            <button
              onClick={() => setShowDataQuality(true)}
              className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors"
            >
              <RefreshCw className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-sm text-[#6B7280]">Chạy kiểm tra chất lượng dữ liệu</div>
            </button>

            <div className="p-3 bg-gray-50 rounded-lg text-sm mt-3">
              <div className="font-medium text-[#374151] mb-2">Kiểm tra:</div>
              <ul className="space-y-1 text-[#6B7280] text-xs">
                <li>• Học sinh chưa phân lớp</li>
                <li>• Học sinh chưa liên kết phụ huynh</li>
                <li>• Lớp chưa có giáo viên chủ nhiệm</li>
                <li>• Giáo viên chưa được phân công</li>
                <li>• Mã trùng lặp</li>
                <li>• Thiếu trường bắt buộc</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F3D5C]">Xuất Dữ liệu</h2>
              <p className="text-sm text-[#6B7280]">Tải xuống dữ liệu hiện có (CSV)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ExportCard
              type="students"
              label="Học sinh"
              description="Danh sách học sinh"
              icon={GraduationCap}
              onExport={() => handleExport('students')}
            />
            <ExportCard
              type="teachers"
              label="Giáo viên"
              description="Danh sách giáo viên"
              icon={BookOpen}
              onExport={() => handleExport('teachers')}
            />
            <ExportCard
              type="classes"
              label="Lớp học"
              description="Danh sách lớp"
              icon={Users}
              onExport={() => handleExport('classes')}
            />
            <ExportCard
              type="subjects"
              label="Môn học"
              description="Danh sách môn học"
              icon={FileSpreadsheet}
              onExport={() => handleExport('subjects')}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImportWizard && <ImportWizard onClose={() => setShowImportWizard(false)} />}
      {showDataQuality && <DataQualityPanel onClose={() => setShowDataQuality(false)} />}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default AdminDataOperationsPage;
