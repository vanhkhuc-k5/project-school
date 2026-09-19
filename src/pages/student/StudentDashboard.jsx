import React from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { STUDENT_DASHBOARD_DATA } from '../../mock/studentData';
import {
  Calendar,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  BookOpen,
  Info,
  ChevronRight,
} from 'lucide-react';

export function StudentDashboard({ onNavigateToAiTutor }) {
  const data = STUDENT_DASHBOARD_DATA;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary flex items-center gap-2">
            <span>Chào buổi sáng, {data.student.name}</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {data.student.dateText} • Bạn có <strong className="text-danger">{data.student.dueCount} bài tập</strong> cần hoàn thành trước {data.student.dueDeadline}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" icon={Calendar}>
            Lịch biểu hôm nay
          </Button>
          <button
            className="h-11 px-4 rounded bg-sky text-primary hover:bg-sky/80 text-sm font-medium flex items-center gap-2 border border-ocean/20 transition-all"
          >
            <Video className="w-4 h-4 stroke-[1.75]" />
            <span>Vào lớp trực tuyến</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <Card className="flex flex-col justify-between" padding="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                Kế hoạch hàng ngày
              </div>
              <div className="text-sm font-medium text-text-primary mt-1">
                Tiến độ hoàn thành bài học
              </div>
            </div>
            <Badge variant="info">{data.kpis.dailyPlan.percent}% Hoàn tất</Badge>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-2xl font-semibold text-primary">
                {data.kpis.dailyPlan.completed} <span className="text-sm font-normal text-text-secondary">/ {data.kpis.dailyPlan.total} nhiệm vụ</span>
              </div>
              <span className="text-xs text-text-secondary">Còn 2 nhiệm vụ</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden flex">
              <div style={{ width: '60%' }} className="bg-primary h-full"></div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-text-secondary mt-2.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> {data.kpis.dailyPlan.done} Đã xong
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> {data.kpis.dailyPlan.inProgress} Đang làm
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-hairline-darker"></span> {data.kpis.dailyPlan.notStarted} Chưa bắt đầu
              </span>
            </div>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card className="flex flex-col justify-between" padding="p-5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <BookOpen className="w-4 h-4 stroke-[1.75]" />
            </div>
            <Badge variant="danger">{data.kpis.pendingAssignments.urgentCount} Gấp</Badge>
          </div>
          <div className="mt-4">
            <div className="text-xs text-text-secondary">Bài tập đang chờ</div>
            <div className="text-2xl font-semibold text-primary mt-0.5">
              {data.kpis.pendingAssignments.count} <span className="text-sm font-normal text-text-secondary">bài</span>
            </div>
            <div className="text-xs text-danger flex items-center gap-1 mt-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{data.kpis.pendingAssignments.note}</span>
            </div>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card className="flex flex-col justify-between" padding="p-5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <TrendingUp className="w-4 h-4 stroke-[1.75]" />
            </div>
            <Badge variant="success">{data.kpis.weeklyAverage.diff}</Badge>
          </div>
          <div className="mt-4">
            <div className="text-xs text-text-secondary">Điểm trung bình tuần</div>
            <div className="text-2xl font-semibold text-primary mt-0.5">
              {data.kpis.weeklyAverage.score} <span className="text-sm font-normal text-text-secondary">/10</span>
            </div>
            <div className="text-xs text-text-secondary mt-2">
              So với tuần trước ({data.kpis.weeklyAverage.previous})
            </div>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card className="flex flex-col justify-between" padding="p-5">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <Clock className="w-4 h-4 stroke-[1.75]" />
            </div>
            <Badge variant="info">Hôm nay</Badge>
          </div>
          <div className="mt-4">
            <div className="text-xs text-text-secondary">Thời gian học cùng AI</div>
            <div className="text-2xl font-semibold text-primary mt-0.5">
              {data.kpis.aiStudyTime.minutes} <span className="text-sm font-normal text-text-secondary">phút</span>
            </div>
            <div className="text-xs text-ocean flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>{data.kpis.aiStudyTime.note}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assignments & Grades */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Urgent Assignments */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary stroke-[1.75]" />
                <div>
                  <h2 className="text-base font-medium text-text-primary">Bài tập sắp đến hạn</h2>
                  <p className="text-xs text-text-secondary">Sắp xếp theo thứ tự thời hạn gấp nhất</p>
                </div>
              </div>
              <button className="text-xs font-medium text-ocean hover:underline flex items-center gap-1">
                <span>Xem tất cả (5)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {data.urgentAssignments.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-card border border-hairline hover:border-hairline-darker transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ocean">{item.subject}:</span>
                      <h3 className="text-sm font-medium text-text-primary">{item.title}</h3>
                      <Badge variant={item.tagType}>{item.tag}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1 text-danger font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.remaining}</span>
                      </span>
                      <span>•</span>
                      <span>Hạn chót: {item.deadline}</span>
                      <span>•</span>
                      <span>{item.questionInfo}</span>
                    </div>
                  </div>

                  <Button
                    variant={item.tagType === 'danger' ? 'primary' : 'secondary'}
                    size="sm"
                    className="shrink-0 self-start sm:self-center"
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Section: Recent Grades */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary stroke-[1.75]" />
                <div>
                  <h2 className="text-base font-medium text-text-primary">Điểm số & Nhận xét gần nhất</h2>
                  <p className="text-xs text-text-secondary">Được cập nhật tự động từ hệ thống sổ điểm điện tử</p>
                </div>
              </div>
              <button className="text-xs font-medium text-ocean hover:underline flex items-center gap-1">
                <span>Bảng điểm chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-neutral text-text-secondary text-xs hairline-b">
                    <th className="py-2.5 px-3 font-medium">Môn học & Bài kiểm tra</th>
                    <th className="py-2.5 px-3 font-medium text-center">Điểm số</th>
                    <th className="py-2.5 px-3 font-medium">Đánh giá của giáo viên</th>
                    <th className="py-2.5 px-3 font-medium text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {data.recentGrades.map((gr) => (
                    <tr key={gr.id} className="hover:bg-surface-neutral/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-text-primary">{gr.subject}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{gr.testName}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-semibold text-primary text-base leading-none">{gr.score}</div>
                        <div className="text-[11px] text-text-secondary">/{gr.maxScore}</div>
                      </td>
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="text-xs text-text-primary italic">
                          <strong className="not-italic text-ocean">{gr.teacher}:</strong> "{gr.comment}"
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 stroke-[2]" />
                          <span>{gr.status}</span>
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Competencies & Afternoon Timetable */}
        <div className="space-y-6">
          {/* Section: Competency Analysis */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ocean" />
                <h2 className="text-base font-medium text-text-primary">Năng lực chuyên đề</h2>
              </div>
              <Badge variant="info">AI Phân tích</Badge>
            </div>

            {/* Strengths */}
            <div className="space-y-3 mb-5">
              <div className="text-[11px] font-medium text-success uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Điểm mạnh nổi bật</span>
              </div>
              {data.competencies.strengths.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-text-primary">
                    <span>{item.topic}</span>
                    <span className="text-ocean">{item.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.percent}%` }}
                      className="bg-primary h-full rounded-full"
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Needs practice */}
            <div className="space-y-3 mb-5 pt-3 hairline-t">
              <div className="text-[11px] font-medium text-warning-dark uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Cần rèn luyện thêm</span>
              </div>
              {data.competencies.needsPractice.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-text-primary">
                    <span>{item.topic}</span>
                    <span className="text-danger">{item.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.percent}%` }}
                      className="bg-danger h-full rounded-full"
                    ></div>
                  </div>
                  <p className="text-[11px] text-text-secondary">{item.hint}</p>
                </div>
              ))}
            </div>

            {/* AI Tutor Suggestion Widget */}
            <div className="p-4 bg-sky/50 rounded-card border border-ocean/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="w-4 h-4 text-ocean shrink-0" />
                <span>Gợi ý từ Gia sư AI</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {data.competencies.aiSuggestion.message}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToAiTutor}
                >
                  Luyện tập ngay
                </Button>
                <Button variant="secondary" size="sm">
                  Để sau
                </Button>
              </div>
            </div>
          </Card>

          {/* Section: Afternoon Schedule */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-base font-medium text-text-primary">Thời khóa biểu chiều</h2>
              </div>
              <Badge variant="neutral">Hôm nay</Badge>
            </div>

            <div className="space-y-3">
              {data.afternoonSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-surface-neutral rounded border border-hairline space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ocean">{item.period}</span>
                    <span className="text-xs text-text-secondary">{item.time}</span>
                  </div>
                  <div className="text-sm font-medium text-text-primary">{item.subject}</div>
                  <div className="text-xs text-text-secondary">
                    {item.room} • {item.teacher}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-white border border-hairline rounded text-xs text-text-secondary flex items-start gap-2">
              <Info className="w-4 h-4 text-ocean shrink-0 mt-0.5" />
              <span>{data.scheduleNote}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
