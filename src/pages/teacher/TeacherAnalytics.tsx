// TeacherAnalytics.tsx — TypeScript conversion with real API integration
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { TEACHER_ANALYTICS_DATA } from '../../mock/teacherData';
import { teacherApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Filter,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  BookPlus,
  TrendingUp,
  Clock,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  code: string;
  gpa: number;
  gpaDiff: string;
  submissionRate: number;
  riskLevel: 'high' | 'warning' | 'good';
  riskBadgeType: 'danger' | 'warning' | 'success';
  riskText: string;
  avatarColor: string;
  initials: string;
  keyTopics: string[];
}

interface RadarInsight {
  title: string;
  percent: string;
  desc: string;
}

interface InterventionAlert {
  title: string;
  description: string;
  countBadge: string;
}

interface Recommendation {
  week: string;
  content: string;
}

interface KpiProficiency {
  value: string;
  note: string;
  change: string;
}

interface AnalyticsData {
  currentClass: string;
  classes: string[];
  terms: string[];
  topics: string[];
  students: Student[];
  kpis: {
    proficiency: KpiProficiency;
    passing: { current: number; total: number; note: string };
    monitoring: { count: number; note: string; tag: string };
    danger: { count: number; note: string; tag: string };
  };
  radarInsights: { strength: RadarInsight; weakness: RadarInsight };
  recommendation: Recommendation;
  interventionAlert: InterventionAlert;
  lastUpdated: string;
}

type RosterTab = 'all' | 'high_risk' | 'warning' | 'good';

// ─── Main Component ────────────────────────────────────────────────────────────

