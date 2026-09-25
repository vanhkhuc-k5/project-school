/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentTuitionPage — Tuition invoices and VietQR payment
// Phase 13: Extracted from ParentDashboard.jsx (Tab: tuition)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import { QrCode, Copy, CreditCard, AlertCircle, CheckCircle2, Loader2, Printer } from 'lucide-react';

interface Invoice {
  id: string;
  period: string;
  total: string;
  totalAmount: number;
  dueDate?: string;
  status: string;
  paidAt?: string;
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
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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
    } catch (_err) {
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
      // Reload
      await loadInvoices(selectedChildId!);
    } catch (_err) {
      showToast('Xác nhận thất bại. Vui lòng thử lại.');
    }
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

  return (
    <div className="space-y-6">
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
                  <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean">
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
                  <span>{invoice.qrInfo?.description || '—'}</span>
                  <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>
            {copiedBank && <p className="text-xs text-success font-medium">✓ Đã sao chép số TK!</p>}
            {copiedMemo && <p className="text-xs text-success font-medium">✓ Đã sao chép nội dung!</p>}
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
            <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>In biên lai</Button>
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
                    <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">{inv.receiptNo || `BL-${inv.id.slice(-8)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VietQR Modal */}
      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Thanh toán học phí VietQR">
        <div className="space-y-4 text-center">
          <p className="text-xs text-text-secondary">Quét mã QR bằng ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank...):</p>
          <div className="p-4 bg-white border-2 border-hairline rounded-card inline-block mx-auto shadow-whisper">
            <div className="w-56 h-56 bg-surface-neutral border border-hairline flex flex-col items-center justify-between p-2">
              <div className="flex items-center justify-between w-full px-2 text-[10px] font-bold text-blue-900 border-b pb-1">
                <span>VIETQR</span><span>NAPAS 247</span>
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
              <span className="text-[10px] font-mono font-semibold">{invoice?.total} VNĐ</span>
            </div>
          </div>
          <div className="p-3.5 bg-surface-neutral rounded text-left text-xs space-y-2">
            <div className="flex justify-between"><span className="text-text-secondary">Ngân hàng:</span><span className="font-semibold text-text-primary">{invoice?.qrInfo?.bank || 'Vietcombank'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Số TK:</span>
              <span className="font-mono font-bold text-primary flex items-center gap-1">
                <span>{invoice?.qrInfo?.accountNumber || '—'}</span>
                <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean"><Copy className="w-3.5 h-3.5" /></button>
              </span>
            </div>
            <div className="flex justify-between"><span className="text-text-secondary">Tên TK:</span><span className="font-semibold text-text-primary">{invoice?.qrInfo?.accountName || '—'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Nội dung:</span>
              <span className="font-mono font-medium text-ocean flex items-center gap-1">
                <span>{invoice?.qrInfo?.description || '—'}</span>
                <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean"><Copy className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Button variant="primary" size="md" className="w-full justify-center" onClick={handleConfirmPayment}>
              {paymentSuccess ? '✓ Đã ghi nhận!' : 'Tôi đã thanh toán'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
