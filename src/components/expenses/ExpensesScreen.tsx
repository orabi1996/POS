import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Expense } from '../../types/index.ts';
import { Wallet, Plus, Calendar, X } from 'lucide-react';

export const ExpensesScreen: React.FC = () => {
  const { branch, user, activeShift, language, showToast } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [category, setCategory] = useState<string>('مستلزمات تشغيل ونظافة');
  const [amount, setAmount] = useState<number>(50);
  const [source, setSource] = useState<'register' | 'safe'>('register');
  const [description, setDescription] = useState<string>('');

  const loadExpenses = () => {
    if (!branch) return;
    fetch(`/api/expenses?branchId=${branch.id}`)
      .then((res) => res.json())
      .then((data) => setExpenses(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadExpenses();
  }, [branch]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !user || amount <= 0) return;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branch.id,
          category,
          amount: Number(amount),
          source,
          description: description || category,
          shiftId: source === 'register' ? activeShift?.id : undefined,
          userId: user.id,
          userName: user.nameAr,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(language === 'ar' ? 'تم تسجيل المصروف بنجاح' : 'Expense recorded', 'success');
        setShowModal(false);
        setDescription('');
        loadExpenses();
      } else {
        showToast(data.messageAr || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('Error recording expense', 'error');
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'إدارة المصروفات والنثريات' : 'Store Expenses'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar' ? `تسجيل ومتابعة مصروفات درج الكاشير والخزينة في ${branch?.nameAr}` : `Track expenses in ${branch?.nameEn}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
            إجمالي المصروفات: <span className="font-mono text-sm">{totalExpenses.toFixed(2)} ج.م</span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'تسجيل مصروف جديد' : 'Add Expense'}</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 text-start">التاريخ والوقت</th>
              <th className="py-3 px-3 text-start">بند المصروف</th>
              <th className="py-3 px-3 text-start">البيان / الوصف</th>
              <th className="py-3 px-3 text-start">مصدر الصرف</th>
              <th className="py-3 px-3 text-end">المبلغ</th>
              <th className="py-3 px-4 text-start">المسؤول</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                  لا توجد مصروفات مسجلة حالياً
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(exp.date).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{exp.category}</td>
                  <td className="py-3 px-3 text-slate-600">{exp.description}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      {exp.source === 'register' ? 'درج الكاشير' : 'الخزينة العامة'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-black text-rose-600 text-sm">
                    -{exp.amount.toFixed(2)} ج.م
                  </td>
                  <td className="py-3 px-4 text-slate-700">{exp.userName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>تسجيل مصروف جديد</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">بند المصروف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="مستلزمات تشغيل ونظافة">مستلزمات تشغيل ونظافة (Cleaning/Supplies)</option>
                  <option value="صيانة وإصلاحات">صيانة وإصلاحات (Maintenance)</option>
                  <option value="كهرباء ومرافق">فواتير كهرباء ومرافق (Utilities)</option>
                  <option value="أكياس ومطبوعات">أكياس تعبئة ومطبوعات (Bags/Paper)</option>
                  <option value="بوفيه وضيافة">بوفيه وضيافة عمال (Buffet)</option>
                  <option value="سحب نقدي للخزينة الرئيسية">سحب نقدي للخزينة الرئيسية (Cash Drop)</option>
                  <option value="نثريات أخرى">نثريات أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المبلغ المطلوب صرفه (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full text-lg font-black font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">مصدر الصرف:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSource('register')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      source === 'register'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    درج الكاشير الحالي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('safe')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      source === 'safe'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    الخزينة الرئيسية
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">البيان / تفاصيل المصروف:</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب توضيحاً لسبب الصرف..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  صرف وقيد المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