export function TeacherAnalytics() {
  const navigate = useNavigate();
  const { triggerSync } = useSync();

  const [data, setData] = useState<AnalyticsData>(TEACHER_ANALYTICS_DATA as unknown as AnalyticsData);
  const [selectedClass, setSelectedClass] = useState(data.currentClass);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('Tất cả chuyên đề');
  const [studentSearch, setStudentSearch] = useState('');
  const [activeRosterTab, setActiveRosterTab] = useState<RosterTab>('all');
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [isSubmittingNotify, setIsSubmittingNotify] = useState(false);

  useEffect(() => {
    let mounted = true;
    teacherApi.getAnalytics().then((res) => {
      if (mounted && res) {
        setData(res as AnalyticsData);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Filter students
  const filteredStudents = (data?.students || []).filter((st: Student) => {
    const matchSearch =
      st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.code.toLowerCase().includes(studentSearch.toLowerCase());
    if (!matchSearch) return false;
    if (activeRosterTab === 'high_risk') return st.riskLevel === 'high';
    if (activeRosterTab === 'warning') return st.riskLevel === 'warning';
    if (activeRosterTab === 'good') return st.riskLevel === 'good';
    return true;
  });

  const handleSendNotification = async () => {
    setIsSubmittingNotify(true);
    try {
      await teacherApi.notifyParents();
      await triggerSync();
      setNotifySuccess(true);
      setTimeout(() => {
        setNotifySuccess(false);
        setIsNotifyModalOpen(false);
      }, 1800);
    } finally {
      setIsSubmittingNotify(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Phân tích năng lực học sinh</span>
            <Badge variant="info" size="sm">Báo cáo sư phạm học kỳ</Badge>
            <span className="text-[11px] text-text-secondary">• {data.lastUpdated}</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Phân tích năng lực học sinh</h1>
          <p className="text-xs text-text-secondary mt-1">
            Theo dõi mức độ nắm bắt kiến thức chuyên đề và nhận diện sớm học sinh cần can thiệp hỗ trợ học tập.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={Filter}
            onClick={() => setActiveRosterTab(activeRosterTab === 'all' ? 'high_risk' : 'all')}
          >
            {activeRosterTab === 'high_risk' ? 'Tất cả học sinh' : 'Lọc học sinh nguy cơ'}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Download}
            onClick={() => window.print()}
          >
            In báo cáo sư phạm
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <Card padding="p-4" className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary whitespace-nowrap">Lớp giảng dạy:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            {data.classes.map((c: string, i: number) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary whitespace-nowrap">Giai đoạn:</span>
          <select className="h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none">
            {data.terms.map((t: string, i: number) => (
              <option key={i} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="h-5 w-px bg-hairline hidden md:block"></div>

        {/* Topic chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {data.topics.map((top: string, idx: number) => (
            <button
              key={idx}
              onClick={() => setSelectedTopicFilter(top)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition-colors ${
                selectedTopicFilter === top
                  ? 'bg-primary text-white'
                  : 'bg-surface-neutral text-text-secondary hover:text-text-primary hover:bg-hairline/50'
              }`}
            >
              {top}
            </button>
          ))}
        </div>
      </Card>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs text-text-secondary">Mức độ thành thạo chung</span>
            <Badge variant="success">{data.kpis.proficiency.change}</Badge>
          </div>
          <div className="text-3xl font-semibold text-primary mt-2">
            {data.kpis.proficiency.value}
          </div>
          <div className="text-xs text-text-secondary mt-2">
            {data.kpis.proficiency.note}
          </div>
        </Card>

        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs text-text-secondary">Đạt chuẩn & Tiến bộ</span>
            <Badge variant="success">81.0%</Badge>
          </div>
          <div className="text-3xl font-semibold text-primary mt-2">
            {data.kpis.passing.current} <span className="text-sm font-normal text-text-secondary">/ {data.kpis.passing.total} em</span>
          </div>
          <div className="text-xs text-text-secondary mt-2">
            {data.kpis.passing.note}
          </div>
        </Card>

        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs text-text-secondary">Cần theo dõi sát</span>
            <Badge variant="warning">{data.kpis.monitoring.tag}</Badge>
          </div>
          <div className="text-3xl font-semibold text-warning-dark mt-2">
            {data.kpis.monitoring.count} <span className="text-sm font-normal text-text-secondary">học sinh</span>
          </div>
          <div className="text-xs text-text-secondary mt-2">
            {data.kpis.monitoring.note}
          </div>
        </Card>

        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs text-text-secondary">Nguy cơ tụt hạng cao</span>
            <Badge variant="danger">{data.kpis.danger.tag}</Badge>
          </div>
          <div className="text-3xl font-semibold text-danger mt-2">
            {data.kpis.danger.count} <span className="text-sm font-normal text-text-secondary">học sinh</span>
          </div>
          <div className="text-xs text-danger mt-2 font-medium">
            {data.kpis.danger.note}
          </div>
        </Card>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Radar Chart & Subject Analysis */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="p-6" className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-text-primary">Năng lực theo chuyên đề</h2>
                <p className="text-xs text-text-secondary">So sánh thực tế lớp 10A1 với Chuẩn kỳ vọng Bộ GD&ĐT</p>
              </div>
              <Info className="w-4 h-4 text-text-secondary" />
            </div>

            {/* Custom SVG Radar / Spider Chart */}
            <div className="flex flex-col items-center justify-center py-2">
              <svg className="w-full max-w-[320px] aspect-square" viewBox="0 0 320 320">
                <polygon points="160,30 284,120 236,268 84,268 36,120" fill="none" stroke="#E1E6EB" strokeWidth="1" />
                <polygon points="160,65 248,129 214,234 106,234 72,129" fill="none" stroke="#E1E6EB" strokeWidth="1" />
                <polygon points="160,100 212,138 192,201 128,201 108,138" fill="none" stroke="#E1E6EB" strokeWidth="1" />
                <line x1="160" y1="160" x2="160" y2="30" stroke="#E1E6EB" strokeWidth="1" />
                <line x1="160" y1="160" x2="284" y2="120" stroke="#E1E6EB" strokeWidth="1" />
                <line x1="160" y1="160" x2="236" y2="268" stroke="#E1E6EB" strokeWidth="1" />
                <line x1="160" y1="160" x2="84" y2="268" stroke="#E1E6EB" strokeWidth="1" />
                <line x1="160" y1="160" x2="36" y2="120" stroke="#E1E6EB" strokeWidth="1" />
                <polygon points="160,62 250,131 216,237 104,237 70,131" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4" />
                <polygon points="160,45 259,128 198,218 106,237 63,129" fill="#0F3D5C" fillOpacity="0.15" stroke="#0F3D5C" strokeWidth="2" />
                <circle cx="160" cy="45" r="4" fill="#0F3D5C" />
                <circle cx="259" cy="128" r="4" fill="#0F3D5C" />
                <circle cx="198" cy="218" r="4" fill="#D64545" />
                <circle cx="106" cy="237" r="4" fill="#0F3D5C" />
                <circle cx="63" cy="129" r="4" fill="#0F3D5C" />
                <text x="160" y="20" textAnchor="middle" fontSize="11" fill="#1B2B3A" fontWeight="500">Hàm số &amp; Đồ thị (88%)</text>
                <text x="290" y="125" textAnchor="start" fontSize="11" fill="#1B2B3A" fontWeight="500">PT &amp; BPT (80%)</text>
                <text x="202" y="285" textAnchor="middle" fontSize="11" fill="#D64545" fontWeight="500">Hình không gian (54%)</text>
                <text x="75" y="285" textAnchor="middle" fontSize="11" fill="#1B2B3A" fontWeight="500">Lượng giác (72%)</text>
                <text x="30" y="125" textAnchor="end" fontSize="11" fill="#1B2B3A" fontWeight="500">Xác suất TK (78%)</text>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-text-secondary pt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-primary rounded-sm"></span>
                <span>Thực tế lớp 10A1</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-hairline-darker"></span>
                <span>Chuẩn học kỳ (71%)</span>
              </span>
            </div>

            {/* Insights Callouts */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>{data.radarInsights.strength.title}</span>
                  </span>
                  <span className="text-success">{data.radarInsights.strength.percent}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{data.radarInsights.strength.desc}</p>
              </div>

              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                    <span>{data.radarInsights.weakness.title}</span>
                  </span>
                  <span className="text-danger">{data.radarInsights.weakness.percent}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{data.radarInsights.weakness.desc}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 7 Cols: Student Watchlist Roster */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Danh sách theo dõi học sinh</h2>
                <p className="text-xs text-text-secondary">Xếp hạng theo chỉ số rủi ro học tập cần can thiệp</p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tìm tên hoặc mã học sinh..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-surface-neutral border border-hairline rounded focus:border-ocean outline-none"
                />
              </div>
            </div>

            {/* Roster Tabs */}
            <div className="flex items-center gap-2 border-b border-hairline pb-2 mb-3 text-xs">
              <button onClick={() => setActiveRosterTab('all')} className={`pb-1 font-medium transition-colors border-b-2 -mb-2.5 px-2 ${
                activeRosterTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>Tất cả (42)</button>
              <button onClick={() => setActiveRosterTab('high_risk')} className={`pb-1 font-medium transition-colors border-b-2 -mb-2.5 px-2 ${
                activeRosterTab === 'high_risk' ? 'border-danger text-danger' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>Nguy cơ cao (3)</button>
              <button onClick={() => setActiveRosterTab('warning')} className={`pb-1 font-medium transition-colors border-b-2 -mb-2.5 px-2 ${
                activeRosterTab === 'warning' ? 'border-warning-dark text-warning-dark' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>Cần chú ý (5)</button>
              <button onClick={() => setActiveRosterTab('good')} className={`pb-1 font-medium transition-colors border-b-2 -mb-2.5 px-2 ${
                activeRosterTab === 'good' ? 'border-success text-success' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>Tốt &amp; Xuất sắc (34)</button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-neutral text-text-secondary hairline-b">
                    <th className="py-2.5 px-3 font-medium">Học sinh</th>
                    <th className="py-2.5 px-3 font-medium text-center">Điểm TB</th>
                    <th className="py-2.5 px-3 font-medium text-center">Tỷ lệ nộp bài</th>
                    <th className="py-2.5 px-3 font-medium">Tình trạng &amp; Nguy cơ</th>
                    <th className="py-2.5 px-3 font-medium">Chuyên đề trọng tâm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredStudents.map((st: Student) => (
                    <tr key={st.id} className="hover:bg-surface-neutral/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-[11px] ${st.avatarColor}`}>
                            {st.initials}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{st.name}</div>
                            <div className="text-[11px] text-text-secondary">{st.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-semibold text-text-primary text-sm">{st.gpa}</div>
                        <div className={`text-[10px] ${st.gpaDiff.startsWith('+') ? 'text-success' : 'text-danger'}`}>{st.gpaDiff}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-medium text-text-primary">{st.submissionRate}%</div>
                        <div className="w-12 h-1 bg-surface-neutral rounded-full mx-auto mt-1 overflow-hidden">
                          <div style={{ width: `${st.submissionRate}%` }} className={`h-full ${st.submissionRate < 70 ? 'bg-danger' : 'bg-primary'}`}></div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={st.riskBadgeType} size="sm">{st.riskText}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {st.keyTopics.map((top: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-surface-neutral text-[10px] text-text-secondary border border-hairline">{top}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 hairline-t text-xs text-text-secondary mt-2">
              <span>Hiển thị 6 trong tổng số 42 học sinh (Trang 1 / 7)</span>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-medium text-xs">1</button>
                <button className="w-6 h-6 rounded hover:bg-surface-neutral flex items-center justify-center text-xs">2</button>
                <button className="w-6 h-6 rounded hover:bg-surface-neutral flex items-center justify-center text-xs">3</button>
                <span>...</span>
                <button className="w-6 h-6 rounded hover:bg-surface-neutral flex items-center justify-center text-xs">7</button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Pedagogical Recommendations & Parent Intervention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="p-5" className="bg-sky/30 border border-ocean/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <BookPlus className="w-4 h-4 text-ocean" />
            <span>{data.recommendation.week}</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{data.recommendation.content}</p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={() => navigate('/teacher/assignments/create')}>Tạo chuyên đề bài tập bổ trợ</Button>
            <Button variant="secondary" size="sm">Xem giáo án gợi ý</Button>
          </div>
        </Card>

        <Card padding="p-5" className="border border-red-200 bg-red-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-danger">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <span>{data.interventionAlert.title}</span>
            </div>
            <Badge variant="danger" size="sm">{data.interventionAlert.countBadge}</Badge>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{data.interventionAlert.description}</p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="sm" className="bg-primary text-white hover:bg-ocean" icon={Send} onClick={() => setIsNotifyModalOpen(true)}>Gửi thông báo phụ huynh</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/teacher/assignments/create')}>Tạo nhóm bài phụ đạo</Button>
          </div>
        </Card>
      </div>

      {/* Modal: Gửi thông báo phụ huynh */}
      <Modal isOpen={isNotifyModalOpen} onClose={() => setIsNotifyModalOpen(false)} title="Gửi thông báo can thiệp sư phạm đến phụ huynh">
        <div className="space-y-4 text-xs text-text-secondary">
          <p className="leading-relaxed text-text-primary">
            Hệ thống sẽ gửi phiếu báo kết quả học tập và thông báo trực tiếp qua ứng dụng di động cho phụ huynh của <strong>03 học sinh</strong>:
          </p>
          <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-2">
            <div>• Trần Minh Khoa (HS110042) - Phụ huynh: Ông Trần Tuấn Nam</div>
            <div>• Nguyễn Hoàng Yến (HS110018) - Phụ huynh: Bà Lê Thị Mai</div>
            <div>• Lê Quốc Bảo (HS110008) - Phụ huynh: Ông Lê Minh Quân</div>
          </div>
          <p className="text-[11px] text-text-secondary">Nội dung: Thông báo tiến độ chuyên đề Hình không gian &amp; Đề xuất buổi phụ đạo chiều thứ Năm.</p>

          {notifySuccess && (
            <div className="p-3 bg-emerald-50 text-success rounded border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Đã gửi thành công 3 thông báo đến phụ huynh qua EduShield SMS &amp; App!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 hairline-t">
            <Button variant="secondary" size="sm" onClick={() => setIsNotifyModalOpen(false)}>Đóng</Button>
            <Button variant="primary" size="sm" icon={Send} onClick={handleSendNotification} disabled={notifySuccess}>Xác nhận gửi ngay</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
