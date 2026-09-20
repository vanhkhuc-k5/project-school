import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { studentApi } from '../../services/api';
import {
  Award,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Star,
  Printer,
} from 'lucide-react';

export function StudentGradesPage() {
  const [gradeData, setGradeData] = useState(null);

  useEffect(() => {
    studentApi.getGrades().then((res) => {
      if (res) setGradeData(res);
    });
  }, []);

  if (!gradeData) {
    return (
      <div className="p-12 text-center text-xs text-text-secondary">
        Đang tải bảng điểm điện tử từ cơ sở dữ liệu...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Học bạ & Kết quả học tập</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bảng điểm & Học bạ điện tử</h1>
          <p className="text-xs text-text-secondary mt-1">
            Học kỳ I • Năm học 2024 - 2025 • Điểm số được mã hóa và xác thực bởi Hội đồng Khảo thí
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
            In học bạ số
          </Button>
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Điểm trung bình (GPA)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.overallGpa}</span>
            <span className="text-xs text-text-secondary">/ 10</span>
          </div>
          <div className="mt-2 text-xs text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Xếp loại: Xuất sắc</span>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Thứ hạng trong lớp
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.classRank}</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span>Top 7% học sinh toàn khối 10</span>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Hạnh kiểm & Rèn luyện
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-success tracking-tight">{gradeData.conduct}</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            Chuyên cần: <strong className="text-text-primary">{gradeData.attendanceRate}</strong>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Tổng số tín chỉ học phần
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.totalCredits}</span>
            <span className="text-xs text-text-secondary">tín chỉ</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            100% hoàn thành điều kiện xét tuyển
          </div>
        </Card>
      </div>

      {/* Transcript Table */}
      <Card padding="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-text-primary">Chi tiết điểm các môn học</h2>
            <p className="text-xs text-text-secondary">Đầy đủ các đầu điểm kiểm tra thường xuyên và kiểm tra định kỳ</p>
          </div>
          <Badge variant="info">Học kỳ I</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Môn học</th>
                <th className="py-3 px-4 text-center">Số bài kiểm tra</th>
                <th className="py-3 px-4 text-center">Điểm gần nhất</th>
                <th className="py-3 px-4 text-center">Điểm TB Môn</th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-4">Nhận xét của giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {gradeData.subjects.map((sub, idx) => (
                <tr key={idx} className="hover:bg-surface-neutral/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    {sub.subject}
                  </td>
                  <td className="py-3.5 px-4 text-center text-text-secondary">
                    {sub.testsCount} bài
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-ocean">
                    {sub.recentScore}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-sm text-primary">{sub.average}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={sub.average >= 8.5 ? 'success' : sub.average >= 7.0 ? 'info' : 'warning'} size="sm">
                      {sub.average >= 8.5 ? 'Giỏi' : sub.average >= 7.0 ? 'Khá' : 'Đạt'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary text-xs max-w-xs">
                    {sub.teacherComment || 'Hoàn thành tốt các yêu cầu học phần.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
