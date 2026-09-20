import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { teacherApi } from '../../services/api';
import {
  FileText,
  Download,
  Printer,
  BarChart2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Users,
} from 'lucide-react';

export function TeacherReportsPage() {
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    teacherApi.getReports().then((res) => {
      if (res) setReportData(res);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Báo cáo & Tổng kết chuyên môn</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Báo cáo Sư phạm & Phổ điểm</h1>
          <p className="text-xs text-text-secondary mt-1">
            Tổng kết đánh giá chất lượng dạy học, mức độ nắm bắt chuẩn đầu ra theo từng chuyên đề Toán học.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
            In báo cáo
          </Button>
          <Button variant="primary" size="md" icon={Download}>
            Xuất file Excel tổng hợp
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Học sinh Xuất sắc & Giỏi
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">34</span>
            <span className="text-xs text-text-secondary">/ 42 học sinh</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            Tỷ lệ đạt chuẩn giỏi: <strong className="text-text-primary">81.0%</strong>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Học sinh Khá & Đạt
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ocean tracking-tight">06</span>
            <span className="text-xs text-text-secondary">học sinh</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            Nắm chắc kiến thức căn bản
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Cần phụ đạo tăng cường
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-danger tracking-tight">02</span>
            <span className="text-xs text-text-secondary">học sinh</span>
          </div>
          <div className="mt-2 text-xs text-danger font-medium">
            Đã lập kế hoạch can thiệp sư phạm
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Điểm trung bình toàn khối
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">8.12</span>
            <span className="text-xs text-text-secondary">/ 10</span>
          </div>
          <div className="mt-2 text-xs text-success font-medium">
            +0.35 so với cùng kỳ năm trước
          </div>
        </Card>
      </div>

      {/* Topic Mastery Breakdown */}
      <Card padding="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Mức độ hoàn thành chuẩn đầu ra theo chuyên đề</h2>
            <p className="text-xs text-text-secondary">Dữ liệu tổng hợp từ bài kiểm tra 15 phút, 1 tiết và thi thử định kỳ</p>
          </div>
          <Badge variant="info">Toán học 10</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Chuyên đề kiến thức</th>
                <th className="py-3 px-4 text-center">Điểm TB Lớp</th>
                <th className="py-3 px-4 text-center">Tỷ lệ đạt chuẩn</th>
                <th className="py-3 px-4 text-center">Chỉ tiêu đề ra</th>
                <th className="py-3 px-4">Đánh giá & Khuyến nghị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {reportData?.topics?.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-neutral/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    {item.topic}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-primary">
                    {item.avg}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-ocean">{item.passRate}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-text-secondary">
                    {item.target}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-text-secondary">
                    {item.avg >= 7.5 ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đạt chuẩn chuyên môn vượt mục tiêu.</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Cần bổ sung 2 tiết luyện tập chuyên sâu.</span>
                      </span>
                    )}
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
