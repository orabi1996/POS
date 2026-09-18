import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { BarChart3, Download, Printer, Calendar, TrendingUp, DollarSign, Receipt, Percent } from 'lucide-react';

export const ReportsScreen: React.FC = () => {
  const { branch, language, showToast } = useApp();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    fetch(`/api/reports/daily?branchId=${branch.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setReportData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [branch]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['Metric', 'Value (EGP)'],
      ['Total Sales', reportData.metrics.todaySales],
      ['Estimated Gross Profit', reportData.metrics.todayProfit],
      ['Invoices Count', reportData.metrics.todayInvoices],
      ['Average Basket', reportData.metrics.averageBasket],
      ['Cash Sales', reportData.metrics.cashSales],
      ['Card Sales', reportData.metrics.cardSales],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'ar' ? 'تم تصدير التقرير' : 'Report exported', 'success');
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = reportData?.metrics || {};

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'التقارير المالية والأرباح' : 'Financial & Profit Reports'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? `تقرير حركة المبيعات والأرباح لفرع: ${branch?.nameAr}`
              : `Sales & Profit report for ${branch?.nameEn}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (Print)</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الإيرادات (المبيعات)</span>
          <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">
            {metrics.todaySales?.toFixed(2) || '0.00'} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">شامل الضريبة والخصومات</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">مجمل الربح التجاري (Gross Profit)</span>
          <span className="text-2xl font-black font-mono text-blue-700 mt-1 block">
            {metrics.todayProfit?.toFixed(2) || '0.00'} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">صافي الفارق بين البيع والشراء</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">نسبة هامش الربح (Profit Margin)</span>
          <span className="text-2xl font-black font-mono text-purple-700 mt-1 block">
            {metrics.todaySales > 0 ? ((metrics.todayProfit / metrics.todaySales) * 100).toFixed(1) : 0}%
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">متوسط ربحية الأصناف المباعة</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">فواتير الكاشير المنفذة</span>
          <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
            {metrics.todayInvoices || 0} فاتورة
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            متوسط قيمة الفاتورة: {metrics.averageBasket?.toFixed(2) || '0.00'} ج.م
          </span>
        </div>
      </div>

      {/* Top Products in Report */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs p-5">
        <h3 className="font-bold text-sm text-slate-800 mb-3">تفاصيل الأصناف المباعة وقيمتها</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-bold text-start">
              <th className="py-2.5 text-start">اسم الصنف</th>
              <th className="py-2.5 text-center">الكمية المباعة</th>
              <th className="py-2.5 text-end">إجمالي الإيراد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData?.topProducts?.map((p: any, idx: number) => (
              <tr key={idx}>
                <td className="py-2.5 font-bold text-slate-900">{p.name}</td>
                <td className="py-2.5 text-center font-mono font-bold text-slate-700">{p.quantity}</td>
                <td className="py-2.5 text-end font-mono font-black text-emerald-700">
                  {p.total.toFixed(2)} ج.م
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
