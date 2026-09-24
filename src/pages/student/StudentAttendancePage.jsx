import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { attendanceApi } from '../../services/api';
import { UserCheck, FileText, ShieldCheck, TrendingUp, Download, Filter, AlertCircle, Loader2, BookOpen, User } from 'lucide-react';

const STATUS_MAP = {
  PRESENT: { label: 'Co mat', variant: 'success' },
  present: { label: 'Co mat', variant: 'success' },
  LATE: { label: 'Di muon', variant: 'warning' },
  late: { label: 'Di muon', variant: 'warning' },
  EXCUSED: { label: 'Nghi co phep', variant: 'info' },
  excused: { label: 'Nghi co phep', variant: 'info' },
  ABSENT: { label: 'Vang khong phep', variant: 'danger' },
  absent: { label: 'Vang khong phep', variant: 'danger' },
};

function getDay(d) {
  const map = ['CN','T2','T3','T4','T5','T6','T7'];
  try { return map[new Date(d).getDay()]; } catch { return ''; }
}

export function StudentAttendancePage() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    attendanceApi.getStudentAttendance()
      .then((res) => { setAttendance(res); setLoading(false); })
      .catch((err) => { setError(err?.message || 'Khong the tai du lieu'); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const records = attendance?.records || [];
  const hasPeriod = records.some((r) => r.period);
  const filteredRecords = records.filter((r) => {
    const s = (r.statusCode || r.status || '').toUpperCase();
    if (filterStatus === 'PRESENT') return s === 'PRESENT';
    if (filterStatus === 'LATE') return s === 'LATE';
    if (filterStatus === 'EXCUSED') return s === 'EXCUSED';
    if (filterStatus === 'ABSENT') return s === 'ABSENT';
    return true;
  });
  const rate = attendance?.rate ?? null;
  const presentDays = attendance?.presentDays ?? 0;
  const totalDays = attendance?.totalDays ?? 0;
  const lateDays = attendance?.lateDays ?? 0;
  const excusedDays = attendance?.excusedDays ?? 0;
  const absentDays = attendance?.absentDays ?? 0;
  const statusLabel = attendance?.status ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium text-text-primary">So theo doi chuyen can</h1>
            {statusLabel && !loading && !error && (
              <Badge variant={absentDays === 0 ? 'success' : absentDays <= 2 ? 'warning' : 'danger'}>{statusLabel}</Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">Lich su diem danh ca nhan ghi nhan boi giao vien</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => window.print()}>Xuat PDF</Button>
          <Button variant="primary" size="sm" icon={FileText} onClick={() => setIsLeaveModalOpen(true)}>Quy dinh</Button>
        </div>
      </div>

      {loading && (
        <Card padding="p-10" className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-ocean" />
          <p className="text-sm text-text-secondary">Dang tai du lieu...</p>
        </Card>
      )}

      {!loading && error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>Thu lai</Button>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Ty le chuyen can</span>
                {rate !== null && <Badge variant={parseFloat(rate) >= 95 ? 'success' : 'warning'}>{rate}</Badge>}
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-primary">{rate ?? 'N/A'}</div>
                {totalDays > 0 && <div className="text-xs text-text-secondary mt-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /><span>{presentDays} / {totalDays} buoi</span></div>}
              </div>
            </Card>
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Buoi co mat</span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary mt-0.5"></span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-text-primary">{presentDays} <span className="text-sm font-normal text-text-secondary">/ {totalDays}</span></div>
                {lateDays > 0 && <div className="text-xs text-amber-700 mt-1">Di muon {lateDays} buoi</div>}
              </div>
            </Card>
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Di muon</span>
                <Badge variant={lateDays === 0 ? 'success' : 'warning'}>{lateDays} buoi</Badge>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-amber-700">{String(lateDays).padStart(2,'0')} <span className="text-sm font-normal text-text-secondary">buoi</span></div>
              </div>
            </Card>
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Nghi hoc</span>
                <Badge variant={absentDays === 0 ? 'success' : 'danger'}>{absentDays === 0 ? 'Tot' : absentDays + ' vang'}</Badge>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-ocean">{String(excusedDays).padStart(2,'0')} <span className="text-sm font-normal text-text-secondary">co phep</span></div>
                <div className="text-xs text-text-secondary mt-1">{absentDays} buoi vang khong phep</div>
              </div>
            </Card>
          </div>

          <Card padding="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline mb-5">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Nhat ky diem danh</h3>
                <p className="text-xs text-text-secondary mt-0.5">Tong {records.length} ban ghi</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-secondary" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border border-hairline rounded px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:border-ocean">
                  <option value="all">Tat ca</option>
                  <option value="PRESENT">Co mat</option>
                  <option value="LATE">Di muon</option>
                  <option value="EXCUSED">Nghi co phep</option>
                  <option value="ABSENT">Vang khong phep</option>
                </select>
              </div>
            </div>
            {filteredRecords.length === 0 ? (
              <div className="py-10 text-center">
                <UserCheck className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">{records.length === 0 ? 'Chua co ban ghi.' : 'Khong co ban ghi phu hop.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-hairline bg-surface-neutral/60 text-text-secondary font-medium uppercase tracking-wider">
                      <th className="py-3 px-4">Ngay</th>
                      <th className="py-3 px-4">Thu</th>
                      {hasPeriod && <th className="py-3 px-4">Tiet</th>}
                      <th className="py-3 px-4">Mon hoc</th>
                      <th className="py-3 px-4">Giao vien</th>
                      <th className="py-3 px-4">Trang thai</th>
                      <th className="py-3 px-4">Ghi chu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredRecords.map((item, idx) => {
                      const code = (item.statusCode || item.status || '').toUpperCase();
                      const mapped = STATUS_MAP[code] || { label: item.status, variant: 'info' };
                      return (
                        <tr key={idx} className="hover:bg-sky/5 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-text-primary">{item.date}</td>
                          <td className="py-3.5 px-4 text-text-secondary">{getDay(item.date)}</td>
                          {hasPeriod && <td className="py-3.5 px-4 text-text-secondary">{item.period ? 'Tiet ' + item.period : '-'}</td>}
                          <td className="py-3.5 px-4 text-text-secondary"><div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0" /><span>{item.subject || '-'}</span></div></td>
                          <td className="py-3.5 px-4 text-text-secondary"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 shrink-0" /><span>{item.teacher || '-'}</span></div></td>
                          <td className="py-3.5 px-4"><Badge variant={mapped.variant}>{mapped.label}</Badge></td>
                          <td className="py-3.5 px-4 text-text-secondary max-w-xs truncate">{item.note || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl border border-hairline space-y-4">
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ocean" />
                <h3 className="text-lg font-bold text-text-primary">Quy dinh Chuyen can</h3>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-text-secondary hover:text-text-primary p-1 rounded">x</button>
            </div>
            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <p>1. Nghi hoc phai co phu huynh thong bao truoc 07:00 sang ngay nghi.</p>
              <p>2. Di muon qua 3 lan trong thang se anh huong den xep loai hanh kiem.</p>
              <p>3. Vang khong phep qua 3 ngay trong hoc ky se bi xu ly ky luat.</p>
            </div>
            <div className="flex items-center justify-end pt-3 border-t border-hairline">
              <Button variant="primary" size="sm" onClick={() => setIsLeaveModalOpen(false)}>Toi da hieu</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
