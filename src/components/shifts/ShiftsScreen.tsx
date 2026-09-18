import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Shift } from '../../types/index.ts';
import { Clock, Plus, CheckCircle2, AlertTriangle, User, Banknote } from 'lucide-react';

export const ShiftsScreen: React.FC<{ onOpenShiftModal: () => void }> = ({ onOpenShiftModal }) => {
  const { branch, activeShift, language } = useApp();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const loadShifts = () => {
    if (!branch) return;
    fetch(`/api/shifts?branchId=${branch.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setShifts(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadShifts();
  }, [branch, activeShift]);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'سجل الورديات وإغلاق الخزينة' : 'Cashier Shifts & Register'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar' ? `متابعة الورديات وحركات النقدية والأدراج في ${branch?.nameAr}` : `Track shifts in ${branch?.nameEn}`}
          </p>
        </div>

        <button
          onClick={onOpenShiftModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{activeShift ? (language === 'ar' ? 'إغلاق الوردية الحالية' : 'Close Shift') : (language === 'ar' ? 'فتح وردية جديدة' : 'Open Shift')}</span>
        </button>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-300">الوردية الحالية المفتوحة</span>
              <span className="font-mono text-xs font-bold bg-emerald-800/80 px-2 py-0.5 rounded-md">
                {activeShift.shiftNumber}
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1">الكاشير: {activeShift.cashierName} ({activeShift.registerName})</h3>
            <span className="text-xs text-slate-300">
              بدأت في: {new Date(activeShift.startTime || activeShift.openingTime || Date.now()).toLocaleString('ar-EG')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="p-3 bg-white/10 rounded-xl">
              <span className="text-slate-300 block">المبيعات النقدية:</span>
              <span className="font-mono font-bold text-base text-emerald-300">
                {activeShift.cashSales.toFixed(2)} ج.م
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <span className="text-slate-300 block">مبيعات البطاقة:</span>
              <span className="font-mono font-bold text-base text-blue-300">
                {activeShift.cardSales.toFixed(2)} ج.م
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <span className="text-slate-300 block">العهدة الافتتاحية:</span>
              <span className="font-mono font-bold text-base text-slate-200">
                {activeShift.openingCash.toFixed(2)} ج.م
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 text-start">رقم الوردية</th>
              <th className="py-3 px-3 text-start">الكاشير</th>
              <th className="py-3 px-3 text-start">الجهاز (Register)</th>
              <th className="py-3 px-3 text-start">البدء</th>
              <th className="py-3 px-3 text-start">الإغلاق</th>
              <th className="py-3 px-3 text-end">المبيعات</th>
              <th className="py-3 px-3 text-end">عجز / زيادة الدرج</th>
              <th className="py-3 px-4 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((s) => {
              const diff = s.difference || 0;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.shiftNumber}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{s.cashierName}</td>
                  <td className="py-3 px-3 text-slate-600">{s.registerName}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {new Date(s.startTime || s.openingTime || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {s.endTime || s.closingTime
                      ? new Date(s.endTime || s.closingTime || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-900">
                    {s.totalSales.toFixed(2)} ج.م
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold">
                    {s.status === 'open' ? (
                      <span className="text-slate-400">قيد التشغيل</span>
                    ) : diff === 0 ? (
                      <span className="text-emerald-600">مطابق (0.00)</span>
                    ) : diff > 0 ? (
                      <span className="text-blue-600">+{diff.toFixed(2)} (فائض)</span>
                    ) : (
                      <span className="text-rose-600">{diff.toFixed(2)} (عجز)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        s.status === 'open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {s.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
