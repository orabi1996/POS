import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { SaleInvoice, CartItem } from '../../types/index.ts';
import { RotateCcw, Search, CheckCircle2, AlertCircle, Banknote, ShieldCheck } from 'lucide-react';

interface ReturnItemState {
  productId: string;
  productNameAr: string;
  originalQty: number;
  returnQty: number;
  unitPrice: number;
  selected: boolean;
}

export const ReturnsScreen: React.FC = () => {
  const { branch, user, activeShift, language, showToast } = useApp();
  const [invoiceQuery, setInvoiceQuery] = useState<string>('');
  const [foundInvoice, setFoundInvoice] = useState<SaleInvoice | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [restock, setRestock] = useState<boolean>(true);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'customer_balance'>('cash');
  const [returnReason, setReturnReason] = useState<string>('رغبة العميل في الاسترجاع');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceQuery.trim()) return;

    try {
      const res = await fetch(`/api/sales?branchId=${branch?.id || 'BR01'}&search=${encodeURIComponent(invoiceQuery.trim())}`);
      const data: SaleInvoice[] = await res.json();
      const match = data.find((inv) => inv.invoiceNumber.toLowerCase() === invoiceQuery.trim().toLowerCase());

      if (match) {
        if (match.status === 'cancelled') {
          showToast(language === 'ar' ? 'هذه الفاتورة ملغاة بالفعل!' : 'Invoice is already voided!', 'error');
          return;
        }
        setFoundInvoice(match);
        setReturnItems(
          match.items.map((item) => ({
            productId: item.productId,
            productNameAr: item.productNameAr,
            originalQty: item.quantity,
            returnQty: item.quantity,
            unitPrice: item.price,
            selected: true,
          }))
        );
      } else {
        showToast(language === 'ar' ? 'لم يتم العثور على فاتورة بهذا الرقم' : 'Invoice not found', 'error');
        setFoundInvoice(null);
      }
    } catch (err) {
      showToast('Error searching invoice', 'error');
    }
  };

  const handleToggleItem = (idx: number) => {
    setReturnItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleQtyChange = (idx: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((it, i) => {
        if (i === idx) {
          const clamped = Math.max(1, Math.min(it.originalQty, qty));
          return { ...it, returnQty: clamped };
        }
        return it;
      })
    );
  };

  const totalRefundAmount = returnItems
    .filter((it) => it.selected)
    .reduce((sum, it) => sum + it.returnQty * it.unitPrice, 0);

  const handleSubmitReturn = async () => {
    if (!foundInvoice || !user || !branch) return;
    if (!activeShift) {
      showToast(language === 'ar' ? 'يجب فتح وردية كاشير لتنفيذ استرداد النقدية!' : 'Please open a shift first!', 'error');
      return;
    }

    const selectedToReturn = returnItems.filter((it) => it.selected && it.returnQty > 0);
    if (selectedToReturn.length === 0) {
      showToast(language === 'ar' ? 'يرجى تحديد صنف واحد على الأقل للاسترجاع' : 'Select at least one item', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: foundInvoice.id,
          originalInvoiceNumber: foundInvoice.invoiceNumber,
          branchId: branch.id,
          cashierId: user.id,
          cashierName: user.nameAr,
          shiftId: activeShift.id,
          items: selectedToReturn.map((it) => ({
            productId: it.productId,
            productNameAr: it.productNameAr,
            quantity: it.returnQty,
            unitPrice: it.unitPrice,
            refundAmount: it.returnQty * it.unitPrice,
            restock,
          })),
          totalRefund: totalRefundAmount,
          refundMethod,
          reason: returnReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          language === 'ar'
            ? `تم تسجيل مرتجع المبيعات بنجاح برقم: ${data.returnInvoice.returnNumber}`
            : 'Return recorded successfully',
          'success'
        );
        setFoundInvoice(null);
        setInvoiceQuery('');
        setReturnItems([]);
      } else {
        showToast(data.messageAr || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('Error processing return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-emerald-600" />
          <span>{language === 'ar' ? 'إدارة مرتجعات المبيعات (Sales Returns)' : 'Sales Returns'}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {language === 'ar'
            ? 'البحث برقم الفاتورة الأصلية أو مسح الباركود الخاص بالإيصال لمعالجة المرتجع'
            : 'Scan or search original receipt to process return'}
        </p>
      </div>

      {/* Invoice Search Input */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchInvoice} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-3.5 start-3 text-slate-400" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل أو امسح رقم الفاتورة (مثال: INV-20260918-001)...' : 'Scan or enter invoice #...'}
              className="w-full ps-9 pe-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'بحث وجلب الفاتورة' : 'Search Invoice'}
          </button>
        </form>
      </div>

      {/* Found Invoice Return Process */}
      {foundInvoice && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-500 block">الفاتورة الأصلية:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{foundInvoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">التاريخ:</span>
              <span className="font-mono text-slate-700">{foundInvoice.date} {foundInvoice.time}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">الكاشير:</span>
              <span className="font-semibold text-slate-800">{foundInvoice.cashierName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">العميل:</span>
              <span className="font-semibold text-slate-800">{foundInvoice.customerName || 'عميل نقدي'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">إجمالي الفاتورة:</span>
              <span className="font-mono font-black text-emerald-700">{foundInvoice.total.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Items Selector Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">اختر الأصناف والكميات المراد استرجاعها:</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3 text-start w-10">تحديد</th>
                    <th className="py-2.5 px-3 text-start">الصنف</th>
                    <th className="py-2.5 px-3 text-center">الكمية المباعة</th>
                    <th className="py-2.5 px-3 text-center">الكمية المرتجعة</th>
                    <th className="py-2.5 px-3 text-end">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-end">قيمة الاسترداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnItems.map((item, idx) => (
                    <tr key={item.productId} className={item.selected ? 'bg-emerald-50/40' : 'opacity-60'}>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleItem(idx)}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.productNameAr}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.originalQty}</td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max={item.originalQty}
                          disabled={!item.selected}
                          value={item.returnQty}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-16 p-1 text-center font-bold font-mono bg-white border border-slate-300 rounded-lg outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono">{item.unitPrice.toFixed(2)} ج.م</td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900">
                        {(item.returnQty * item.unitPrice).toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund Method & Restock Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">طريقة رد المبلغ للعميل:</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg outline-none"
              >
                <option value="cash">نقداً من درج الكاشير (Cash)</option>
                <option value="card">إرجاع على البطاقة البنكية (Card)</option>
                <option value="customer_balance">رصيد دائن للعميل (Store Credit)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">سبب الاسترجاع:</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="restock-check"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <label htmlFor="restock-check" className="text-xs font-bold text-slate-700 cursor-pointer">
                إرجاع الأصناف تلقائياً لرصيد المخزن
              </label>
            </div>
          </div>

          {/* Summary & Submit */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-bold">إجمالي المبلغ المسترد للعميل:</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {totalRefundAmount.toFixed(2)} ج.م
              </span>
            </div>

            <button
              type="button"
              disabled={totalRefundAmount <= 0 || submitting}
              onClick={handleSubmitReturn}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {submitting ? 'جارٍ الحفظ...' : 'تأكيد وصرف المرتجع'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
