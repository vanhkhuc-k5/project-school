/**
 * Admin Academic Setup Page
 * Phase 02 - Academic Configuration
 * 
 * Manages: Academic Years, Semesters, Grade Levels, Classes, 
 * Subjects, Departments, Rooms, Periods
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Calendar, Users, BookOpen, Building2, DoorOpen, Clock,
  ChevronRight, Plus, Search, Edit2, Trash2, Archive, X, Check,
  AlertTriangle, Info, ChevronDown, ChevronUp, RefreshCw, MoreVertical,
  Book, Layers, DoorOpen as RoomIcon, CalendarDays
} from 'lucide-react';
import { api } from '../../services/api';
import type { AcademicYear, Semester, Department } from '../../services/api';
import type { Subject, ClassRoom } from '../../types';

// ============================================================================
// Types
// ============================================================================

type TabId = 'years' | 'semesters' | 'classes' | 'subjects' | 'departments';

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

  const icons = {
    success: <Check className="w-5 h-5 text-green-500" />,
    error: <AlertTriangle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}>
      {icons[toast.type]}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-[#E8F2FA] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#1C6FA8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F3D5C] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7280] text-center max-w-md mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Loading State Component
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
// Confirm Dialog Component
// ============================================================================

function ConfirmDialog({ isOpen, title, message, confirmLabel, onConfirm, onCancel, isDestructive }: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-[#0F3D5C] mb-2">{title}</h3>
        <p className="text-sm text-[#6B7280] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#1C6FA8] hover:bg-[#0F3D5C]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Academic Year Form Modal
// ============================================================================

function YearFormModal({ isOpen, onClose, onSave, initialData }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string; endDate: string; isCurrent: boolean }) => Promise<void>;
  initialData?: AcademicYear;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [startDate, setStartDate] = useState(initialData?.start_date?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(initialData?.end_date?.split('T')[0] || '');
  const [isCurrent, setIsCurrent] = useState(initialData?.is_current || false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setStartDate(initialData.start_date?.split('T')[0] || '');
      setEndDate(initialData.end_date?.split('T')[0] || '');
      setIsCurrent(initialData.is_current);
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên năm học không được để trống';
    if (!startDate) errs.startDate = 'Ngày bắt đầu không được để trống';
    if (!endDate) errs.endDate = 'Ngày kết thúc không được để trống';
    if (startDate && endDate && startDate >= endDate) {
      errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), startDate, endDate, isCurrent });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {initialData ? 'Cập nhật năm học' : 'Thêm năm học mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Tên năm học <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: 2024 - 2025"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 text-[#1C6FA8] border-gray-300 rounded focus:ring-[#1C6FA8]"
            />
            <span className="text-sm text-[#374151]">Đặt làm năm học hiện tại</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Semester Form Modal
// ============================================================================

function SemesterFormModal({ isOpen, onClose, onSave, academicYearId, initialData }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; semesterNumber: number; startDate: string; endDate: string; isCurrent: boolean }) => Promise<void>;
  academicYearId: string;
  initialData?: Semester;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [semesterNumber, setSemesterNumber] = useState(initialData?.semester_number || 1);
  const [startDate, setStartDate] = useState(initialData?.start_date?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(initialData?.end_date?.split('T')[0] || '');
  const [isCurrent, setIsCurrent] = useState(initialData?.is_current || false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSemesterNumber(initialData.semester_number);
      setStartDate(initialData.start_date?.split('T')[0] || '');
      setEndDate(initialData.end_date?.split('T')[0] || '');
      setIsCurrent(initialData.is_current);
    } else {
      setName('');
      setSemesterNumber(1);
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên học kỳ không được để trống';
    if (!semesterNumber || semesterNumber < 1 || semesterNumber > 4) {
      errs.semesterNumber = 'Số thứ tự học kỳ phải từ 1 đến 4';
    }
    if (!startDate) errs.startDate = 'Ngày bắt đầu không được để trống';
    if (!endDate) errs.endDate = 'Ngày kết thúc không được để trống';
    if (startDate && endDate && startDate >= endDate) {
      errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), semesterNumber, startDate, endDate, isCurrent });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {initialData ? 'Cập nhật học kỳ' : 'Thêm học kỳ mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Tên học kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Học kỳ 1"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Số thứ tự học kỳ <span className="text-red-500">*</span>
            </label>
            <select
              value={semesterNumber}
              onChange={(e) => setSemesterNumber(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.semesterNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value={1}>Học kỳ 1</option>
              <option value={2}>Học kỳ 2</option>
              <option value={3}>Học kỳ 3</option>
              <option value={4}>Học kỳ 4</option>
            </select>
            {errors.semesterNumber && <p className="text-xs text-red-500 mt-1">{errors.semesterNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 text-[#1C6FA8] border-gray-300 rounded focus:ring-[#1C6FA8]"
            />
            <span className="text-sm text-[#374151]">Đặt làm học kỳ hiện tại</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Class Form Modal
// ============================================================================

function ClassFormModal({ isOpen, onClose, onSave, initialData, academicYears }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    gradeLevel: number;
    academicYearId: string;
    room?: string;
    maxCapacity?: number;
  }) => Promise<void>;
  initialData?: ClassRoom;
  academicYears: AcademicYear[];
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [gradeLevel, setGradeLevel] = useState(initialData?.gradeLevel || 10);
  const [academicYearId, setAcademicYearId] = useState(initialData?.academicYear || academicYears[0]?.id || '');
  const [room, setRoom] = useState(initialData?.room || '');
  const [maxCapacity, setMaxCapacity] = useState(initialData?.maxStudents || 45);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setGradeLevel(initialData.gradeLevel);
      setAcademicYearId(initialData.academicYear || academicYears[0]?.id || '');
      setRoom(initialData.room || '');
      setMaxCapacity(initialData.maxStudents || 45);
    } else {
      setName('');
      setGradeLevel(10);
      setAcademicYearId(academicYears[0]?.id || '');
      setRoom('');
      setMaxCapacity(45);
    }
    setErrors({});
  }, [initialData, isOpen, academicYears]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên lớp không được để trống';
    if (gradeLevel < 1 || gradeLevel > 12) {
      errs.gradeLevel = 'Khối lớp phải từ 1 đến 12';
    }
    if (!academicYearId) errs.academicYearId = 'Vui lòng chọn năm học';
    if (maxCapacity < 1 || maxCapacity > 80) {
      errs.maxCapacity = 'Sĩ số tối đa phải từ 1 đến 80';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), gradeLevel, academicYearId, room: room.trim() || undefined, maxCapacity });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {initialData ? 'Cập nhật lớp học' : 'Thêm lớp học mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: 10A1"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Khối lớp <span className="text-red-500">*</span>
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.gradeLevel ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Khối {g}</option>
                ))}
              </select>
              {errors.gradeLevel && <p className="text-xs text-red-500 mt-1">{errors.gradeLevel}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Năm học <span className="text-red-500">*</span>
            </label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.academicYearId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">-- Chọn năm học --</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
            {errors.academicYearId && <p className="text-xs text-red-500 mt-1">{errors.academicYearId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Phòng học</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="VD: A101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Sĩ số tối đa <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                min={1}
                max={80}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxCapacity && <p className="text-xs text-red-500 mt-1">{errors.maxCapacity}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Department Form Modal
// ============================================================================

function DepartmentFormModal({ isOpen, onClose, onSave, initialData }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; code?: string; description?: string }) => Promise<void>;
  initialData?: Department;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code || '');
      setDescription(initialData.description || '');
    } else {
      setName('');
      setCode('');
      setDescription('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên tổ bộ môn không được để trống';
    if (name.trim().length < 2) errs.name = 'Tên tổ bộ môn phải có ít nhất 2 ký tự';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {initialData ? 'Cập nhật tổ bộ môn' : 'Thêm tổ bộ môn mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Tên tổ bộ môn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tổ Toán - Tin học"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Mã tổ bộ môn</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: MATH"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả ngắn về tổ bộ môn..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Subject Form Modal
// ============================================================================

function SubjectFormModal({ isOpen, onClose, onSave, initialData, departments }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    code: string;
    departmentId?: string;
    gradeLevel?: number;
    weeklyPeriods?: number;
  }) => Promise<void>;
  initialData?: Subject;
  departments: Department[];
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [departmentId, setDepartmentId] = useState(initialData?.department || '');
  const [gradeLevel, setGradeLevel] = useState<number | undefined>(undefined);
  const [weeklyPeriods, setWeeklyPeriods] = useState(3);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDepartmentId(initialData.department || '');
    } else {
      setName('');
      setCode('');
      setDepartmentId('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên môn học không được để trống';
    if (!code.trim()) errs.code = 'Mã môn học không được để trống';
    if (code.trim().length < 2) errs.code = 'Mã môn học phải có ít nhất 2 ký tự';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        departmentId: departmentId || undefined,
        gradeLevel: gradeLevel || undefined,
        weeklyPeriods,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {initialData ? 'Cập nhật môn học' : 'Thêm môn học mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Tên môn học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Toán học"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                Mã môn học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: MATH"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Tổ bộ môn</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="">-- Chọn tổ bộ môn --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Khối áp dụng</label>
              <select
                value={gradeLevel ?? ''}
                onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              >
                <option value="">Tất cả khối</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Khối {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Số tiết/tuần</label>
              <input
                type="number"
                value={weeklyPeriods}
                onChange={(e) => setWeeklyPeriods(Number(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : initialData ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Academic Years Tab
// ============================================================================

function YearsTab({ onShowToast }: { onShowToast: (type: Toast['type'], message: string) => void }) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ year: AcademicYear } | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | undefined>();

  const fetchYears = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAcademicYears();
      setYears(data);
    } catch {
      onShowToast('error', 'Không thể tải danh sách năm học');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleCreateYear = async (data: { name: string; startDate: string; endDate: string; isCurrent: boolean }) => {
    const res = await api.createAcademicYear(data);
    if (res.success) {
      onShowToast('success', 'Đã tạo năm học mới');
      fetchYears();
    } else {
      onShowToast('error', res.message || 'Không thể tạo năm học');
    }
  };

  const handleUpdateYear = async (data: { name: string; startDate: string; endDate: string; isCurrent: boolean }) => {
    if (!editingYear) return;
    const res = await api.updateAcademicYear(editingYear.id, data);
    if (res.success) {
      onShowToast('success', 'Đã cập nhật năm học');
      fetchYears();
    } else {
      onShowToast('error', res.message || 'Không thể cập nhật năm học');
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteConfirm) return;
    const res = await api.deleteAcademicYear(deleteConfirm.year.id);
    if (res.success) {
      onShowToast('success', 'Đã xóa năm học');
      fetchYears();
    } else {
      onShowToast('error', res.message || 'Không thể xóa năm học');
    }
    setDeleteConfirm(null);
  };

  const handleSetCurrentYear = async (year: AcademicYear) => {
    const res = await api.setCurrentAcademicYear(year.id);
    if (res.success) {
      onShowToast('success', `Đã đặt "${year.name}" làm năm học hiện tại`);
      fetchYears();
    } else {
      onShowToast('error', res.message || 'Không thể đặt năm học hiện tại');
    }
  };

  const handleCreateSemester = async (data: {
    name: string;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }) => {
    if (!selectedYear) return;
    const res = await api.createSemester(selectedYear.id, data);
    if (res.success) {
      onShowToast('success', 'Đã thêm học kỳ mới');
      fetchYears();
      setShowSemesterForm(false);
    } else {
      onShowToast('error', res.message || 'Không thể thêm học kỳ');
    }
  };

  const handleUpdateSemester = async (data: {
    name: string;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }) => {
    if (!selectedYear || !editingSemester) return;
    const res = await api.updateSemester(selectedYear.id, editingSemester.id, data);
    if (res.success) {
      onShowToast('success', 'Đã cập nhật học kỳ');
      fetchYears();
      setEditingSemester(undefined);
    } else {
      onShowToast('error', res.message || 'Không thể cập nhật học kỳ');
    }
  };

  const handleDeleteSemester = async (year: AcademicYear, semester: Semester) => {
    const res = await api.deleteSemester(year.id, semester.id);
    if (res.success) {
      onShowToast('success', 'Đã xóa học kỳ');
      fetchYears();
    } else {
      onShowToast('error', res.message || 'Không thể xóa học kỳ');
    }
  };

  const toggleYearExpand = (yearId: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#0F3D5C]">Danh sách năm học</h3>
          <p className="text-sm text-[#6B7280]">{years.length} năm học</p>
        </div>
        <button
          onClick={() => { setEditingYear(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm năm học
        </button>
      </div>

      {years.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Chưa có năm học"
          description="Bắt đầu bằng việc tạo năm học đầu tiên cho trường."
          action={{ label: 'Thêm năm học', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {years.map((year) => (
            <div key={year.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleYearExpand(year.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    year.is_current ? 'bg-green-100' : 'bg-[#E8F2FA]'
                  }`}>
                    <Calendar className={`w-5 h-5 ${year.is_current ? 'text-green-600' : 'text-[#1C6FA8]'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0F3D5C]">{year.name}</span>
                      {year.is_current && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Hiện tại
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-[#6B7280]">
                      {formatDate(year.start_date)} — {formatDate(year.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B7280]">
                    {year.semesters?.length || 0} học kỳ
                  </span>
                  {expandedYears.has(year.id) ? (
                    <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                  )}
                </div>
              </div>

              {expandedYears.has(year.id) && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#374151]">Học kỳ</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedYear(year); setEditingSemester(undefined); setShowSemesterForm(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1C6FA8] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Thêm học kỳ
                    </button>
                  </div>

                  {year.semesters && year.semesters.length > 0 ? (
                    <div className="space-y-2">
                      {year.semesters.map((sem) => (
                        <div key={sem.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              sem.is_current ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-xs font-bold ${sem.is_current ? 'text-green-600' : 'text-gray-600'}`}>
                                HK{sem.semester_number}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#374151]">{sem.name}</span>
                                {sem.is_current && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                    Hiện tại
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#6B7280]">
                                {formatDate(sem.start_date)} — {formatDate(sem.end_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!sem.is_current && (
                              <button
                                onClick={() => api.setCurrentSemester(year.id, sem.id)}
                                className="p-1.5 text-xs text-green-600 hover:bg-green-50 rounded"
                                title="Đặt làm hiện tại"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedYear(year); setEditingSemester(sem); setShowSemesterForm(true); }}
                              className="p-1.5 text-xs text-[#6B7280] hover:bg-gray-100 rounded"
                              title="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSemester(year, sem)}
                              className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B7280] italic">Chưa có học kỳ nào</p>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    {!year.is_current && (
                      <button
                        onClick={() => handleSetCurrentYear(year)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Đặt làm hiện tại
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingYear(year); setShowForm(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1C6FA8] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Sửa năm học
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ year })}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <YearFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingYear(undefined); }}
        onSave={editingYear ? handleUpdateYear : handleCreateYear}
        initialData={editingYear}
      />

      <SemesterFormModal
        isOpen={showSemesterForm}
        onClose={() => { setShowSemesterForm(false); setSelectedYear(null); setEditingSemester(undefined); }}
        onSave={editingSemester ? handleUpdateSemester : handleCreateSemester}
        academicYearId={selectedYear?.id || ''}
        initialData={editingSemester}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Xóa năm học"
        message={`Bạn có chắc muốn xóa năm học "${deleteConfirm?.year.name}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDeleteYear}
        onCancel={() => setDeleteConfirm(null)}
        isDestructive
      />
    </>
  );
}

// ============================================================================
// Classes Tab
// ============================================================================

function ClassesTab({ academicYears, onShowToast }: {
  academicYears: AcademicYear[];
  onShowToast: (type: Toast['type'], message: string) => void;
}) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<ClassRoom | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<ClassRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch {
      onShowToast('error', 'Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async (data: {
    name: string;
    gradeLevel: number;
    academicYearId: string;
    room?: string;
    maxCapacity?: number;
  }) => {
    const res = await api.createClass(data);
    if (res.success) {
      onShowToast('success', 'Đã tạo lớp học mới');
      fetchClasses();
    } else {
      onShowToast('error', res.message || 'Không thể tạo lớp học');
    }
  };

  const handleUpdateClass = async (data: {
    name: string;
    gradeLevel: number;
    academicYearId: string;
    room?: string;
    maxCapacity?: number;
  }) => {
    if (!editingClass) return;
    const res = await api.updateClass(editingClass.id, data);
    if (res.success) {
      onShowToast('success', 'Đã cập nhật lớp học');
      fetchClasses();
    } else {
      onShowToast('error', res.message || 'Không thể cập nhật lớp học');
    }
  };

  const handleArchiveClass = async () => {
    if (!archiveConfirm) return;
    const res = await api.archiveClass(archiveConfirm.id);
    if (res.success) {
      onShowToast('success', 'Đã lưu trữ lớp học');
      fetchClasses();
    } else {
      onShowToast('error', res.message || 'Không thể lưu trữ lớp học');
    }
    setArchiveConfirm(null);
  };

  const handleDeleteClass = async () => {
    if (!deleteConfirm) return;
    const res = await api.deleteClass(deleteConfirm.id);
    if (res.success) {
      onShowToast('success', 'Đã xóa lớp học');
      fetchClasses();
    } else {
      onShowToast('error', res.message || 'Không thể xóa lớp học');
    }
    setDeleteConfirm(null);
  };

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === null || cls.gradeLevel === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm lớp học..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>
          <select
            value={gradeFilter ?? ''}
            onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          >
            <option value="">Tất cả khối</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>Khối {g}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setEditingClass(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm lớp học
        </button>
      </div>

      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có lớp học"
          description="Tạo lớp học đầu tiên để bắt đầu quản lý."
          action={{ label: 'Thêm lớp học', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Lớp học</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Khối</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Năm học</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Phòng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Sĩ số</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E8F2FA] flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#1C6FA8]" />
                      </div>
                      <span className="font-medium text-[#0F3D5C]">{cls.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#374151]">Khối {cls.gradeLevel}</td>
                  <td className="px-4 py-3 text-sm text-[#374151]">{cls.academicYear || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-[#374151]">{cls.room || '-'}</td>
                  <td className="px-4 py-3 text-sm text-[#374151]">
                    {cls.studentCount || 0}/{cls.maxStudents || 45}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingClass(cls); setShowForm(true); }}
                        className="p-1.5 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setArchiveConfirm(cls)}
                        className="p-1.5 text-[#6B7280] hover:bg-yellow-50 hover:text-yellow-600 rounded"
                        title="Lưu trữ"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cls)}
                        className="p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-500 rounded"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClassFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingClass(undefined); }}
        onSave={editingClass ? handleUpdateClass : handleCreateClass}
        initialData={editingClass}
        academicYears={academicYears}
      />

      <ConfirmDialog
        isOpen={!!archiveConfirm}
        title="Lưu trữ lớp học"
        message={`Lớp "${archiveConfirm?.name}" sẽ được chuyển sang trạng thái lưu trữ. Dữ liệu học sinh và điểm số sẽ được bảo toàn.`}
        confirmLabel="Lưu trữ"
        onConfirm={handleArchiveClass}
        onCancel={() => setArchiveConfirm(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Xóa lớp học"
        message={`Bạn có chắc muốn xóa lớp "${deleteConfirm?.name}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDeleteClass}
        onCancel={() => setDeleteConfirm(null)}
        isDestructive
      />
    </>
  );
}

// ============================================================================
// Subjects Tab
// ============================================================================

function SubjectsTab({ departments, onShowToast }: {
  departments: Department[];
  onShowToast: (type: Toast['type'], message: string) => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch {
      onShowToast('error', 'Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreateSubject = async (data: {
    name: string;
    code: string;
    departmentId?: string;
    gradeLevel?: number;
    weeklyPeriods?: number;
  }) => {
    const res = await api.createSubject(data);
    if (res.success) {
      onShowToast('success', 'Đã thêm môn học mới');
      fetchSubjects();
    } else {
      onShowToast('error', res.message || 'Không thể thêm môn học');
    }
  };

  const handleUpdateSubject = async (data: {
    name: string;
    code: string;
    departmentId?: string;
    gradeLevel?: number;
    weeklyPeriods?: number;
  }) => {
    if (!editingSubject) return;
    const res = await api.updateSubject(editingSubject.id, data);
    if (res.success) {
      onShowToast('success', 'Đã cập nhật môn học');
      fetchSubjects();
    } else {
      onShowToast('error', res.message || 'Không thể cập nhật môn học');
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`Bạn có chắc muốn xóa môn "${subject.name}" không?`)) return;
    const res = await api.deleteSubject(subject.id);
    if (res.success) {
      onShowToast('success', 'Đã xóa môn học');
      fetchSubjects();
    } else {
      onShowToast('error', res.message || 'Không thể xóa môn học');
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm môn học..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          />
        </div>
        <button
          onClick={() => { setEditingSubject(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm môn học
        </button>
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          icon={Book}
          title="Chưa có môn học"
          description="Thêm các môn học để xây dựng chương trình giáo dục."
          action={{ label: 'Thêm môn học', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => (
            <div key={subject.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E8F2FA] flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[#1C6FA8]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0F3D5C]">{subject.name}</h4>
                    <span className="text-xs text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded">
                      {subject.code}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingSubject(subject); setShowForm(true); }}
                    className="p-1.5 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject)}
                    className="p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {subject.department && (
                <p className="mt-3 text-xs text-[#6B7280]">
                  Thuộc tổ: {subject.department}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <SubjectFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingSubject(undefined); }}
        onSave={editingSubject ? handleUpdateSubject : handleCreateSubject}
        initialData={editingSubject}
        departments={departments}
      />
    </>
  );
}

// ============================================================================
// Departments Tab
// ============================================================================

function DepartmentsTab({ onShowToast }: { onShowToast: (type: Toast['type'], message: string) => void }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch {
      onShowToast('error', 'Không thể tải danh sách tổ bộ môn');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreate = async (data: { name: string; code?: string; description?: string }) => {
    const res = await api.createDepartment(data);
    if (res.success) {
      onShowToast('success', 'Đã thêm tổ bộ môn mới');
      fetchDepartments();
    } else {
      onShowToast('error', res.message || 'Không thể thêm tổ bộ môn');
    }
  };

  const handleUpdate = async (data: { name: string; code?: string; description?: string }) => {
    if (!editingDept) return;
    const res = await api.updateDepartment(editingDept.id, data);
    if (res.success) {
      onShowToast('success', 'Đã cập nhật tổ bộ môn');
      fetchDepartments();
    } else {
      onShowToast('error', res.message || 'Không thể cập nhật tổ bộ môn');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await api.deleteDepartment(deleteConfirm.id);
    if (res.success) {
      onShowToast('success', 'Đã xóa tổ bộ môn');
      fetchDepartments();
    } else {
      onShowToast('error', res.message || 'Không thể xóa tổ bộ môn');
    }
    setDeleteConfirm(null);
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <LoadingState />;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tổ bộ môn..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          />
        </div>
        <button
          onClick={() => { setEditingDept(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm tổ bộ môn
        </button>
      </div>

      {filteredDepts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Chưa có tổ bộ môn"
          description="Tạo các tổ bộ môn để tổ chức giáo viên và môn học."
          action={{ label: 'Thêm tổ bộ môn', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {filteredDepts.map((dept) => (
            <div key={dept.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E8F2FA] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#1C6FA8]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#0F3D5C]">{dept.name}</h4>
                      {dept.code && (
                        <span className="text-xs text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded">
                          {dept.code}
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-sm text-[#6B7280] mt-1">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingDept(dept); setShowForm(true); }}
                    className="p-1.5 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(dept)}
                    className="p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingDept(undefined); }}
        onSave={editingDept ? handleUpdate : handleCreate}
        initialData={editingDept}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Xóa tổ bộ môn"
        message={`Bạn có chắc muốn xóa tổ bộ môn "${deleteConfirm?.name}" không?`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDestructive
      />
    </>
  );
}

// ============================================================================
// Coming Soon Placeholders
// ============================================================================

function ComingSoonTab({ title, icon: Icon, description }: {
  title: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <EmptyState
      icon={Icon}
      title={`${title} - Sắp có`}
      description={description}
    />
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

const TABS: Array<{ id: TabId | string; label: string; icon: React.ElementType }> = [
  { id: 'years', label: 'Năm học', icon: Calendar },
  { id: 'semesters', label: 'Học kỳ', icon: CalendarDays },
  { id: 'classes', label: 'Lớp học', icon: Users },
  { id: 'subjects', label: 'Môn học', icon: BookOpen },
  { id: 'departments', label: 'Tổ bộ môn', icon: Building2 },
];

export function AdminAcademicPage() {
  const [activeTab, setActiveTab] = useState<TabId>('years');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Pre-fetch data needed across tabs
    const fetchInitialData = async () => {
      try {
        const [years, depts] = await Promise.all([
          api.getAcademicYears(),
          api.getDepartments(),
        ]);
        setAcademicYears(years);
        setDepartments(depts);
      } catch {
        console.error('Failed to fetch initial data');
      }
    };
    fetchInitialData();
  }, []);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Thiết lập học vụ</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Thiết lập Học vụ</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Quản lý năm học, học kỳ, lớp học, môn học, tổ bộ môn và các thiết lập học vụ khác
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#0F3D5C]">Danh mục</h2>
              </div>
              <nav className="p-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#E8F2FA] text-[#1C6FA8]'
                          : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#374151]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {activeTab === 'years' && <YearsTab onShowToast={showToast} />}
              {activeTab === 'semesters' && (
                <YearsTab onShowToast={showToast} />
              )}
              {activeTab === 'classes' && (
                <ClassesTab academicYears={academicYears} onShowToast={showToast} />
              )}
              {activeTab === 'subjects' && (
                <SubjectsTab departments={departments} onShowToast={showToast} />
              )}
              {activeTab === 'departments' && <DepartmentsTab onShowToast={showToast} />}
            </div>
          </div>
        </div>
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

export default AdminAcademicPage;
