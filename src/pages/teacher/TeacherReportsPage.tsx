// TeacherReportsPage.tsx — TypeScript conversion
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TopicReport {
  topic: string;
  avg: string;
  passRate: string;
  target: string;
}

interface ReportData {
  topics: TopicReport[];
}

interface KpiCard {
  label: string;
  value: string | number;
  subtext: string;
  subtextType?: 'default' | 'success' | 'danger';
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function TeacherReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    teacherApi.getReports().then((res) => {
      if (res) setReportData(res as ReportData);
    });
  }, []);

  const kpiCards: KpiCard[] = [
    { label: 'Học sinh Xuất sắc & Giỏi', value: 34, subtext: 'Tỷ lệ đạt chuẩn giỏi: 81.0%', subtextType: 'default' },
    { label: 'Học sinh Khá & Đạt', value: 6, subtext: 'Nắm chắc kiến thức căn bản', subtextType: 'default' },
    { label: 'Cần phụ đạo tăng cường', value: 2, subtext: 'Đã lập kế hoạch can thiệp sư phạm', subtextType: 'danger' },
    { label: 'Điểm trung bình toàn khối', value: '8.12', subtext: '+0.35 so với cùng kỳ năm trước', subtextType: 'success' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Báo cáo &amp; Tổng kết chuyên môn</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Báo cáo Sư phạm &amp; Phổ điểm</h1>
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
        {kpiCards.map((card, idx) => (
          <Card key={idx} padding="p-5">
            <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
              {card.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-semibold tracking-tight ${
                idx === 0 ? 'text-primary' : idx === 1 ? 'text-ocean' : idx === 2 ? 'text-danger' : 'text-primary'
              }`}>
                {card.value}
              </span>
              {idx < 2 && <span className="text-xs text-text-secondary">/ 42 học sinh</span>}
              {idx === 2 && <span className="text-xs text-text-secondary">học sinh</span>}
              {idx === 3 && <span className="text-xs text-text-secondary">/ 10</span>}
            </div>
            <div className={`mt-2 text-xs ${
              card.subtextType === 'success' ? 'text-success font-medium' :
              card.subtextType === 'danger' ? 'text-danger font-medium' :
              'text-text-secondary'
            }`}>
              {card.subtext}
            </div>
          </Card>
        ))}
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
                <th className="py-3 px-4">Đánh giá &amp; Khuyến nghị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {(reportData?.topics || []).map((item: TopicReport, idx: number) => {
                const avgNum = parseFloat(item.avg);
                return (
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
                    <td className="py-3.5 px-4 text-xs">
                      {avgNum >= 7.5 ? (
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
