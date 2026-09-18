import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Store, User, Lock, ArrowRight, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, language, setLanguage } = useApp();
  const [username, setUsername] = useState('cashier1');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  const demoAccounts = [
    { username: 'admin', roleAr: 'مدير النظام الكامل (Super Admin)', roleEn: 'Super Admin', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    { username: 'cashier1', roleAr: 'كاشير نقاط البيع (Cashier 1)', roleEn: 'POS Cashier', color: 'border-blue-500 bg-blue-50 text-blue-800' },
    { username: 'manager', roleAr: 'مدير الفرع (Branch Manager)', roleEn: 'Branch Manager', color: 'border-purple-500 bg-purple-50 text-purple-800' },
    { username: 'inventory', roleAr: 'مسؤول المخازن والجرد (Inventory)', roleEn: 'Inventory Officer', color: 'border-amber-500 bg-amber-50 text-amber-800' },
    { username: 'accountant', roleAr: 'محاسب مالي (Accountant)', roleEn: 'Accountant', color: 'border-cyan-500 bg-cyan-50 text-cyan-800' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 relative select-none">
      {/* Language Switcher Top Corner */}
      <div className="absolute top-6 end-6">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors backdrop-blur-sm border border-white/10"
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/40 mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-xl font-extrabold tracking-tight">Smart Market POS</h1>
          <p className="text-xs text-emerald-400 font-medium mt-1">
            {language === 'ar'
              ? 'نظام إدارة نقاط البيع والسوبر ماركت المتكامل'
              : 'Enterprise Supermarket & POS Management System'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'اسم المستخدم' : 'Username'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                placeholder={language === 'ar' ? 'مثال: cashier1 أو admin' : 'e.g. cashier1 or admin'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{language === 'ar' ? 'تسجيل الدخول للنظام' : 'Sign In to POS'}</span>
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </>
            )}
          </button>

          {/* Quick Demo Switcher */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold mb-2">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'ar' ? 'اختر حساباً تجريبياً فورياً:' : 'Instant Demo Login:'}</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setUsername(acc.username);
                    setPassword('123456');
                    setLoading(true);
                    await login(acc.username, '123456');
                    setLoading(false);
                  }}
                  className={`text-start px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all hover:scale-[1.01] ${acc.color}`}
                >
                  <span>{language === 'ar' ? acc.roleAr : acc.roleEn}</span>
                  <span className="font-mono text-[11px] opacity-75">{acc.username}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500 font-medium">
          {language === 'ar'
            ? 'نظام نقاط بيع سحابي آمن يدعم أجهزة الباركود والطابعات الحرارية'
            : 'Secure Cloud POS supporting Barcode scanners & Thermal printers'}
        </div>
      </div>
    </div>
  );
};
