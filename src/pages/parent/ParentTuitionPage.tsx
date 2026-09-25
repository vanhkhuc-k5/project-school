/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentTuitionPage — Tuition invoices and VietQR payment
// Phase 13: Extracted from ParentDashboard.jsx (Tab: tuition)
// Phase 38: VietQR Sandbox, confetti, e-receipt printing
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import {
  QrCode, Copy, CreditCard, AlertCircle, CheckCircle2,
  Loader2, Printer, Zap, Receipt, FileText, ShieldAlert,
} from 'lucide-react';

interface Invoice {
  id: string;
  period: string;
  total: string;
  totalAmount: number;
  dueDate?: string;
  status: string;
  paidAt?: string;
  receiptNo?: string;
  items?: Array<{ name: string; amount: number }>;
  qrInfo?: {
    bank?: string;
    accountNumber?: string;
    accountName?: string;
    description?: string;
  };
}

interface PastInvoice {
  id: string;
  period: string;
  total: string;
  paidAt?: string;
  status: string;
  receiptNo?: string;
}

interface InvoicesData {
  currentInvoice?: Invoice | null;
  pastInvoices?: PastInvoice[];
}

interface ReceiptData {
  receiptNo: string;
  schoolName: string;
  schoolAddress: string;
  taxId: string;
  studentName: string;
  className: string;
  billingPeriod: string;
  totalAmount: number;
  amountPaid: number;
  paidAt: string;
  paymentMethod: string;
  transactionRef: string;
  cashierName: string;
  cashierTitle: string;
  lineItems: Array<{ description: string; amount: number }>;
  issuedAt: string;
}

