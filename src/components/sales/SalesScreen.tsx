import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { SaleInvoice } from '../../types/index.ts';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal.tsx';
import {
  Receipt,
  Search,
  Printer,
  Ban,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
} from 'lucide-react';

export const SalesScreen: React.FC = () => {
  const { branch, user, language, showToast } = useApp();
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('طلب العميل إلغاء العملية فوراً');
  const [cancelling, setCancelling] = useState<boolean>(false);

  const loadInvoices = () => {
    if (!branch) return;
    setLoading(true);
    fetch(`/api/sales?branchId=${branch.id}&search=${encodeURIComponent(search)}&status=${statusFilter}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setInvoices(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, [branch, search, statusFilter]);

  const handleOpenReceipt = (invoice: SaleInvoice) => {
    setSelectedInvoice(invoice);
    setShowReceiptModal(true);
  };

  const handleOpenCancel = (invoice: SaleInvoice) => {
    setSelectedInvoice(invoice);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedInvoice || !user) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/sales/${selectedInvoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          userId: user.id,
          userName: user.nameAr,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(language === 'ar' ? 'تم إلغاء الفاتورة وإرجاع الأصناف للمخزن' : 'Invoice cancelled', 'success');
        setShowCancelModal(false);
        loadInvoices();
      } else {
        showToast(data.messageAr || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('Error cancelling invoice', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'سجل فواتير المبيعات' : 'Sales Invoices'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? `عرض وإعادة طباعة فواتير مبيعات فرع: ${branch?.nameAr}`
              : `Sales history for ${branch?.nameEn}`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice # or customer...'}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="completed">{language === 'ar' ? 'مكتملة (Completed)' : 'Completed'}</option>
            <option value="returned">{language === 'ar' ? 'مرتجعة (Returned)' : 'Returned'}</option>
            <option value="cancelled">{language === 'ar' ? 'ملغاة (Voided)' : 'Voided'}</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 text-start">رقم الفاتورة</th>
              <th className="py-3 px-3 text-start">التاريخ والوقت</th>
              <th className="py-3 px-3 text-start">الكاشير</th>
              <th className="py-3 px-3 text-start">العميل</th>
              <th className="py-3 px-3 text-start">طريقة الدفع</th>
              <th className="py-3 px-3 text-end">الإجمالي</th>
              <th className="py-3 px-3 text-center">الحالة</th>
              <th className="py-3 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                  لا توجد فواتير مبيعات مطابقة
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {inv.date} <span className="text-slate-400">{inv.time}</span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-800">{inv.cashierName}</td>

                  <td className="py-3 px-3 text-slate-600">{inv.customerName || 'عميل نقدي عام'}</td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {inv.payments.map((p) => (p.method === 'cash' ? 'نقدي' : p.method === 'card' ? 'بطاقة' : p.method)).join(', ')}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-end font-mono font-black text-slate-900 text-sm">
                    {inv.total.toFixed(2)} ج.م
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        inv.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'returned'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status === 'completed'
                        ? 'مكتملة'
                        : inv.status === 'returned'
                        ? 'مرتجعة'
                        : 'ملغاة (Void)'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenReceipt(inv)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="معاينة وطباعة الفاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {inv.status === 'completed' && (
                        <button
                          onClick={() => handleOpenCancel(inv)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="إلغاء الفاتورة (Void)"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedInvoice && (
        <ThermalReceiptModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowReceiptModal(false);
            loadInvoices();
          }}
        />
      )}

      {/* Cancel Invoice Modal */}
      {showCancelModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>إلغاء الفاتورة ({selectedInvoice.invoiceNumber})</span>
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-rose-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                تحذير: سيؤدي إلغاء الفاتورة إلى إرجاع كافة أصناف الفاتورة للمخزن تلقائياً، وخصم قيمة المبيعات من وردية الكاشير وتسجيل العملية في سجل المراقبة (Audit Log).
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">سبب الإلغاء الإلزامي:</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {cancelling ? 'جارٍ الإلغاء...' : 'تأكيد إلغاء الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
