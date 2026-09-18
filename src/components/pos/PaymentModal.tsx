import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { CartItem, Customer, SaleInvoice, SalePayment } from '../../types/index.ts';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Split,
  User,
  Percent,
  CheckCircle2,
  X,
  Calculator,
} from 'lucide-react';

interface PaymentModalProps {
  items: CartItem[];
  subtotal: number;
  initialDiscount: number;
  taxAmount: number;
  total: number;
  onClose: () => void;
  onSuccess: (invoice: SaleInvoice) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  items,
  subtotal,
  initialDiscount,
  taxAmount,
  total,
  onClose,
  onSuccess,
}) => {
  const { user, branch, activeShift, language, showToast, settings } = useApp();

  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'wallet' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(total);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [walletAmount, setWalletAmount] = useState<number>(0);

  // Discount
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_01');

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load customers
  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error(err));
  }, []);

  // Calculate dynamic discount & grand total
  let calculatedDiscount = initialDiscount;
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      calculatedDiscount += (subtotal * discountValue) / 100;
    } else {
      calculatedDiscount += discountValue;
    }
  }

  const netSubtotal = Math.max(0, subtotal - calculatedDiscount);
  const dynamicTax = settings?.taxInclusive ? 0 : (netSubtotal * (settings?.defaultTaxRate || 14)) / 100;
  const grandTotal = Number((netSubtotal + dynamicTax).toFixed(2));

  // Sync cash default on total change
  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashAmount(grandTotal);
    } else if (paymentMode === 'card') {
      setCardAmount(grandTotal);
      setCashAmount(0);
    } else if (paymentMode === 'wallet') {
      setWalletAmount(grandTotal);
      setCashAmount(0);
    } else if (paymentMode === 'mixed') {
      setCashAmount(Math.floor(grandTotal / 2));
      setCardAmount(Number((grandTotal - Math.floor(grandTotal / 2)).toFixed(2)));
    }
  }, [paymentMode, grandTotal]);

  const totalPaid = Number(
    (
      (paymentMode === 'cash' ? cashAmount : 0) +
      (paymentMode === 'card' ? cardAmount : 0) +
      (paymentMode === 'wallet' ? walletAmount : 0) +
      (paymentMode === 'mixed' ? cashAmount + cardAmount + walletAmount : 0)
    ).toFixed(2)
  );

  const remaining = Number(Math.max(0, grandTotal - totalPaid).toFixed(2));
  const change = Number(
    (paymentMode === 'cash' || paymentMode === 'mixed') && totalPaid > grandTotal
      ? (totalPaid - grandTotal).toFixed(2)
      : 0
  );

  const handleQuickCash = (add: number) => {
    setCashAmount((prev) => prev + add);
  };

  const handleSetExactCash = () => {
    setCashAmount(grandTotal);
  };

  const handleDiscountChange = (val: number) => {
    const maxAllowed = user?.maxDiscountPercent || 5;
    if (discountType === 'percentage' && val > maxAllowed) {
      showToast(
        language === 'ar'
          ? `الحد الأقصى للخصم المسموح به لرتبتك هو ${maxAllowed}%`
          : `Maximum discount allowed for your role is ${maxAllowed}%`,
        'warning'
      );
      setDiscountValue(maxAllowed);
      return;
    }
    setDiscountValue(val);
  };

  const handleCheckout = async () => {
    if (!activeShift) {
      showToast(
        language === 'ar'
          ? 'يجب فتح وردية كاشير أولاً قبل إتمام البيع!'
          : 'Please open a shift first!',
        'error'
      );
      return;
    }

    if (totalPaid < grandTotal) {
      showToast(
        language === 'ar'
          ? `المبلغ المدفوع غير مكتمل! المتبقي: ${remaining} ج.م`
          : `Payment incomplete! Remaining: ${remaining} EGP`,
        'error'
      );
      return;
    }

    const payments: SalePayment[] = [];
    if (paymentMode === 'cash') {
      payments.push({ method: 'cash', amount: cashAmount });
    } else if (paymentMode === 'card') {
      payments.push({ method: 'card', amount: cardAmount });
    } else if (paymentMode === 'wallet') {
      payments.push({ method: 'wallet', amount: walletAmount });
    } else if (paymentMode === 'mixed') {
      if (cashAmount > 0) payments.push({ method: 'cash', amount: cashAmount });
      if (cardAmount > 0) payments.push({ method: 'card', amount: cardAmount });
      if (walletAmount > 0) payments.push({ method: 'wallet', amount: walletAmount });
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branch?.id || 'BR01',
          cashierId: user?.id,
          cashierName: user?.nameAr,
          shiftId: activeShift.id,
          items,
          payments,
          discountType,
          discountValue,
          customerId: selectedCustomerId,
          customerName: selectedCust?.name || 'عميل نقدي عام',
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          language === 'ar'
            ? `تم إتمام الفاتورة ${data.invoice.invoiceNumber} بنجاح`
            : `Sale ${data.invoice.invoiceNumber} completed successfully`,
          'success'
        );
        onSuccess(data.invoice);
      } else {
        showToast(language === 'ar' ? data.messageAr : data.messageEn, 'error');
      }
    } catch (err) {
      showToast(language === 'ar' ? 'فشل إتمام العملية' : 'Checkout failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base">
              {language === 'ar' ? 'شاشة الدفع وإغلاق الفاتورة' : 'Checkout & Payment'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Top Amount Display */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between shadow-inner">
            <div>
              <span className="text-xs text-emerald-300 font-bold block">
                {language === 'ar' ? 'المبلغ المطلوب سداده (Total Due)' : 'Total Due'}
              </span>
              <div className="text-3xl font-black font-mono mt-0.5 tracking-tight">
                {grandTotal.toFixed(2)}{' '}
                <span className="text-sm font-normal text-emerald-400">ج.م</span>
              </div>
            </div>

            <div className="text-end">
              <span className="text-xs text-slate-300 block font-bold">
                {language === 'ar' ? 'الأصناف' : 'Items'}
              </span>
              <span className="text-lg font-bold font-mono text-white">
                {items.reduce((s, i) => s + i.quantity, 0)}{' '}
                <span className="text-xs font-normal text-slate-400">قطعة</span>
              </span>
            </div>
          </div>

          {/* Customer & Discount Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* Customer Picker */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'ar' ? 'العميل' : 'Customer'}</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Discount field */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-500" />
                  <span>{language === 'ar' ? 'خصم إضافي على الفاتورة' : 'Invoice Discount'}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {language === 'ar' ? `المسموح: ${user?.maxDiscountPercent || 5}%` : `Max: ${user?.maxDiscountPercent || 5}%`}
                </span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={discountValue || ''}
                  onChange={(e) => handleDiscountChange(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2"
                >
                  <option value="fixed">ج.م</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              {language === 'ar' ? 'اختر طريقة الدفع' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>{language === 'ar' ? 'نقدي (Cash)' : 'Cash'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('card')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  paymentMode === 'card'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>{language === 'ar' ? 'بطاقة (Card)' : 'Card'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('wallet')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  paymentMode === 'wallet'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>{language === 'ar' ? 'محفظة (Wallet)' : 'Wallet'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('mixed')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  paymentMode === 'mixed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Split className="w-5 h-5" />
                <span>{language === 'ar' ? 'مختلط (Mixed)' : 'Mixed'}</span>
              </button>
            </div>
          </div>

          {/* Payment Input Fields & Denominations */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            {paymentMode === 'cash' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {language === 'ar' ? 'المبلغ المستلم نقداً:' : 'Cash Received:'}
                  </label>
                  <button
                    type="button"
                    onClick={handleSetExactCash}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {language === 'ar' ? 'المبلغ بالضبط' : 'Exact Amount'}
                  </button>
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xl font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick denomination pills */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {[10, 20, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickCash(val)}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                    >
                      +{val} ج.م
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paymentMode === 'card' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'مبلغ الدفع بالبطاقة البنكية (POS Machine):' : 'Card Amount:'}
                </label>
                <input
                  type="number"
                  value={cardAmount || ''}
                  onChange={(e) => setCardAmount(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xl font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {paymentMode === 'wallet' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'مبلغ المحفظة الإلكترونية (فودافون كاش / إنستاباي):' : 'Wallet Amount:'}
                </label>
                <input
                  type="number"
                  value={walletAmount || ''}
                  onChange={(e) => setWalletAmount(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xl font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {paymentMode === 'mixed' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'المدفوع نقداً:' : 'Cash Paid:'}
                  </label>
                  <input
                    type="number"
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'المدفوع بالفيزا/البطاقة:' : 'Card Paid:'}
                  </label>
                  <input
                    type="number"
                    value={cardAmount || ''}
                    onChange={(e) => setCardAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Change & Remaining Summary */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">{language === 'ar' ? 'إجمالي المدفوع:' : 'Total Paid:'}</span>
                <span className="font-bold font-mono text-slate-900">{totalPaid.toFixed(2)} ج.م</span>
              </div>

              {change > 0 ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                  <span className="font-extrabold">{language === 'ar' ? 'المتبقي للعميل (الفكة):' : 'Change Due:'}</span>
                  <span className="font-black font-mono text-base">{change.toFixed(2)} ج.م</span>
                </div>
              ) : remaining > 0 ? (
                <div className="flex items-center gap-2 text-rose-700 bg-rose-100 px-3 py-1 rounded-lg">
                  <span className="font-extrabold">{language === 'ar' ? 'المتبقي غير مدفوع:' : 'Still Due:'}</span>
                  <span className="font-black font-mono text-base">{remaining.toFixed(2)} ج.م</span>
                </div>
              ) : (
                <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'المبلغ مكتمل تماماً' : 'Exact match'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            {language === 'ar' ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
          </button>

          <button
            type="button"
            disabled={totalPaid < grandTotal || isSubmitting}
            onClick={handleCheckout}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{language === 'ar' ? 'تأكيد وإصدار الفاتورة (F12)' : 'Confirm & Complete (F12)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