// ── Inline Receipt Modal ────────────────────────────────────────────────────────
function ReceiptModal({
  isOpen,
  onClose,
  invoiceId,
  receiptNo,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  receiptNo: string;
}) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setLoading(true);
      setError(null);
      parentApi.printReceipt(invoiceId).then((res) => {
        if (res?.success && res.data) {
          setReceipt(res.data as ReceiptData);
        } else {
          setError('Không thể tải biên lai.');
        }
        setLoading(false);
      }).catch(() => {
        setError('Không thể tải biên lai.');
        setLoading(false);
      });
    }
  }, [isOpen, invoiceId]);

  const handlePrint = () => window.print();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Biên lai thu tiền học phí" size="lg">
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải biên lai...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Đóng</Button>
        </div>
      ) : receipt ? (
        <div className="space-y-4">
          {/* ── Receipt Print Area ── */}
          <div
            id="receipt-print-area"
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 text-sm"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 space-y-1">
              <div className="text-base font-bold text-[#0F3D5C]">{receipt.schoolName}</div>
              <div className="text-xs text-gray-500">{receipt.schoolAddress}</div>
              <div className="text-xs text-gray-500">MST: {receipt.taxId}</div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-base text-gray-800 uppercase">
              BIÊN LAI THU TIỀN HỌC PHÍ
            </div>

            {/* Receipt No & Date */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>Số biên nhận: <strong className="text-gray-800">{receiptNo || receipt.receiptNo}</strong></span>
              <span>Ngày: {new Date(receipt.paidAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>

            {/* Student Info */}
            <div className="space-y-1 bg-gray-50 rounded p-3">
              <div className="flex justify-between text-xs"><span>Học sinh:</span><strong className="text-gray-800">{receipt.studentName}</strong></div>
              <div className="flex justify-between text-xs"><span>Lớp:</span><strong className="text-gray-800">{receipt.className}</strong></div>
              <div className="flex justify-between text-xs"><span>Kỳ học phí:</span><strong className="text-gray-800">{receipt.billingPeriod}</strong></div>
            </div>

            {/* Line Items */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600 border-b border-dashed border-gray-200 pb-1">
                Chi tiết các khoản thu:
              </div>
              {receipt.lineItems.length > 0 ? (
                receipt.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-gray-700">{item.description}</span>
                    <strong className="text-gray-800">{Number(item.amount).toLocaleString('vi-VN')}đ</strong>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-700">Học phí học kỳ</span>
                  <strong className="text-gray-800">{Number(receipt.amountPaid).toLocaleString('vi-VN')}đ</strong>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-800">Tổng cộng:</span>
                <span className="text-[#0F3D5C]">{Number(receipt.amountPaid).toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-1 bg-gray-50 rounded p-3 text-xs">
              <div className="flex justify-between"><span>Phương thức:</span><strong className="text-gray-800">{receipt.paymentMethod}</strong></div>
              <div className="flex justify-between"><span>NV trả:</span><strong className="text-gray-800">{receipt.studentName}</strong></div>
              <div className="flex justify-between"><span>NV thu:</span><strong className="text-gray-800">{receipt.cashierName}</strong></div>
              <div className="flex justify-between"><span>NV duyệt:</span><strong className="text-gray-800">Nguyễn Văn Minh — Hiệu trưởng</strong></div>
            </div>

            {/* Signature block */}
            <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs">
              <div className="space-y-1">
                <div className="h-10" />
                <div className="font-semibold text-gray-700">Người nộp tiền</div>
                <div className="text-gray-500 text-[10px]">(Ký, ghi rõ họ tên)</div>
              </div>
              <div className="space-y-1">
                <div className="h-10" />
                <div className="font-semibold text-gray-700">{receipt.cashierTitle}</div>
                <div className="text-gray-500 text-[10px]">(Ký, đóng dấu)</div>
              </div>
              <div className="space-y-1">
                <div className="h-10" />
                <div className="font-semibold text-gray-700">Hiệu trưởng</div>
                <div className="text-gray-500 text-[10px]">(Ký, đóng dấu)</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-400 italic border-t border-dashed border-gray-200 pt-2">
              Biên lai này được xuất tự động từ hệ thống EduPortal. Không cần chữ ký khi đã có chữ ký điện tử của thủ quỹ.
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" icon={Printer} onClick={handlePrint}>
              In biên lai
            </Button>
            <Button variant="primary" size="md" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ParentTuitionPage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [invoicesData, setInvoicesData] = useState<InvoicesData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  // UI state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sandboxReceipt, setSandboxReceipt] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Receipt modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<string>('');
  const [receiptInvoiceNo, setReceiptInvoiceNo] = useState<string>('');

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const loadInvoices = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    setInvoicesData(null);
    try {
      const res = await parentApi.getInvoices<InvoicesData>(childId);
      if (res) {
        setInvoicesData(res as InvoicesData);
      }
    } catch {
      setErrorData('Không thể tải hóa đơn học phí.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadInvoices(selectedChildId);
    }
  }, [selectedChildId, loadInvoices]);

  const handleCopyAccount = () => {
    const acc = invoicesData?.currentInvoice?.qrInfo?.accountNumber;
    if (!acc) return;
    navigator.clipboard?.writeText?.(acc);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCopyMemo = () => {
    const memo = invoicesData?.currentInvoice?.qrInfo?.description;
    if (!memo) return;
    navigator.clipboard?.writeText?.(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleConfirmPayment = async () => {
    const invId = invoicesData?.currentInvoice?.id;
    if (!invId) return;
    try {
      await parentApi.payTuition(invId);
      setPaymentSuccess(true);
      showToast('Đã xác nhận thanh toán học phí thành công!');
      setTimeout(() => { setIsQrModalOpen(false); setPaymentSuccess(false); }, 1200);
      await loadInvoices(selectedChildId!);
    } catch {
      showToast('Xác nhận thất bại. Vui lòng thử lại.');
    }
  };

  // G38: Sandbox payment simulation with confetti effect
  const handleSandboxPayment = async () => {
    const invId = invoicesData?.currentInvoice?.id;
    if (!invId) return;
    setIsSimulating(true);
    setSandboxReceipt(null);
    try {
      const res = await parentApi.simulatePayment(invId);
      if (res?.success) {
        setSandboxReceipt(res.receiptNo || '');
        setPaymentSuccess(true);
        showToast('Giả lập thanh toán thành công! Biên lai đã được tạo.');
        // Confetti effect — 1.5s
        triggerConfetti();
        await loadInvoices(selectedChildId!);
      }
    } catch {
      showToast('Giả lập thất bại. Vui lòng thử lại.');
    } finally {
      setIsSimulating(false);
    }
  };

  const triggerConfetti = () => {
    const colors = ['#0F3D5C', '#1C6FA8', '#4CAF50', '#FF9800', '#E91E63'];
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = [
        'position:absolute',
        'width:8px',
        'height:8px',
        `background:${colors[Math.floor(Math.random() * colors.length)]}`,
        `left:${Math.random() * 100}%`,
        'top:-10px',
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
        `transform:rotate(${Math.random() * 360}deg)`,
        `animation:confettiFall ${1 + Math.random() * 1.5}s ease-out forwards`,
        `animation-delay:${Math.random() * 0.5}s`,
        `opacity:${0.7 + Math.random() * 0.3}`,
      ].join(';');
      container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ''; }, 2500);
  };

  const openReceipt = (invoiceId: string, receiptNo?: string) => {
    setReceiptInvoiceId(invoiceId);
    setReceiptInvoiceNo(receiptNo || `BL-${invoiceId.slice(-8)}`);
    setReceiptModalOpen(true);
  };

  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
        </Card>
      </div>
    );
  }

  if (!selectedChild) return null;

  const invoice = invoicesData?.currentInvoice;
  const pastInvoices = invoicesData?.pastInvoices || [];

  // Build VietQR code string
  const studentCode = 'HS001'; // Fallback
  const invoiceCode = invoice?.id?.slice(-8) || 'INV0001';
  const qrCodeString = `EDUPAY_${studentCode}_${invoiceCode}`;
  const totalAmount = invoice?.total || '0';

  return (
    <div className="space-y-6">
      {/* Confetti overlay */}
      <div
        id="confetti-container"
        className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
        aria-hidden="true"
      />

      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Học phí & Thanh toán</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Học phí & Thanh toán</h2>
          <p className="text-xs text-text-secondary mt-1">Thông tin học phí của {selectedChild.name}</p>
        </div>
        <Button variant="primary" size="md" icon={QrCode} onClick={() => setIsQrModalOpen(true)}>
          Mở VietQR
        </Button>
      </div>

      {/* ── Page-Level Sandbox Warning Banner ── */}
      <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              MÔI TRƯỜNG THỬ NGHIỆM (SANDBOX GATEWAY)
            </span>
          </div>
          <div className="text-xs text-amber-700 leading-relaxed">
            Hệ thống đang kết nối thử nghiệm kỹ thuật với cổng thanh toán ngân hàng.
            Quý phụ huynh vui lòng <strong>KHÔNG chuyển tiền thật</strong> vào mã QR này.
            Sử dụng nút <strong>"Giả lập thanh toán"</strong> để trải nghiệm luồng thanh toán.
          </div>
        </div>
      </div>

      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      {isLoadingData ? (
        <div className="space-y-4">
          <div className="h-48 bg-surface-neutral rounded animate-pulse" />
          <div className="h-32 bg-surface-neutral rounded animate-pulse" />
        </div>
      ) : invoice ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Invoice Details */}
          <Card padding="p-6" className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">{invoice.period}</h3>
              <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                {invoice.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </Badge>
            </div>
            <div className="p-5 bg-surface-neutral rounded-card border border-hairline flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Tổng số tiền:</span>
              <span className="text-2xl font-bold text-primary">{invoice.total} đ</span>
            </div>
            {invoice.dueDate && (
              <div className="text-xs text-text-secondary">
                Hạn thanh toán: <strong className="text-text-primary">{invoice.dueDate}</strong>
              </div>
            )}
            {invoice.items && invoice.items.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-text-secondary">Chi tiết:</div>
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-surface-neutral rounded">
                    <span className="text-text-primary">{item.name}</span>
                    <span className="font-medium text-text-primary">{Number(item.amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}
              </div>
            )}
            {invoice.status !== 'paid' && (
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center bg-primary hover:bg-ocean"
                icon={QrCode}
                onClick={() => setIsQrModalOpen(true)}
              >
                Thanh toán VietQR Napas 24/7
              </Button>
            )}
            {invoice.status === 'paid' && invoice.paidAt && (
              <div className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Đã thanh toán ngày {new Date(invoice.paidAt).toLocaleDateString('vi-VN')}
              </div>
            )}
          </Card>

          {/* Bank Info */}
          <Card padding="p-6" className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-semibold text-text-primary">Thông tin tài khoản</h3>
            <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Ngân hàng:</span>
                <span className="font-semibold text-text-primary">{invoice.qrInfo?.bank || 'Vietcombank'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Số TK:</span>
                <span className="font-mono font-bold text-primary flex items-center gap-1">
                  <span>{invoice.qrInfo?.accountNumber || '—'}</span>
                  <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean transition-colors" title="Sao chép số TK">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Tên TK:</span>
                <span className="font-semibold text-text-primary">{invoice.qrInfo?.accountName || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Nội dung:</span>
                <span className="font-mono font-medium text-ocean flex items-center gap-1">
                  <span className="truncate max-w-[140px]">{invoice.qrInfo?.description || '—'}</span>
                  <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean transition-colors shrink-0" title="Sao chép nội dung CK">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>
            {copiedBank && (
              <p className="text-xs text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã sao chép số TK!
              </p>
            )}
            {copiedMemo && (
              <p className="text-xs text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã sao chép nội dung!
              </p>
            )}
          </Card>
        </div>
      ) : (
        <Card className="text-center py-12">
          <CreditCard className="w-12 h-12 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-primary">Không có hóa đơn học phí</p>
        </Card>
      )}

      {/* Past Invoices */}
      {pastInvoices.length > 0 && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Lịch sử thanh toán</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                <tr>
                  <th className="py-3 px-4">Kỳ học phí</th>
                  <th className="py-3 px-3 text-center">Số tiền</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-4">Ngày thanh toán</th>
                  <th className="py-3 px-4">Số biên nhận</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {pastInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-sky/20 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-text-primary">{inv.period}</td>
                    <td className="py-3.5 px-3 text-center font-semibold text-primary">{inv.total} đ</td>
                    <td className="py-3.5 px-3 text-center">
                      <Badge variant="success" size="sm">Đã thanh toán</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">
                      {inv.receiptNo || `BL-${inv.id.slice(-8)}`}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={FileText}
                        onClick={() => openReceipt(inv.id, inv.receiptNo)}
                      >
                        In / Tải biên lai
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── VietQR Modal ── */}
      <Modal isOpen={isQrModalOpen} onClose={() => { setIsQrModalOpen(false); setPaymentSuccess(false); setSandboxReceipt(null); }} title="Thanh toán học phí VietQR">
        <div className="space-y-4 text-center">
          {/* Modal Sandbox Warning */}
          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-lg flex items-start gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                MÔI TRƯỜNG THỬ NGHIỆM (SANDBOX GATEWAY)
              </div>
              <div className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                Hệ thống đang kết nối thử nghiệm kỹ thuật với cổng thanh toán ngân hàng.
                Quý phụ huynh vui lòng <strong>KHÔNG chuyển tiền thật</strong> vào mã QR này.
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary">
            Quét mã QR bằng ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank...):
          </p>

          {/* QR Code Display */}
          <div className="p-4 bg-white border-2 border-hairline rounded-card inline-block mx-auto shadow-whisper">
            <div className="w-60 h-60 bg-surface-neutral border border-hairline flex flex-col items-center justify-between p-2 rounded">
              <div className="flex items-center justify-between w-full px-2 text-[10px] font-bold text-blue-900 border-b pb-1">
                <span>VIETQR</span>
                <span>NAPAS 247</span>
              </div>
              <svg className="w-36 h-36" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="25" height="25" fill="#0F3D5C" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#0F3D5C" />
                <rect x="70" y="5" width="25" height="25" fill="#0F3D5C" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#0F3D5C" />
                <rect x="5" y="70" width="25" height="25" fill="#0F3D5C" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#0F3D5C" />
                <rect x="35" y="35" width="30" height="30" fill="#0F3D5C" />
                <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
                <circle cx="50" cy="50" r="4" fill="#0F3D5C" />
              </svg>
              <div className="w-full px-2 text-center">
                <div className="text-[10px] font-mono font-semibold text-[#0F3D5C]">{totalAmount} VNĐ</div>
                <div className="text-[9px] text-text-secondary mt-0.5 break-all leading-tight">
                  {qrCodeString}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Info in Modal */}
          <div className="p-3.5 bg-surface-neutral rounded text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Ngân hàng:</span>
              <span className="font-semibold text-text-primary">{invoice?.qrInfo?.bank || 'Vietcombank'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Số TK:</span>
              <span className="font-mono font-bold text-primary flex items-center gap-1">
                <span>{invoice?.qrInfo?.accountNumber || '—'}</span>
                <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean transition-colors" title="Sao chép số TK">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedBank && <span className="text-[10px] text-success">✓</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tên TK:</span>
              <span className="font-semibold text-text-primary">{invoice?.qrInfo?.accountName || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Nội dung CK:</span>
              <span className="font-mono font-medium text-ocean flex items-center gap-1">
                <span className="truncate max-w-[120px]">{invoice?.qrInfo?.description || qrCodeString}</span>
                <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean transition-colors shrink-0" title="Sao chép nội dung CK">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedMemo && <span className="text-[10px] text-success">✓</span>}
              </span>
            </div>
          </div>

          {/* Sandbox Simulation Result */}
          {sandboxReceipt && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-left">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-emerald-800">Giả lập thành công!</span>
              </div>
              <div className="text-[11px] text-emerald-700">Số biên nhận: <span className="font-mono font-semibold">{sandboxReceipt}</span></div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Trạng thái hóa đơn đã chuyển sang <strong>ĐÃ THANH TOÁN</strong>.</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={handleConfirmPayment}
              disabled={paymentSuccess || invoice?.status === 'paid'}
            >
              {paymentSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Đã ghi nhận!
                </span>
              ) : 'Tôi đã thanh toán'}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center bg-[#1C6FA8] hover:bg-[#0F3D5C]"
              icon={isSimulating ? Loader2 : Zap}
              onClick={handleSandboxPayment}
              disabled={isSimulating || paymentSuccess || invoice?.status === 'paid'}
            >
              {isSimulating ? 'Đang giả lập...' : (
                <span className="flex items-center gap-2">
                  ⚡ Giả lập Thanh toán Thành công (Test Sandbox)
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        invoiceId={receiptInvoiceId}
        receiptNo={receiptInvoiceNo}
      />

      {/* Print styles */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: fixed; inset: 0; z-index: 9999;
            border: none; box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
