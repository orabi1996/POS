import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { apiClient } from '../../services/apiClient.ts';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Receipt,
  Users,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardScreen: React.FC<{ onNavigate: (screen: any) => void }> = ({ onNavigate }) => {
  const { branch, activeShift, language } = useApp();
  const [metrics, setMetrics] = useState<any>({
    todaySales: 0,
    todayProfit: 0,
    todayInvoices: 0,
    averageBasket: 0,
    lowStockCount: 0,
    cashSales: 0,
    cardSales: 0,
  });
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!branch) return;

    apiClient
      .get<any>(`/reports/daily?branchId=${branch.id}`)
      .then((data) => {
        setMetrics(data?.metrics || {});
        setSalesTrend(data?.hourlySales || []);
        setTopProducts(data?.topProducts || []);
      })
      .catch((err) => console.error(err));
  }, [branch]);

  const paymentData = [
    { name: 'نقدي (Cash)', value: metrics.cashSales || 1, color: '#10b981' },
    { name: 'بطاقة (Card)', value: metrics.cardSales || 0, color: '#3b82f6' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الإدارة والرقابة المباشرة</span>
          </span>
          <h2 className="text-2xl font-black">
            {language === 'ar' ? `مرحباً بك في ${branch?.nameAr}` : `Welcome to ${branch?.nameEn}`}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            لوحة قياس الأداء اليومي والربحية الفورية وحركة المبيعات في السوبر ماركت.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => onNavigate('pos')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/40 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>فتح شاشة الكاشير (POS)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">مبيعات اليوم الإجمالية</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-slate-900">
              {metrics.todaySales?.toFixed(2) || '0.00'}{' '}
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>مباشر من نقاط البيع</span>
            </div>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">صافي الربح التقديري (Gross Profit)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-blue-700">
              {metrics.todayProfit?.toFixed(2) || '0.00'}{' '}
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 font-medium">
              محسوب بعد خصم تكلفة شراء البضاعة
            </span>
          </div>
        </div>

        {/* Invoices Count */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">عدد الفواتير المنفذة</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-slate-900">
              {metrics.todayInvoices || 0}{' '}
              <span className="text-xs font-normal text-slate-500">فاتورة</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              متوسط السلة: {metrics.averageBasket?.toFixed(2) || '0.00'} ج.م
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('inventory')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">تنبيهات نواقص المخزن</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-amber-600">
              {metrics.lowStockCount || 0}{' '}
              <span className="text-xs font-normal text-slate-500">صنف قارب على النفاد</span>
            </span>
            <span className="text-[11px] text-amber-700 font-bold block mt-1 hover:underline">
              اضغط للمعاينة وإصدار طلب توريد
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Chart */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800">حركة المبيعات اليومية بالساعات</h3>
            <span className="text-xs text-slate-400 font-mono">Real-time Sales</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} ج.م`, 'المبيعات']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-2">توزيع طرق الدفع (Payment Methods)</h3>
            <p className="text-xs text-slate-400">نسبة التحصيل النقدي مقابل البطاقات البنكية</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>نقدي: {metrics.cashSales?.toFixed(2) || '0'} ج.م</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>بطاقات: {metrics.cardSales?.toFixed(2) || '0'} ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-800">الأصناف الأكثر مبيعاً اليوم (Top Sellers)</h3>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            عرض كل المنتجات
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topProducts.length === 0 ? (
            <div className="col-span-4 text-center py-6 text-slate-400 text-xs font-bold">
              لا توجد مبيعات مسجلة حتى الآن اليوم
            </div>
          ) : (
            topProducts.map((p, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                  <span className="text-[11px] text-slate-500">تم بيع: {p.quantity} قطعة</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">{p.total.toFixed(2)} ج.م</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
