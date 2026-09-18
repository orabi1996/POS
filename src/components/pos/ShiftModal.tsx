import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Register, Shift } from '../../types/index.ts';
import { apiClient, ApiError } from '../../services/apiClient.ts';
import { Clock, Banknote, AlertTriangle, CheckCircle, X, ShieldAlert } from 'lucide-react';

interface ShiftModalProps {
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ onClose }) => {
  const { user, branch, activeShift, refreshShift, language, showToast } = useApp();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('REG-01');
  const [openingCash, setOpeningCash] = useState<number>(500);

  // Close shift fields
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (branch) {
      apiClient.get<Register[]>(`/registers?branchId=${branch.id}`)
        .then((data) => {
          setRegisters(data || []);
          if (data && data.length > 0) setSelectedRegisterId(data[0].id);
        })
        .catch((err) => console.error(err));
    }
  }, [branch]);

  useEffect(() => {
    if (activeShift) {
      const exp =
        activeShift.openingCash +
        activeShift.cashSales -
        activeShift.returnsAmount -
        activeShift.expensesAmount +
        activeShift.cashIn -
        activeShift.cashOut;
      setActualCash(exp);
    }
  }, [activeShift]);

  const handleOpenShift = async () => {
    if (!user || !branch) return;
    setLoading(true);
    try {
      const selectedReg = registers.find((r) => r.id === selectedRegisterId);
      await apiClient.post('/shifts/open', {
        cashierId: user.id,
        cashierName: user.nameAr,
        branchId: branch.id,
        branchName: branch.nameAr,
        registerId: selectedRegisterId,
        registerName: selectedReg ? selectedReg.name : 'كاشير 1',
        openingCash: Number(openingCash) || 0,
      });

      showToast(language === 'ar' ? 'تم فتح الوردية بنجاح' : 'Shift opened successfully', 'success');
      await refreshShift();
      onClose();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.messageAr : 'حدث خطأ في فتح الوردية';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setLoading(true);
    try {
      await apiClient.post('/shifts/close', {
        shiftId: activeShift.id,
        actualCash: Number(actualCash) || 0,
        notes,
        userId: user?.id,
        userName: user?.nameAr,
      });

      showToast(language === 'ar' ? 'تم إغلاق الوردية وترحيل الخزينة بنجاح' : 'Shift closed successfully', 'success');
      await refreshShift();
      onClose();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.messageAr : 'فشل إغلاق الوردية';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const expectedCash = activeShift
    ? activeShift.openingCash +
      activeShift.cashSales -
      activeShift.returnsAmount -
      activeShift.expensesAmount +
      activeShift.cashIn -
      activeShift.cashOut
    : 0;

  const difference = Number(actualCash) - expectedCash;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">
              {activeShift
                ? language === 'ar'
                  ? `إغلاق الوردية الحالية (${activeShift.shiftNumber})`
                  : `Close Active Shift (${activeShift.shiftNumber})`
                : language === 'ar'
                ? 'فتح وردية كاشير جديدة'
                : 'Open New Cashier Shift'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!activeShift ? (
            /* Open Shift View */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                {language === 'ar'
                  ? 'قم بتحديد نقطة البيع (Register) وإدخال مبلغ العهدة النقدية الافتتاحية في الدرج لبدء استقبال المبيعات.'
                  : 'Select register and enter opening drawer cash float to start cashier sales.'}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'جهاز الكاشير (Register)' : 'Cashier Register'}
                </label>
                <select
                  value={selectedRegisterId}
                  onChange={(e) => setSelectedRegisterId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {registers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'العهدة النقدية الافتتاحية (Opening Float)' : 'Opening Cash Float'}
                </label>
                <div className="relative">
                  <Banknote className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="500"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleOpenShift}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{language === 'ar' ? 'فتح الوردية والبدء' : 'Open Shift & Start'}</span>
              </button>
            </div>
          ) : (
            /* Close Shift View */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block font-semibold">
                    {language === 'ar' ? 'العهدة الافتتاحية:' : 'Opening Float:'}
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {activeShift.openingCash.toFixed(2)} ج.م
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block font-semibold">
                    {language === 'ar' ? 'المبيعات النقدية:' : 'Cash Sales:'}
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    +{activeShift.cashSales.toFixed(2)} ج.م
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block font-semibold">
                    {language === 'ar' ? 'مبيعات البطاقة والفيزا:' : 'Card Sales:'}
                  </span>
                  <span className="text-sm font-bold font-mono text-blue-700">
                    {activeShift.cardSales.toFixed(2)} ج.م
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block font-semibold">
                    {language === 'ar' ? 'مرتجعات ومصروفات:' : 'Refunds/Expenses:'}
                  </span>
                  <span className="text-sm font-bold font-mono text-rose-700">
                    -{(activeShift.returnsAmount + activeShift.expensesAmount).toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Expected Drawer Cash */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">
                    {language === 'ar' ? 'النقدية المتوقعة بالدرج (Expected Cash):' : 'Expected Drawer Cash:'}
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {expectedCash.toFixed(2)} ج.م
                  </span>
                </div>
                <div className="text-end text-xs text-slate-400">
                  <span>{activeShift.salesCount} فاتورة</span>
                </div>
              </div>

              {/* Actual Cash Counted input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'النقدية الفعلية بعد الجرد (Actual Count):' : 'Actual Cash Counted:'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualCash || ''}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Difference badge */}
              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  difference === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : difference > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>
                  {difference === 0
                    ? language === 'ar'
                      ? 'الدرج متطابق تماماً بدون عجز أو زيادة'
                      : 'Drawer is balanced exactly'
                    : difference > 0
                    ? language === 'ar'
                      ? `يوجد فائض نقدي بالدرج (زيادة):`
                      : 'Cash surplus in drawer:'
                    : language === 'ar'
                    ? `يوجد عجز نقدي بالدرج:`
                    : 'Cash shortage in drawer:'}
                </span>
                <span className="font-mono text-sm font-black">
                  {difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2)} ج.م
                </span>
              </div>

              {/* Closing Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {language === 'ar' ? 'ملاحظات الإغلاق' : 'Closing Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'أي ملاحظات تخص الوردية...' : 'Any closing remarks...'}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleCloseShift}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                <span>{language === 'ar' ? 'تأكيد إغلاق الوردية وترحيل الحسابات' : 'Confirm Close Shift'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
