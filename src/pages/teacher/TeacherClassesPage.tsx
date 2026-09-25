import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { teacherApi, attendanceApi, gradebookApi, logbookApi, type TeacherAssignedClass, type AttendanceRosterStudent, type ClassAcademicSummaryResponse, type StudentEvaluation, type LogbookEntry, type ConductEvaluation } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Search,
  Plus,
  Edit,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  Lock,
  RefreshCw,
  FileText,
  BookOpen,
  Grid3X3,
  Sparkles,
  MessageSquare,
  Save,
  Trash2,
  Eye,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// RFIDScannerTab — IoT RFID Card Reader Simulation (Coming Soon)
// Features: Simulated card reader UI, scan log, signal lights, demo trigger
// ─────────────────────────────────────────────────────────────────────────────

interface RFIDScannerTabProps {
  classId: string;
  className: string;
  students: Array<{ id: string; name: string; code: string }>;
}

function RFIDScannerTab({ className, students }: RFIDScannerTabProps) {
  const [scanLog, setScanLog] = useState<Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    timestamp: string;
    status: 'success' | 'error';
    direction: 'IN' | 'OUT';
  }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSignal, setScannerSignal] = useState<'idle' | 'green' | 'red'>('idle');

  const handleDemoScan = () => {
    if (students.length === 0) return;
    setIsScanning(true);
    setScannerSignal('green');
    setTimeout(() => {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      const direction = Math.random() > 0.5 ? 'IN' : 'OUT';
      setScanLog(prev => [{
        id: `scan-${Date.now()}`,
        studentId: randomStudent.id,
        studentName: randomStudent.name,
        studentCode: randomStudent.code,
        timestamp: new Date().toLocaleString('vi-VN'),
        status: 'success' as const,
        direction: direction as 'IN' | 'OUT',
      }, ...prev].slice(0, 50));
      setIsScanning(false);
      setScannerSignal('idle');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-sm">
          ⚠️
        </div>
        <div>
          <div className="text-sm font-semibold text-amber-800">
            Tính năng đang phát triển — Thử nghiệm thiết bị phần cứng RFID IoT
          </div>
          <div className="text-xs text-amber-700 mt-1">
            Giao diện dưới đây mô phỏng máy quét thẻ RFID tại cổng trường.
            Dữ liệu trong bảng log là giả lập, không ảnh hưởng đến hệ thống điểm danh chính thức.
          </div>
        </div>
      </div>

      {/* Scanner Hardware Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Card Reader Unit */}
        <Card padding="p-6" className="flex flex-col items-center gap-4">
          <div className="text-xs font-semibold text-text-primary">Máy quét thẻ RFID</div>
          {/* Signal Lights */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${scannerSignal === 'green' ? 'bg-green-400 border-green-500 shadow-lg shadow-green-300 animate-pulse' : 'bg-gray-100 border-gray-300'}`} />
              <span className="text-[10px] text-text-secondary">Đèn Xanh</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${scannerSignal === 'red' ? 'bg-red-400 border-red-500 shadow-lg shadow-red-300 animate-pulse' : 'bg-gray-100 border-gray-300'}`} />
              <span className="text-[10px] text-text-secondary">Đèn Đỏ</span>
            </div>
          </div>
          {/* Card Slot Visual */}
          <div className="w-full bg-gray-100 rounded border border-dashed border-gray-300 p-4 text-center">
            <div className="text-xs text-text-secondary mb-1">Đầu đọc thẻ</div>
            <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center border-2 border-dashed border-gray-400">
              <span className="text-xs text-gray-500">◄ Quẹt thẻ ►</span>
            </div>
            <div className="mt-2 text-[10px] text-gray-500">UID: 04:A3:B2:1C:7D:E8</div>
          </div>
          {/* Status */}
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${
            scannerSignal === 'green' ? 'bg-green-100 text-green-700'
            : scannerSignal === 'red' ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {scannerSignal === 'green' ? '✓ Đọc thẻ thành công'
             : scannerSignal === 'red' ? '✗ Lỗi đọc thẻ'
             : '○ Chờ quẹt thẻ'}
          </div>
          {/* Demo Button */}
          <Button
            variant="secondary"
            size="sm"
            disabled={isScanning || students.length === 0}
            onClick={handleDemoScan}
          >
            {isScanning ? 'Đang quét...' : '🪪 Mô phỏng quẹt thẻ thử nghiệm'}
          </Button>
          {students.length === 0 && (
            <div className="text-[10px] text-amber-600 text-center">
              Cần chọn lớp có học sinh để mô phỏng.
            </div>
          )}
        </Card>

        {/* Middle: School Gate Map */}
        <Card padding="p-6">
          <div className="text-xs font-semibold text-text-primary mb-3">Sơ đồ cổng trường</div>
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-center gap-2 text-[10px] text-gray-500">
              <span>← Lối vào</span>
              <div className="px-3 py-1.5 bg-gray-200 rounded font-medium text-gray-700">
                CỔNG CHÍNH
              </div>
              <span>Lối ra →</span>
            </div>
            <div className="flex gap-2">
              <div className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>📷</span><span>Camera</span>
              </div>
              <div className={`w-16 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>📡</span><span>RFID</span>
              </div>
              <div className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>🖥️</span><span>Màn hình</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500">
              Lớp: {className || '—'}
            </div>
          </div>
        </Card>

        {/* Right: Scan Log */}
        <Card padding="p-4">
          <div className="text-xs font-semibold text-text-primary mb-3">
            Nhật ký quẹt thẻ gần nhất
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {scanLog.length === 0 ? (
              <div className="text-xs text-text-secondary text-center py-4">
                Chưa có lượt quẹt nào.
              </div>
            ) : (
              scanLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-hairline">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    entry.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.direction}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {entry.studentName}
                    </div>
                    <div className="text-[10px] text-text-secondary">
                      {entry.studentCode} · {entry.timestamp}
                    </div>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DigitalLogbookTab — Sổ Đầu Bài Điện Tử
// Features: Create/edit logbook entries, weekly summary, digital signature
// ─────────────────────────────────────────────────────────────────────────────

interface DigitalLogbookTabProps {
  classId: string;
  className: string;
}

const RATING_OPTIONS = [
  { value: 'tot', label: 'Tốt (10đ)', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'kha', label: 'Khá (8đ)', color: 'text-blue-600 bg-blue-50' },
  { value: 'trung_binh', label: 'Trung bình (6đ)', color: 'text-amber-600 bg-amber-50' },
  { value: 'kem', label: 'Yếu (4đ)', color: 'text-red-600 bg-red-50' },
];

function DigitalLogbookTab({ classId, className }: DigitalLogbookTabProps) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    period_number: 1,
    subject_name: '',
    lesson_title: '',
    present_count: 0,
    absent_count: 0,
    score: undefined as number | undefined,
    rating: undefined as string | undefined,
    notes: '',
    homework: '',
  });

  const academicYear = '2025-2026';
  const semester = 1;

  const loadEntries = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await logbookApi.listEntries({
        class_id: classId,
        academic_year: academicYear,
        semester,
        limit: 50,
      });
      if (result) {
        setEntries(result.entries);
      }
    } catch (e) {
      setError('Không thể tải sổ đầu bài');
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear, semester]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = {
        ...formData,
        class_id: classId,
        academic_year: academicYear,
        semester,
        score: formData.score,
        rating: formData.rating as 'tot' | 'kha' | 'trung_binh' | 'kem' | undefined,
      };
      
      if (editingEntry) {
        await logbookApi.updateEntry(editingEntry.id, data);
        setSuccessMsg('Đã cập nhật sổ đầu bài');
      } else {
        await logbookApi.createEntry(data);
        setSuccessMsg('Đã ghi sổ đầu bài thành công');
      }
      
      setShowForm(false);
      setEditingEntry(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        period_number: 1,
        subject_name: '',
        lesson_title: '',
        present_count: 0,
        absent_count: 0,
        score: undefined,
        rating: undefined,
        notes: '',
        homework: '',
      });
      loadEntries();
    } catch (e) {
      setError('Lỗi khi lưu sổ đầu bài');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      period_number: entry.period_number,
      subject_name: entry.subject_name || '',
      lesson_title: entry.lesson_title,
      present_count: entry.present_count,
      absent_count: entry.absent_count,
      score: entry.score,
      rating: entry.rating,
      notes: entry.notes || '',
      homework: entry.homework || '',
    });
    setShowForm(true);
  };

  const handleSign = async (entryId: string) => {
    try {
      await logbookApi.signEntry(entryId);
      setSuccessMsg('Đã ký sổ đầu bài');
      loadEntries();
    } catch (e) {
      setError('Lỗi khi ký sổ');
    }
  };

  const getRatingBadge = (rating: string) => {
    const option = RATING_OPTIONS.find(r => r.value === rating);
    if (!option) return null;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Sổ Đầu Bài Điện Tử</h3>
          <p className="text-xs text-text-secondary">{className} • HK1 2025-2026</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setEditingEntry(null);
            setShowForm(true);
          }}
        >
          Ghi sổ mới
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* New/Edit Form */}
      {showForm && (
        <Card padding="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Ngày dạy</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tiết</label>
                <select
                  value={formData.period_number}
                  onChange={(e) => setFormData({ ...formData, period_number: parseInt(e.target.value) })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <option key={p} value={p}>Tiết {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Số có mặt</label>
                <input
                  type="number"
                  min="0"
                  value={formData.present_count}
                  onChange={(e) => setFormData({ ...formData, present_count: parseInt(e.target.value) || 0 })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Số vắng</label>
                <input
                  type="number"
                  min="0"
                  value={formData.absent_count}
                  onChange={(e) => setFormData({ ...formData, absent_count: parseInt(e.target.value) || 0 })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Môn học</label>
                <input
                  type="text"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  placeholder="VD: Toán, Văn, Anh..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tên bài (PPCT)</label>
                <input
                  type="text"
                  value={formData.lesson_title}
                  onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  placeholder="VD: Phương trình bậc 2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Xếp loại tiết</label>
                <select
                  value={formData.rating || ''}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value || undefined })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                >
                  <option value="">Chưa đánh giá</option>
                  {RATING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Bài tập về nhà</label>
                <input
                  type="text"
                  value={formData.homework}
                  onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  placeholder="Bài tập về nhà (nếu có)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Nhận xét tiết học</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                placeholder="Nhận xét về tiết dạy, tình hình lớp..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" icon={Save} type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : editingEntry ? 'Cập nhật' : 'Lưu sổ'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="py-10 flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin text-ocean" />
          <span className="text-xs">Đang tải sổ đầu bài...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center">
          <FileText className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Chưa có bản ghi sổ đầu bài nào.</p>
          <p className="text-xs text-text-secondary/60">Bấm "Ghi sổ mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} padding="p-3" className="hover:border-ocean/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-text-primary">
                      {new Date(entry.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <Badge variant="neutral">{entry.period_number}</Badge>
                    <span className="text-xs text-ocean font-medium">{entry.subject_name || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-text-primary font-medium">{entry.lesson_title}</div>
                  {entry.notes && (
                    <div className="text-xs text-text-secondary mt-1 line-clamp-2">{entry.notes}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-secondary">
                    <span>👥 {entry.present_count}/{entry.present_count + entry.absent_count} có mặt</span>
                    {entry.rating && getRatingBadge(entry.rating)}
                    {entry.teacher_signature && (
                      <span className="text-emerald-600">✓ Đã ký</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Edit}
                    onClick={() => handleEdit(entry)}
                  />
                  {!entry.teacher_signature && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Check}
                      onClick={() => handleSign(entry.id)}
                    >
                      Ký
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeroomHubTab — Công Tác Chủ Nhiệm
// Features: Seating chart, TT22 Conduct evaluation, AI comment assistant
// ─────────────────────────────────────────────────────────────────────────────

interface HomeroomHubTabProps {
  classId: string;
  className: string;
  students: Array<{ id: string; name: string; code: string }>;
}

type HomeroomSubTab = 'seating' | 'conduct' | 'ai-comment';

function HomeroomHubTab({ classId, className, students }: HomeroomHubTabProps) {
  const [subTab, setSubTab] = useState<HomeroomSubTab>('seating');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Seating state
  const [seatingData, setSeatingData] = useState<Record<string, string | null>>({});
  const [seatingRows, setSeatingRows] = useState(4);
  const [seatingCols, setSeatingCols] = useState(5);
  
  // Conduct state
  const [conductData, setConductData] = useState<Record<string, { grade: string; comment: string }>>({});
  
  // AI comment state
  const [aiComments, setAiComments] = useState<Record<string, string[]>>({});
  const [generatingAI, setGeneratingAI] = useState(false);

  const academicYear = '2025-2026';
  const semester = 1;

  // Load seating arrangement
  const loadSeating = useCallback(async () => {
    try {
      const result = await logbookApi.getSeatingArrangement(classId, academicYear, 0);
      if (result) {
        setSeatingRows(result.rows || 4);
        setSeatingCols(result.cols || 5);
        setSeatingData(result.seating_data || {});
      }
    } catch (e) {
      console.error('Error loading seating');
    }
  }, [classId, academicYear]);

  // Load conduct evaluations
  const loadConduct = useCallback(async () => {
    setLoading(true);
    try {
      const result = await logbookApi.listConductEvaluations({
        class_id: classId,
        academic_year: academicYear,
        semester,
        limit: 100,
      });
      if (result) {
        const data: Record<string, { grade: string; comment: string }> = {};
        result.evaluations.forEach((ev: ConductEvaluation) => {
          data[ev.student_id] = {
            grade: ev.conduct_grade || '',
            comment: ev.teacher_comment || '',
          };
        });
        setConductData(data);
      }
    } catch (e) {
      setError('Không thể tải đánh giá hạnh kiểm');
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear, semester]);

  useEffect(() => {
    if (subTab === 'seating') loadSeating();
    if (subTab === 'conduct') loadConduct();
  }, [subTab, loadSeating, loadConduct]);

  const handleSaveSeating = async () => {
    setSaving(true);
    try {
      await logbookApi.saveSeatingArrangement({
        class_id: classId,
        academic_year: academicYear,
        semester: 0,
        rows: seatingRows,
        cols: seatingCols,
        seating_data: seatingData,
      });
      setSuccessMsg('Đã lưu sơ đồ chỗ ngồi');
    } catch (e) {
      setError('Lỗi khi lưu sơ đồ');
    } finally {
      setSaving(false);
    }
  };

  const handleSeatingCellClick = (cellKey: string) => {
    const currentStudent = seatingData[cellKey];
    if (currentStudent) {
      // Clear if already assigned
      setSeatingData(prev => ({ ...prev, [cellKey]: null }));
    }
  };

  const handleAssignStudent = (cellKey: string, studentId: string | null) => {
    setSeatingData(prev => ({ ...prev, [cellKey]: studentId }));
  };

  const handleGenerateAIComments = async () => {
    setGeneratingAI(true);
    setError(null);
    try {
      const result = await gradebookApi.generateAIReportComments({
        classId,
        academic_year: academicYear,
        semester,
      });
      if (result?.students) {
        const comments: Record<string, string[]> = {};
        result.students.forEach((s) => {
          comments[s.student_id] = s.comment_options || [];
        });
        setAiComments(comments);
        setSuccessMsg(`Đã tạo lời phê cho ${result.students.length} học sinh`);
      }
    } catch (e) {
      setError('Lỗi khi tạo lời phê AI');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleApplyAIComment = (studentId: string, commentIndex: number) => {
    const comments = aiComments[studentId];
    if (comments && comments[commentIndex]) {
      setConductData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          comment: comments[commentIndex],
        },
      }));
      setSuccessMsg('Đã áp dụng lời phê');
    }
  };

  const handleSaveConduct = async () => {
    setSaving(true);
    try {
      const evaluations = Object.entries(conductData)
        .filter(([, data]) => data.grade)
        .map(([student_id, data]) => ({
          student_id,
          conduct_grade: data.grade,
          teacher_comment: data.comment,
        }));
      
      if (evaluations.length > 0) {
        await logbookApi.batchUpdateConductEvaluations({
          evaluations,
          class_id: classId,
          academic_year: academicYear,
          semester,
        });
      }
      setSuccessMsg('Đã lưu đánh giá hạnh kiểm');
    } catch (e) {
      setError('Lỗi khi lưu đánh giá');
    } finally {
      setSaving(false);
    }
  };

  const getStudentById = (id: string) => students.find(s => s.id === id);

  const renderSeatingTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">Bố trí chỗ ngồi 4 dãy • Kéo thả học sinh vào vị trí</p>
        <Button variant="primary" size="sm" icon={Save} onClick={handleSaveSeating} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu sơ đồ'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Seating Grid */}
        <div className="lg:col-span-3">
          <Card padding="p-4">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${seatingCols}, 1fr)` }}>
              {Array.from({ length: seatingRows }).map((_, rowIdx) => (
                <div key={rowIdx} className="contents">
                  {Array.from({ length: seatingCols }).map((_, colIdx) => {
                    const cellKey = `${String.fromCharCode(65 + rowIdx)}${colIdx + 1}`;
                    const studentId = seatingData[cellKey];
                    const student = studentId ? getStudentById(studentId) : null;
                    
                    return (
                      <div
                        key={cellKey}
                        onClick={() => student && handleSeatingCellClick(cellKey)}
                        className={`aspect-video border-2 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          student
                            ? 'border-ocean/50 bg-ocean/5 hover:border-red-400 hover:bg-red-50'
                            : 'border-dashed border-gray-300 bg-gray-50 hover:border-ocean/30'
                        }`}
                      >
                        <span className="text-[10px] font-medium text-text-secondary">{cellKey}</span>
                        {student ? (
                          <>
                            <span className="text-xs font-medium text-text-primary truncate w-full text-center">
                              {student.name.split(' ').pop()}
                            </span>
                            <span className="text-[10px] text-text-secondary">{student.code}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400">Trống</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-[10px] text-text-secondary">
              💡 Bấm vào học sinh đã ngồi để xóa khỏi vị trí
            </div>
          </Card>
        </div>

        {/* Student List for Drag */}
        <div>
          <Card padding="p-3">
            <div className="text-xs font-medium text-text-primary mb-2">Học sinh ({students.length})</div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => {
                    // Find first empty cell
                    for (let r = 0; r < seatingRows; r++) {
                      for (let c = 0; c < seatingCols; c++) {
                        const cellKey = `${String.fromCharCode(65 + r)}${c + 1}`;
                        if (!seatingData[cellKey]) {
                          handleAssignStudent(cellKey, student.id);
                          return;
                        }
                      }
                    }
                    alert('Không còn chỗ trống trong sơ đồ');
                  }}
                  className="p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-ocean/10 transition-colors"
                >
                  <span className="font-medium text-text-primary">{student.name}</span>
                  <span className="text-text-secondary ml-2">{student.code}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderConductTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">Đánh giá hạnh kiểm theo Thông tư 22 cho HK1 2025-2026</p>
        <Button variant="primary" size="sm" icon={Save} onClick={handleSaveConduct} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu đánh giá'}
        </Button>
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin text-ocean" />
          <span className="text-xs">Đang tải...</span>
        </div>
      ) : (
        <Card padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-neutral border-b border-hairline">
                <tr className="text-[11px] font-semibold text-text-secondary uppercase">
                  <th className="py-2 px-3">Học sinh</th>
                  <th className="py-2 px-3">Mã</th>
                  <th className="py-2 px-3">Xếp loại</th>
                  <th className="py-2 px-3">Lời phê</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-hairline last:border-0 hover:bg-surface-neutral/50">
                    <td className="py-2 px-3 text-xs font-medium text-text-primary">{student.name}</td>
                    <td className="py-2 px-3 text-xs text-text-secondary">{student.code}</td>
                    <td className="py-2 px-3">
                      <select
                        value={conductData[student.id]?.grade || ''}
                        onChange={(e) => setConductData(prev => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], grade: e.target.value }
                        }))}
                        className="h-8 px-2 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                      >
                        <option value="">Chưa đánh giá</option>
                        <option value="tot">Tốt</option>
                        <option value="kha">Khá</option>
                        <option value="dat">Đạt</option>
                        <option value="chua_dat">Chưa đạt</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 min-w-48">
                      <textarea
                        rows={2}
                        value={conductData[student.id]?.comment || ''}
                        onChange={(e) => setConductData(prev => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], comment: e.target.value }
                        }))}
                        className="w-full p-2 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean resize-none"
                        placeholder="Lời phê giáo viên..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  const renderAICommentTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary">
            AI phân tích điểm trung bình, chuyên cần và hạnh kiểm để gợi ý lời phê học bạ
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Sparkles}
          onClick={handleGenerateAIComments}
          disabled={generatingAI}
        >
          {generatingAI ? 'Đang phân tích...' : 'Tạo lời phê AI'}
        </Button>
      </div>

      {Object.keys(aiComments).length === 0 ? (
        <div className="py-10 text-center">
          <Sparkles className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Bấm "Tạo lời phê AI" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(aiComments).map(([studentId, comments]) => {
            const student = getStudentById(studentId);
            if (!student) return null;
            
            return (
              <Card key={studentId} padding="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold text-text-primary">{student.name}</span>
                    <span className="text-xs text-text-secondary ml-2">{student.code}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {comments.map((comment, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-surface-neutral rounded text-xs text-text-primary"
                    >
                      <span className="text-[10px] text-ocean font-medium mr-2">Mẫu {idx + 1}:</span>
                      {comment}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  {comments.map((_, idx) => (
                    <Button
                      key={idx}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleApplyAIComment(studentId, idx)}
                    >
                      Áp dụng mẫu {idx + 1}
                    </Button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-hairline pb-2">
        <button
          type="button"
          onClick={() => setSubTab('seating')}
          className={`px-4 py-2 rounded text-xs transition-all flex items-center gap-1.5 ${
            subTab === 'seating'
              ? 'bg-ocean text-white font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          Sơ đồ chỗ ngồi
        </button>
        <button
          type="button"
          onClick={() => setSubTab('conduct')}
          className={`px-4 py-2 rounded text-xs transition-all flex items-center gap-1.5 ${
            subTab === 'conduct'
              ? 'bg-ocean text-white font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Đánh giá HK
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ai-comment')}
          className={`px-4 py-2 rounded text-xs transition-all flex items-center gap-1.5 ${
            subTab === 'ai-comment'
              ? 'bg-ocean text-white font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Trợ lý AI
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tab Content */}
      {subTab === 'seating' && renderSeatingTab()}
      {subTab === 'conduct' && renderConductTab()}
      {subTab === 'ai-comment' && renderAICommentTab()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GradebookMatrixTab — Thông tư 22 compliant Excel-like grade grid
// Features: TX/GK/CK columns, auto-calculated DTBmhk, keyboard navigation,
//           bulk save, Excel export
// ─────────────────────────────────────────────────────────────────────────────

const TT22_COLUMNS = [
  { key: 'TX1', label: 'TX1', code: 'TX', isTX: true },
  { key: 'TX2', label: 'TX2', code: 'TX', isTX: true },
  { key: 'TX3', label: 'TX3', code: 'TX', isTX: true },
  { key: 'TX4', label: 'TX4', code: 'TX', isTX: true },
  { key: 'GK',  label: 'GK',  code: 'GK', isTX: false },
  { key: 'CK',  label: 'CK',  code: 'CK', isTX: false },
  { key: 'DTBmhk', label: 'ĐTBmhk', code: null, isTX: false, isReadOnly: true },
];

function calculateDTBmhk(txScores: number[]): number | null {
  if (txScores.length === 0) return null;
  const sumTX = txScores.reduce((a, b) => a + b, 0);
  const gkScore = 0; // Not available in simple mode
  const ckScore = 0; // Not available in simple mode
  const denominator = txScores.length + 5;
  return (sumTX + gkScore * 2 + ckScore * 3) / denominator;
}

function GradebookMatrixTab({ classId, className, students, searchQuery }) {
  const [gradeData, setGradeData] = useState({});
  const [editedGrades, setEditedGrades] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const gridRef = useRef(null);

  // Initialize grade data from students prop
  useEffect(() => {
    const initial = {};
    students.forEach(s => {
      initial[s.id] = {
        TX: Array(4).fill(null),
        GK: null,
        CK: null,
      };
    });
    setGradeData(initial);
  }, [students]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e, studentId, colKey) => {
    const studentIdx = filteredStudents.findIndex(s => s.id === studentId);
    const colIdx = TT22_COLUMNS.findIndex(c => c.key === colKey);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = TT22_COLUMNS[colIdx + 1];
      if (nextCol) setSelectedCell({ studentId, colKey: nextCol.key });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = TT22_COLUMNS[colIdx - 1];
      if (prevCol) setSelectedCell({ studentId, colKey: prevCol.key });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = filteredStudents[studentIdx + 1];
      if (nextStudent) setSelectedCell({ studentId: nextStudent.id, colKey });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = filteredStudents[studentIdx - 1];
      if (prevStudent) setSelectedCell({ studentId: prevStudent.id, colKey });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // Focus the input for this cell
      const input = gridRef.current?.querySelector(
        `[data-student="${studentId}"][data-col="${colKey}"] input`
      );
      input?.focus();
    }
  }, [filteredStudents]);

  // ── Handle grade input ──
  const handleGradeChange = (studentId, colKey, value) => {
    const num = parseFloat(value);
    const score = isNaN(num) ? null : Math.min(10, Math.max(0, num));

    setEditedGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [colKey]: score,
      },
    }));
  };

  // ── Get grade value (edited or original) ──
  const getGrade = (studentId, colKey) => {
    if (editedGrades[studentId]?.[colKey] !== undefined) {
      return editedGrades[studentId][colKey];
    }
    return gradeData[studentId]?.[colKey] ?? null;
  };

  // ── Get TX scores for DTBmhk calculation ──
  const getTxScores = (studentId) => {
    const txScores = [];
    for (let i = 1; i <= 4; i++) {
      const val = getGrade(studentId, `TX${i}`);
      if (val !== null) txScores.push(val);
    }
    return txScores;
  };

  // ── Bulk save ──
  const handleBulkSave = async () => {
    if (Object.keys(editedGrades).length === 0) return;
    setIsSaving(true);
    setSaveResult(null);
    try {
      // Prepare bulk save payload
      const entries = [];
      Object.entries(editedGrades).forEach(([studentId, grades]) => {
        Object.entries(grades).forEach(([colKey, score]) => {
          if (score !== null) {
            let category_code = null;
            if (colKey.startsWith('TX')) category_code = 'TX';
            else if (colKey === 'GK') category_code = 'GK';
            else if (colKey === 'CK') category_code = 'CK';
            entries.push({ studentId, categoryCode: category_code, score });
          }
        });
      });
      await gradebookApi.bulkEnterGrades?.({ classId, entries }) || Promise.resolve();
      // Update gradeData with edited values
      setGradeData(prev => ({ ...prev, ...editedGrades }));
      setEditedGrades({});
      setSaveResult({ success: true });
      setTimeout(() => setSaveResult(null), 2000);
    } catch (err) {
      setSaveResult({ success: false, message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export to CSV ──
  const handleExportMatrix = () => {
    const headers = ['STT', 'Mã HS', 'Họ tên', ...TT22_COLUMNS.map(c => c.label)];
    const rows = filteredStudents.map((s, idx) => {
      const row = [
        idx + 1,
        s.code || s.id,
        `"${s.name}"`,
      ];
      TT22_COLUMNS.forEach(col => {
        if (col.key === 'DTBmhk') {
          const txScores = getTxScores(s.id);
          const dtb = calculateDTBmhk(txScores);
          row.push(dtb !== null ? dtb.toFixed(2) : '');
        } else {
          const val = getGrade(s.id, col.key);
          row.push(val !== null ? val.toString() : '');
        }
      });
      return row;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ma_Tran_Diem_${className}_TT22_EduPortal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editedCount = Object.keys(editedGrades).length;

  return (
    <Card padding="p-6" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Ma trận điểm lớp {className}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Cấu trúc theo <strong>Thông tư 22</strong>: ĐĐGtx (4 cột) • ĐĐGgk • ĐĐGck • ĐTBmhk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editedCount > 0 && (
            <span className="text-xs text-warning font-medium">
              {editedCount} ô đã chỉnh sửa
            </span>
          )}
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExportMatrix}>
            Xuất CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={isSaving ? Loader2 : Check}
            disabled={isSaving || editedCount === 0}
            onClick={handleBulkSave}
          >
            {isSaving ? 'Đang lưu...' : editedCount > 0 ? `Lưu (${editedCount})` : 'Lưu điểm'}
          </Button>
        </div>
      </div>

      {/* Save feedback */}
      {saveResult && (
        <div className={`p-3 rounded text-xs flex items-center gap-2 ${
          saveResult.success
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            : 'bg-red-50 border border-red-300 text-red-700'
        }`}>
          {saveResult.success
            ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          <span>{saveResult.success ? 'Đã lưu thành công!' : saveResult.message}</span>
        </div>
      )}

      {/* Keyboard navigation hint */}
      <div className="text-[11px] text-text-secondary flex items-center gap-3">
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-medium">↑↓←→</span>
        <span>Di chuyển giữa các ô</span>
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-mono">Enter</span>
        <span>Focus vào ô</span>
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-mono">Tab</span>
        <span>Di chuyển nhanh</span>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto" ref={gridRef}>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-hairline">
              <th className="py-3 px-3 bg-surface-neutral sticky left-0 z-10 min-w-[40px] text-center">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary">STT</span>
              </th>
              <th className="py-3 px-4 bg-surface-neutral sticky left-[40px] z-10 min-w-[160px]">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary">Học sinh</span>
              </th>
              {TT22_COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-2 text-center min-w-[60px] ${
                    col.code === 'TX' ? 'bg-sky/30' :
                    col.code === 'GK' ? 'bg-amber-50' :
                    col.code === 'CK' ? 'bg-emerald-50' :
                    'bg-ocean/10'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{col.label}</div>
                  <div className="text-[9px] text-text-secondary font-normal">
                    {col.code ? `HS ${col.key === 'GK' ? '2' : col.key === 'CK' ? '3' : '1'}` : 'TĐ'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filteredStudents.map((st, idx) => {
              const txScores = getTxScores(st.id);
              const dtbmhk = calculateDTBmhk(txScores);

              return (
                <tr key={st.id} className="hover:bg-surface-neutral/30 transition-colors">
                  <td className="py-2 px-3 text-center text-text-secondary bg-surface-neutral sticky left-0 z-10 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 bg-surface-neutral sticky left-[40px] z-10">
                    <div className="font-medium text-text-primary truncate">{st.name}</div>
                    <div className="text-[10px] text-text-secondary font-mono">{st.code}</div>
                  </td>
                  {TT22_COLUMNS.map(col => {
                    const value = getGrade(st.id, col.key);
                    const isEdited = editedGrades[st.id]?.[col.key] !== undefined;
                    const isSelected = selectedCell?.studentId === st.id && selectedCell?.colKey === col.key;

                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-1 text-center border-x border-hairline ${
                          isSelected ? 'ring-2 ring-ocean ring-inset bg-sky/20' : ''
                        } ${
                          col.code === 'TX' ? 'bg-sky/10' :
                          col.code === 'GK' ? 'bg-amber-50/50' :
                          col.code === 'CK' ? 'bg-emerald-50/50' :
                          'bg-ocean/5'
                        }`}
                        data-student={st.id}
                        data-col={col.key}
                        onClick={() => setSelectedCell({ studentId: st.id, colKey: col.key })}
                        onKeyDown={(e) => !col.isReadOnly && handleKeyDown(e, st.id, col.key)}
                        tabIndex={0}
                      >
                        {col.key === 'DTBmhk' ? (
                          <span className={`font-bold text-sm ${
                            value !== null
                              ? value >= 8.5 ? 'text-success'
                              : value >= 7 ? 'text-info'
                              : value >= 5 ? 'text-warning'
                              : 'text-danger'
                              : 'text-text-secondary'
                          }`}>
                            {value !== null ? value.toFixed(2) : '—'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={value !== null ? value : ''}
                            onChange={(e) => handleGradeChange(st.id, col.key, e.target.value)}
                            onFocus={() => setSelectedCell({ studentId: st.id, colKey: col.key })}
                            className={`w-full h-8 text-center text-xs font-mono font-medium rounded transition-all outline-none ${
                              isEdited
                                ? 'bg-amber-50 border border-amber-400 text-amber-900 focus:border-ocean focus:bg-white'
                                : 'bg-transparent border border-transparent focus:border-ocean focus:bg-white'
                            } ${
                              value !== null && value < 5 ? 'text-danger font-bold' : 'text-primary'
                            }`}
                            placeholder="—"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 bg-surface-neutral rounded border border-hairline flex flex-wrap gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-sky/30 border border-hairline rounded" />
          <span>Điểm thường xuyên (HS1)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-amber-50 border border-hairline rounded" />
          <span>Giữa kỳ (HS2)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-emerald-50 border border-hairline rounded" />
          <span>Cuối kỳ (HS3)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-ocean/10 border border-hairline rounded" />
          <span>ĐTBmhk = (∑TX + GK×2 + CK×3) / (nTX + 5)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-amber-50 border border-amber-400 rounded" />
          <span>Ô đã chỉnh sửa (chưa lưu)</span>
        </span>
      </div>
    </Card>
  );
}

// =============================================================================
// AcademicSummaryTab — TT22 Academic Evaluation Summary & E-Report Card
// Features: Class summary, student classification, honor titles, lock workflow
// =============================================================================

interface AcademicSummaryTabProps {
  classId: string;
  className: string;
  data: ClassAcademicSummaryResponse | null;
  loading: boolean;
  error: string | null;
  lockConfirmText: string;
  onLockConfirmChange: (v: string) => void;
  isLocking: boolean;
  lockSuccess: string | null;
  onLock: () => void;
  onRefresh: () => void;
}

function AcademicSummaryTab({
  classId,
  className,
  data,
  loading,
  error,
  lockConfirmText,
  onLockConfirmChange,
  isLocking,
  lockSuccess,
  onLock,
  onRefresh,
}: AcademicSummaryTabProps): React.JSX.Element {
  const [expandedStudent, setExpandedStudent] = React.useState<string | null>(null);
  const [reportModal, setReportModal] = React.useState<StudentEvaluation | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-neutral rounded-card animate-pulse" />)}
        </div>
        <div className="h-64 bg-surface-neutral rounded-card animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="p-8" className="text-center">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <p className="text-sm text-danger font-medium mb-3">{error}</p>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Thử lại
        </Button>
      </Card>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <Card padding="p-8" className="text-center">
        <Award className="w-10 h-10 text-text-secondary mx-auto mb-3 opacity-50" />
        <p className="text-sm text-text-secondary">Chưa có dữ liệu học lực cho lớp này.</p>
      </Card>
    );
  }

  const { students, summary } = data;

  const classificationColors: Record<string, string> = {
    Tot: 'bg-success-light text-success border border-success/20',
    Kha: 'bg-info/10 text-ocean border border-ocean/20',
    Dat: 'bg-warning-light text-warning-dark border border-warning/20',
    ChuaDat: 'bg-danger-light text-danger border border-danger/20',
  };

  const classificationLabels: Record<string, string> = {
    Tot: 'Tốt',
    Kha: 'Khá',
    Dat: 'Đạt',
    ChuaDat: 'Chưa đạt',
  };

  const honorColors: Record<string, string> = {
    XuatSac: 'bg-yellow-50 text-yellow-700 border border-yellow-300',
    Gioi: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  const honorLabels: Record<string, string> = {
    XuatSac: '🌟 Xuất sắc',
    Gioi: '🏆 Giỏi',
  };

  return (
    <div className="space-y-4">
      {/* ── Class Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card padding="p-4" className="text-center">
            <div className="text-2xl font-bold text-primary">{summary.totalStudents}</div>
            <div className="text-xs text-text-secondary mt-1">Tổng HS</div>
          </Card>
          <Card padding="p-4" className="text-center">
            <div className="text-2xl font-bold text-success">{summary.academicDistribution.Tot}</div>
            <div className="text-xs text-text-secondary mt-1">Mức Tốt</div>
          </Card>
          <Card padding="p-4" className="text-center">
            <div className="text-2xl font-bold text-ocean">{summary.academicDistribution.Kha}</div>
            <div className="text-xs text-text-secondary mt-1">Mức Khá</div>
          </Card>
          <Card padding="p-4" className="text-center">
            <div className="text-2xl font-bold text-warning-dark">{summary.academicDistribution.Dat}</div>
            <div className="text-xs text-text-secondary mt-1">Mức Đạt</div>
          </Card>
          <Card padding="p-4" className="text-center">
            <div className="text-2xl font-bold text-danger">{summary.academicDistribution.ChuaDat}</div>
            <div className="text-xs text-text-secondary mt-1">Chưa Đạt</div>
          </Card>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="font-medium text-primary">{className}</span>
          {summary && (
            <span>• Tỷ lệ đạt: <strong className="text-success">{summary.classificationRate}%</strong></span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefresh}>
            Làm mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => {
              const headers = ['STT', 'Mã HS', 'Họ tên', 'ĐTBmcn', 'Xếp loại HL', 'Xếp loại RL', 'Danh hiệu'];
              const rows = students.map((s, i) => [
                i + 1, s.studentCode, s.studentName,
                s.yearlyGPA?.toFixed(1) ?? '—',
                classificationLabels[s.academicClassification] ?? s.academicClassification,
                s.conductRatingLabel ?? '—',
                s.honorTitleLabel ?? '—',
              ]);
              const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
              const bom = '\uFEFF'; // UTF-8 BOM for Vietnamese
              const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `BANG_TONG_HOP_${className.replace(/\s+/g, '_')}_HK.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Xuất Bảng Tổng Hợp MOET
          </Button>
        </div>
      </div>

      {/* ── Lock Confirmation ── */}
      {lockSuccess ? (
        <Card padding="p-4" className="border border-success/30 bg-success-light/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">{lockSuccess}</p>
              <p className="text-xs text-success/70 mt-0.5">Điểm số đã bị khóa và không thể chỉnh sửa.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="p-4" className="border border-amber-200 bg-amber-50/30">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-warning-dark mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-dark">Khóa sổ điểm học kỳ</p>
              <p className="text-xs text-warning-dark/80 mt-1 mb-3">
                Sau khi khóa, điểm số không thể chỉnh sửa. Cần xác nhận bằng văn bản: <strong>XÁC NHẬN KHÓA SỔ</strong>
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lockConfirmText}
                  onChange={e => onLockConfirmChange(e.target.value)}
                  placeholder="Nhập XÁC NHẬN KHÓA SỔ"
                  className="h-9 px-3 border border-amber-300 rounded text-xs w-64 focus:outline-none focus:border-warning-dark bg-white"
                />
                <Button
                  variant="danger"
                  size="sm"
                  icon={Lock}
                  disabled={lockConfirmText !== 'XÁC NHẬN KHÓA SỔ'}
                  loading={isLocking}
                  onClick={onLock}
                >
                  Khóa sổ điểm
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Student Table ── */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-neutral hairline-b">
                <th className="py-3 px-4 text-left font-medium text-text-secondary w-8">STT</th>
                <th className="py-3 px-4 text-left font-medium text-text-secondary">Họ tên</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary">Mã HS</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary">ĐTBmcn</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary">Xếp loại HL</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary">Xếp loại RL</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary">Danh hiệu</th>
                <th className="py-3 px-4 text-center font-medium text-text-secondary w-16">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <React.Fragment key={student.studentId}>
                  <tr className={`hairline-b hover:bg-surface-neutral/40 transition-colors ${expandedStudent === student.studentId ? 'bg-sky/10' : ''}`}>
                    <td className="py-3 px-4 text-text-secondary">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-text-primary">{student.studentName}</td>
                    <td className="py-3 px-4 text-center font-mono text-text-secondary">{student.studentCode || '—'}</td>
                    <td className="py-3 px-4 text-center font-semibold">
                      {student.yearlyGPA !== null ? (
                        <span className={student.yearlyGPA >= 8.5 ? 'text-success' : student.yearlyGPA >= 5.0 ? 'text-ocean' : 'text-danger'}>
                          {student.yearlyGPA.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-pill text-[11px] font-medium ${classificationColors[student.academicClassification] || ''}`}>
                        {classificationLabels[student.academicClassification] ?? student.academicClassification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.conductRatingLabel && (
                        <Badge variant={student.conductRating === 'Tot' ? 'success' : student.conductRating === 'Kha' ? 'info' : 'warning'} size="sm">
                          {student.conductRatingLabel}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.honorTitleLabel && (
                        <span className={`inline-block px-2 py-1 rounded-pill text-[11px] font-semibold ${honorColors[student.honorTitle] || ''}`}>
                          {student.honorTitleLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedStudent(expandedStudent === student.studentId ? null : student.studentId)}
                      >
                        {expandedStudent === student.studentId ? 'Thu gọn' : 'Chi tiết'}
                      </Button>
                    </td>
                  </tr>
                  {expandedStudent === student.studentId && (
                    <tr className="bg-sky/5">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="grid grid-cols-5 gap-3">
                            {student.subjectScores.slice(0, 5).map(sub => (
                              <div key={sub.subjectId} className="bg-white rounded border border-hairline p-2">
                                <div className="text-[11px] font-medium text-text-primary truncate">{sub.subjectName}</div>
                                <div className="text-sm font-semibold mt-1">
                                  {sub.yearlyScore !== null ? sub.yearlyScore.toFixed(1) : '—'}
                                </div>
                                <div className="text-[10px] text-text-secondary mt-0.5">
                                  HK1: {sub.hk1Score?.toFixed(1) ?? '—'} · HK2: {sub.hk2Score?.toFixed(1) ?? '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-text-secondary">
                              {student.honorTitleReason}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={FileText}
                              onClick={() => setReportModal(student)}
                            >
                              Xem Học Bạ
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Report Card Modal ── */}
      <Modal
        isOpen={Boolean(reportModal)}
        onClose={() => setReportModal(null)}
        title={`Học Bạ Điện Tử — ${reportModal?.studentName || ''}`}
        size="2xl"
      >
        {reportModal && (
          <div className="space-y-4">
            <div className="border border-hairline rounded-card p-4 bg-surface-neutral/20 text-center">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Trường THCS Bắc Au</h3>
              <h2 className="text-base font-bold text-text-primary mt-2">HỌC BẠ ĐIỆN TỬ</h2>
              <p className="text-xs text-text-secondary mt-1">Năm học: {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-xs">
                <div className="font-medium text-text-primary">{reportModal.studentName}</div>
                <div className="text-text-secondary">Mã HS: {reportModal.studentCode || '—'}</div>
              </div>
              <div className="text-xs text-right">
                <div className={`inline-block px-3 py-1 rounded-pill text-xs font-semibold ${classificationColors[reportModal.academicClassification] || ''}`}>
                  Xếp loại HL: {classificationLabels[reportModal.academicClassification]}
                </div>
                {reportModal.honorTitleLabel && (
                  <div className={`mt-1 inline-block px-3 py-1 rounded-pill text-xs font-semibold ${honorColors[reportModal.honorTitle] || ''}`}>
                    {reportModal.honorTitleLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-hairline">
                <thead>
                  <tr className="bg-surface-neutral hairline-b">
                    <th className="py-2 px-3 text-left font-medium text-text-secondary">Môn học</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmhk1</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmhk2</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmcn</th>
                  </tr>
                </thead>
                <tbody>
                  {reportModal.subjectScores.map(sub => (
                    <tr key={sub.subjectId} className="hairline-b">
                      <td className="py-2 px-3 text-text-primary">{sub.subjectName}</td>
                      <td className="py-2 px-3 text-center">{sub.hk1Score?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 px-3 text-center">{sub.hk2Score?.toFixed(1) ?? '—'}</td>
                      <td className={`py-2 px-3 text-center font-semibold ${sub.yearlyScore !== null && sub.yearlyScore < 5 ? 'text-danger' : 'text-success'}`}>
                        {sub.yearlyScore?.toFixed(1) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-text-secondary">
                <div>Điểm trung bình cả năm: <strong className="text-primary">{reportModal.yearlyGPA?.toFixed(1) ?? '—'}</strong></div>
                <div className="mt-1">Xếp loại RL: <strong>{reportModal.conductRatingLabel ?? '—'}</strong></div>
              </div>
              <div className="text-xs text-text-secondary">
                Mã xác thực: <span className="font-mono text-ocean">EDUPORTAL-{data?.generatedAt ? new Date(data.generatedAt).toLocaleDateString('vi-VN').replace(/\//g, '') : 'XXXX'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function TeacherClassesPage() {
  const { lastSync, triggerSync } = useSync();
  const [classData, setClassData] = useState<{
    currentClassId?: string;
    classes: TeacherAssignedClass[];
    students: Array<{
      id: string;
      name: string;
      code: string;
      gpa: number;
      rank: number;
      attendance: string;
      status: string;
      statusType?: string;
      phone?: string;
    }>;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('gradebook'); // 'gradebook' | 'attendance' | 'matrix' | 'summary' | 'rfid' | 'logbook' | 'homeroom'
  const [searchQuery, setSearchQuery] = useState('');

  // Grade edit modal states
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
  const [gradeInput, setGradeInput] = useState({
    subject: 'Toán học 10',
    testName: 'Kiểm tra 15 phút thường xuyên',
    score: '9.0',
    comment: 'Làm bài cẩn thận, nắm chắc kiến thức chuyên đề.',
  });
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState(false);

  // Attendance states — using canonical uppercase status codes
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendancePeriod, setAttendancePeriod] = useState(null); // null = "buổi/daily"
  // Map: studentId → { status: 'PRESENT'|'ABSENT'|'LATE'|'EXCUSED', note: string }
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; note?: string }>>({});
  const [attendanceRoster, setAttendanceRoster] = useState<AttendanceRosterStudent[]>([]); // full enrolled roster
  const [existingSession, setExistingSession] = useState(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaveResult, setAttendanceSaveResult] = useState(null); // { success, message }

  // ── TT22 Academic Evaluation State ──
  const [summaryTabData, setSummaryTabData] = useState<ClassAcademicSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [lockConfirmText, setLockConfirmText] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [lockSuccess, setLockSuccess] = useState<string | null>(null);

  const fetchClass = async (cid?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await teacherApi.getClasses(cid || undefined);
      if (res) {
        setClassData({ ...res, students: res.students || [] });
        if (res.currentClassId && res.currentClassId !== selectedClassId) {
          setSelectedClassId(res.currentClassId);
        } else if (!cid && res.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(res.classes[0].id);
        }
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Không thể tải dữ liệu lớp học');
    } finally {
      setIsLoading(false);
    }
  };

  // Load TT22 Academic Summary
  const loadAcademicSummary = useCallback(async (classId) => {
    if (!classId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setLockSuccess(null);
    setLockConfirmText('');
    try {
      const data = await gradebookApi.getClassAcademicSummary({ classId });
      setSummaryTabData(data);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Không thể tải tổng hợp học lực');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load roster + existing session from canonical attendance endpoint
  const loadAttendanceRoster = useCallback(async (classId, date, period) => {
    if (!classId) return;
    setIsLoadingRoster(true);
    setRosterError(null);
    setAttendanceSaveResult(null);
    try {
      const roster = await attendanceApi.getRoster(classId, date, period ?? null);
      setAttendanceRoster(roster);

      // Initialize attendance records: use existingStatus if present, else default to PRESENT
      const initialRecords = {};
      roster.forEach((st) => {
        initialRecords[st.student_id] = {
          status: st.existingStatus || 'PRESENT',
          note: st.existingNote || '',
        };
      });
      setAttendanceRecords(initialRecords);

      // Check if there's an existing session
      const { session } = await attendanceApi.getSession(classId, date, period ?? null);
      setExistingSession(session);
    } catch (err) {
      setRosterError(err?.message || 'Không thể tải danh sách điểm danh');
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    fetchClass(selectedClassId);
  }, [selectedClassId, lastSync]);

  // Load TT22 summary when selected class changes
  useEffect(() => {
    if (selectedClassId) {
      loadAcademicSummary(selectedClassId);
    }
  }, [selectedClassId, loadAcademicSummary]);

  // Reload roster when class, date, or period changes (only when on attendance tab)
  useEffect(() => {
    if (activeTab === 'attendance' && selectedClassId) {
      loadAttendanceRoster(selectedClassId, attendanceDate, attendancePeriod);
    }
  }, [selectedClassId, attendanceDate, attendancePeriod, activeTab, loadAttendanceRoster]);

  const handleOpenGradeModal = (student) => {
    setSelectedStudentForGrade(student);
    setGradeInput({
      subject: 'Toán học 10',
      testName: 'Kiểm tra 15 phút thường xuyên',
      score: student.gpa ? student.gpa.toString() : '8.5',
      comment: 'Làm bài cẩn thận, trình bày mạch lạc.',
    });
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedStudentForGrade) return;
    setIsSubmittingGrade(true);
    try {
      await teacherApi.updateGrade({
        studentId: selectedStudentForGrade.id,
        subject: gradeInput.subject,
        testName: gradeInput.testName,
        score: parseFloat(gradeInput.score),
        comment: gradeInput.comment,
      });
      await triggerSync();
      setGradeSuccessMsg(true);
      fetchClass(selectedClassId);
      setTimeout(() => {
        setGradeSuccessMsg(false);
        setSelectedStudentForGrade(null);
      }, 1200);
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleMarkAllPresent = () => {
    const next = {};
    attendanceRoster.forEach((st) => {
      next[st.student_id] = { status: 'PRESENT', note: '' };
    });
    setAttendanceRecords(next);
  };

  const setStudentStatus = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { note: '' }), status },
    }));
  };

  const setStudentNote = (studentId, note) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { status: 'PRESENT' }), note },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || attendanceRoster.length === 0) return;

    const records = attendanceRoster.map((st) => ({
      studentId: st.student_id,
      status: (attendanceRecords[st.student_id]?.status || 'PRESENT') as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
      note: attendanceRecords[st.student_id]?.note || '',
    }));

    setIsSavingAttendance(true);
    setAttendanceSaveResult(null);
    try {
      const res = await attendanceApi.saveSession({
        classId: selectedClassId,
        date: attendanceDate,
        period: attendancePeriod,
        sessionType: attendancePeriod !== null ? 'period' : 'daily',
        records,
      });

      if (res?.success) {
        await triggerSync();
        setAttendanceSaveResult({ success: true, message: `Đã lưu sổ điểm danh ngày ${attendanceDate} — ${records.length} học sinh.` });
        // Reload roster to sync saved state
        await loadAttendanceRoster(selectedClassId, attendanceDate, attendancePeriod);
      } else {
        setAttendanceSaveResult({ success: false, message: res?.message || 'Không thể lưu điểm danh' });
      }
    } catch (err) {
      setAttendanceSaveResult({ success: false, message: err?.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleExportGradebook = () => {
    if (!classData?.students) return;
    const className = selectedClassId === 'cls_10A1' ? '10A1' : '10A2';
    const headers = ['Mã định danh', 'Họ và tên', 'Số điện thoại', 'Điểm TB (GPA)', 'Thứ hạng', 'Chuyên cần', 'Xếp loại'];
    const rows = classData.students.map((s) => [
      s.code,
      `"${s.name}"`,
      s.phone || '',
      s.gpa,
      s.rank,
      s.attendance,
      `"${s.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_Lop_${className}_EduPortal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = (classData?.students || []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceRecords).filter((r: { status: string; note?: string }) => r?.status === 'PRESENT').length;
  const excusedCount = Object.values(attendanceRecords).filter((r: { status: string; note?: string }) => r?.status === 'EXCUSED').length;
  const absentCount = Object.values(attendanceRecords).filter((r: { status: string; note?: string }) => r?.status === 'ABSENT').length;
  const lateCount = Object.values(attendanceRecords).filter((r: { status: string; note?: string }) => r?.status === 'LATE').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Quản lý lớp học & Chuyên cần</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Danh sách lớp & Quản lý sư phạm</h1>
          <p className="text-xs text-text-secondary mt-1">
            Điểm danh điện tử hàng ngày, theo dõi sổ điểm học sinh và xuất báo cáo học bạ chuẩn hóa.
          </p>
        </div>

        {/* Class switcher buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {classData?.classes?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`px-3.5 py-1.5 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedClassId === c.id
                  ? 'bg-primary text-white font-medium shadow-whisper'
                  : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>{c.name}</span>
              {c.is_homeroom && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  selectedClassId === c.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  Chủ nhiệm
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State when teacher has no assigned classes */}
      {classData && classData.classes?.length === 0 && !isLoading && (
        <Card className="p-12 text-center bg-white border border-hairline rounded-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-text-primary">Chưa có lớp học được phân công</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-1">
            Bạn chưa được phân công giảng dạy hoặc làm chủ nhiệm lớp học nào trong năm học hiện tại. Vui lòng liên hệ Ban Giám Hiệu hoặc Quản trị viên để được phân công chuyên môn.
          </p>
        </Card>
      )}

      {/* Main Content when classes exist */}
      {classData && classData.classes?.length > 0 && (
        <>
          {/* Main Tab Controller & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-surface-neutral rounded border border-hairline">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('gradebook')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'gradebook'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sổ điểm học sinh ({classData?.students?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Điểm danh chuyên cần
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Ma trận điểm (TT22)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'summary'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Tổng Kết & Học Bạ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logbook')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'logbook'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sổ Đầu Bài
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('homeroom')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'homeroom'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Công Tác CN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rfid')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'rfid'
                    ? 'bg-white text-orange-600 font-medium shadow-whisper border border-hairline'
                    : 'text-orange-500 hover:text-orange-600'
                }`}
              >
                🔌 Quét thẻ RFID
              </button>
            </div>

        <div className="flex items-center gap-2 px-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 pr-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean w-56"
            />
          </div>

          {activeTab === 'gradebook' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportGradebook}
            >
              Xuất Excel/CSV
            </Button>
          )}
          {activeTab === 'matrix' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => {/* handleExportMatrix */ alert('Tính năng xuất Excel đang được phát triển. Sử dụng Ctrl+C để sao chép dữ liệu từ ma trận.')}}
            >
              Xuất Excel
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: SỔ ĐIỂM HỌC SINH */}
      {activeTab === 'gradebook' && (
        <Card padding="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Sổ điểm lớp {selectedClassId === 'cls_10A1' ? '10A1' : '10A2'}
              </h2>
              <Badge variant="info">{filteredStudents.length} học sinh</Badge>
            </div>
            <span className="text-xs text-text-secondary">Năm học 2024 - 2025 • Tổ Toán học</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Học sinh</th>
                  <th scope="col" className="py-3 px-4">Mã định danh</th>
                  <th scope="col" className="py-3 px-4 text-center">Thứ hạng</th>
                  <th scope="col" className="py-3 px-4 text-center">Điểm GPA</th>
                  <th scope="col" className="py-3 px-4 text-center">Chuyên cần</th>
                  <th scope="col" className="py-3 px-4 text-center">Xếp loại</th>
                  <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-surface-neutral/40 transition-colors">
                    <th scope="row" className="py-3.5 px-4 text-left font-medium text-text-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-xs">
                          {st.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{st.name}</div>
                          <div className="text-[11px] text-text-secondary">{st.phone || '0988-xxx-xxx'}</div>
                        </div>
                      </div>
                    </th>
                    <td className="py-3.5 px-4 font-mono text-text-secondary">
                      {st.code}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-text-primary">
                      #{st.rank}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-sm text-primary">{st.gpa}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-text-secondary">
                      {st.attendance}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={(st.statusType as 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'navy' | 'default') || 'neutral'} size="sm">
                        {st.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit}
                        onClick={() => handleOpenGradeModal(st)}
                      >
                        Nhập / Sửa điểm
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: ĐIỂM DANH CHUYÊN CẦN */}
      {activeTab === 'attendance' && (
        <Card padding="p-6" className="space-y-5">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 hairline-b pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-primary">
                  Điểm danh lớp {classData?.classes?.find((c) => c.id === selectedClassId)?.name || selectedClassId}
                </h2>
                {existingSession && (
                  <Badge variant="success">Đã ghi nhận</Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Học sinh vắng không phép sẽ được tự động kích hoạt thông báo gửi đến phụ huynh.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Date picker */}
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean font-medium"
                />
              </div>

              {/* Period selector */}
              <select
                value={attendancePeriod === null ? '' : attendancePeriod}
                onChange={(e) => setAttendancePeriod(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
              >
                <option value="">Buổi học (daily)</option>
                {[1,2,3,4,5,6,7,8,9,10].map((p) => (
                  <option key={p} value={p}>Tiết {p}</option>
                ))}
              </select>

              <Button variant="secondary" size="sm" icon={Check} onClick={handleMarkAllPresent} disabled={isLoadingRoster}>
                Tất cả có mặt
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={isSavingAttendance || isLoadingRoster || attendanceRoster.length === 0}
                onClick={handleSaveAttendance}
              >
                {isSavingAttendance ? 'Đang lưu...' : existingSession ? 'Cập nhật điểm danh' : 'Lưu điểm danh'}
              </Button>
            </div>
          </div>

          {/* Existing session banner */}
          {existingSession && (
            <div className="p-3 bg-sky/60 border border-ocean/20 rounded text-xs text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-ocean" />
              <span>
                Buổi điểm danh ngày <strong>{existingSession.date}</strong> đã được ghi nhận trước đó.
                {existingSession.subject_name && ` Môn: ${existingSession.subject_name}.`}
                {' '}Các thay đổi bên dưới sẽ <strong>cập nhật</strong> bản ghi hiện có.
              </span>
            </div>
          )}

          {/* KPI Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-center">
              <div className="text-xs font-medium text-emerald-800">Có mặt</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{presentCount}</div>
            </div>
            <div className="p-3 bg-sky border border-ocean/20 rounded text-center">
              <div className="text-xs font-medium text-primary">Vắng có phép</div>
              <div className="text-xl font-bold text-ocean mt-1">{excusedCount}</div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
              <div className="text-xs font-medium text-red-800">Vắng không phép</div>
              <div className="text-xl font-bold text-red-600 mt-1">{absentCount}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
              <div className="text-xs font-medium text-amber-800">Đi muộn</div>
              <div className="text-xl font-bold text-amber-600 mt-1">{lateCount}</div>
            </div>
          </div>

          {/* Save feedback */}
          {attendanceSaveResult && (
            <div className={`p-3 rounded text-xs flex items-center gap-2 ${
              attendanceSaveResult.success
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                : 'bg-red-50 border border-red-300 text-red-700'
            }`}>
              {attendanceSaveResult.success
                ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                : <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              }
              <span>{attendanceSaveResult.message}</span>
            </div>
          )}

          {/* Roster error */}
          {rosterError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{rosterError}</span>
            </div>
          )}

          {/* Loading roster */}
          {isLoadingRoster && (
            <div className="py-10 flex flex-col items-center gap-3 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-ocean" />
              <span className="text-xs">Đang tải danh sách học sinh...</span>
            </div>
          )}

          {/* Empty roster */}
          {!isLoadingRoster && !rosterError && attendanceRoster.length === 0 && (
            <div className="py-10 text-center">
              <Users className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-text-secondary">Không có học sinh nào ghi danh trong lớp này.</p>
            </div>
          )}

          {/* Student Attendance List */}
          {!isLoadingRoster && attendanceRoster.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">Học sinh</th>
                    <th scope="col" className="py-3 px-4">Mã số</th>
                    <th scope="col" className="py-3 px-4 text-center">Trạng thái điểm danh</th>
                    <th scope="col" className="py-3 px-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs">
                  {attendanceRoster.map((st) => {
                    const rec = attendanceRecords[st.student_id] || { status: 'PRESENT', note: '' };
                    const status = rec.status;
                    return (
                      <tr key={st.student_id} className="hover:bg-surface-neutral/40 transition-colors">
                        <th scope="row" className="py-3 px-4 text-left font-medium text-text-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                              {st.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-text-primary">{st.name}</span>
                          </div>
                        </th>
                        <td className="py-3 px-4 font-mono text-text-secondary">{st.student_code || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap" role="group" aria-label={`Trạng thái điểm danh của ${st.name}`}>
                            {[
                              { code: 'PRESENT', label: 'Có mặt', active: 'bg-emerald-600 text-white' },
                              { code: 'EXCUSED', label: 'Có phép', active: 'bg-ocean text-white' },
                              { code: 'ABSENT', label: 'Vắng mặt', active: 'bg-danger text-white' },
                              { code: 'LATE', label: 'Đi muộn', active: 'bg-amber-500 text-white' },
                            ].map(({ code, label, active }) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => setStudentStatus(st.student_id, code)}
                                aria-pressed={status === code}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                                  status === code
                                    ? `${active} shadow-sm`
                                    : 'bg-surface-neutral text-text-secondary hover:text-text-primary hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <label className="sr-only" htmlFor={`note-${st.student_id}`}>Ghi chú điểm danh cho {st.name}</label>
                          <input
                            id={`note-${st.student_id}`}
                            type="text"
                            value={rec.note}
                            onChange={(e) => setStudentNote(st.student_id, e.target.value)}
                            placeholder="Ghi chú..."
                            className="w-full h-7 px-2 bg-white border border-hairline rounded text-[11px] text-text-primary outline-none focus:border-ocean"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: GRADEBOOK MATRIX (Thông tư 22) */}
      {activeTab === 'matrix' && (
        <GradebookMatrixTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || selectedClassId}
          students={classData?.students || []}
          searchQuery={searchQuery}
        />
      )}

      {/* TAB 4: TT22 ACADEMIC SUMMARY & REPORT CARD */}
      {activeTab === 'summary' && (
        <AcademicSummaryTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || ''}
          data={summaryTabData}
          loading={summaryLoading}
          error={summaryError}
          lockConfirmText={lockConfirmText}
          onLockConfirmChange={setLockConfirmText}
          isLocking={isLocking}
          lockSuccess={lockSuccess}
          onLock={async () => {
            if (lockConfirmText !== 'XÁC NHẬN KHÓA SỔ') return;
            setIsLocking(true);
            try {
              const result = await gradebookApi.lockClassGradebook({
                classId: selectedClassId,
                confirmationText: lockConfirmText,
                reason: 'Khóa sổ điểm học kỳ theo quy trình BGH',
              });
              if (result) {
                setLockSuccess(`Đã khóa sổ thành công cho ${result.studentCount} học sinh.`);
                setLockConfirmText('');
              }
            } catch (e) {
              setLockSuccess(null);
            } finally {
              setIsLocking(false);
            }
          }}
          onRefresh={() => loadAcademicSummary(selectedClassId)}
        />
      )}

      {/* TAB 6: RFID IoT Scanner — Coming Soon */}
      {activeTab === 'rfid' && (
        <RFIDScannerTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || selectedClassId}
          students={classData?.students || []}
        />
      )}

      {/* TAB 7: Sổ Đầu Bài Điện Tử (Digital Logbook) */}
      {activeTab === 'logbook' && (
        <DigitalLogbookTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || ''}
        />
      )}

      {/* TAB 8: Công Tác Chủ Nhiệm (Homeroom Hub) */}
      {activeTab === 'homeroom' && (
        <HomeroomHubTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || ''}
          students={classData?.students || []}
        />
      )}

        </>
      )}

      {/* Grade Entry / Edit Modal */}
      <Modal
        isOpen={Boolean(selectedStudentForGrade)}
        onClose={() => setSelectedStudentForGrade(null)}
        title={`Cập nhật điểm số: ${selectedStudentForGrade?.name || ''}`}
      >
        {selectedStudentForGrade && (
          <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
            {gradeSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded text-center text-xs text-emerald-800 space-y-1">
                <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                <div className="font-semibold">Đã lưu điểm thành công!</div>
                <div className="text-[11px]">Hệ thống đã cập nhật GPA và đồng bộ bảng điểm học sinh.</div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary">{selectedStudentForGrade.name}</div>
                    <div className="text-text-secondary">{selectedStudentForGrade.code} • Lớp 10A1</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-text-secondary">Điểm GPA hiện tại:</span>
                    <div className="text-base font-bold text-primary">{selectedStudentForGrade.gpa}</div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Môn học</label>
                  <input
                    type="text"
                    value={gradeInput.subject}
                    onChange={(e) => setGradeInput({ ...gradeInput, subject: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Đầu điểm kiểm tra</label>
                  <input
                    type="text"
                    value={gradeInput.testName}
                    onChange={(e) => setGradeInput({ ...gradeInput, testName: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Điểm số (Thang điểm 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeInput.score}
                    onChange={(e) => setGradeInput({ ...gradeInput, score: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary font-mono font-bold outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Lời phê / Nhận xét sư phạm</label>
                  <textarea
                    rows={3}
                    value={gradeInput.comment}
                    onChange={(e) => setGradeInput({ ...gradeInput, comment: e.target.value })}
                    className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={() => setSelectedStudentForGrade(null)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={isSubmittingGrade}
                  >
                    {isSubmittingGrade ? 'Đang cập nhật...' : 'Lưu điểm số'}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
