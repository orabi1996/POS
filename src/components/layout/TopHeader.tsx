import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  Building2,
  Clock,
  Globe,
  Maximize2,
  Minimize2,
  LogOut,
  Wifi,
  WifiOff,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';

interface TopHeaderProps {
  onOpenShiftModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenShiftModal }) => {
  const { user, branch, branches, activeShift, language, isOnline, switchBranch, setLanguage, logout, settings } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs sticky top-0 z-30 select-none">
      {/* Left side: Branch & Shift status */}
      <div className="flex items-center gap-3">
        {/* Branch Selector */}
        <div className="relative">
          <button
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold border border-slate-200 transition-colors"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>{language === 'ar' ? branch?.nameAr || 'الفرع الرئيسي' : branch?.nameEn || 'Main Branch'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showBranchMenu && (
            <div className="absolute top-full mt-1.5 start-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 border-b border-slate-100">
                {language === 'ar' ? 'اختر الفرع الحالي' : 'Select Active Branch'}
              </div>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBranch(b.id);
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-start px-3 py-2 text-sm flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    branch?.id === b.id ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{language === 'ar' ? b.nameAr : b.nameEn}</span>
                  <span className="text-xs text-slate-400 font-mono">{b.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Shift Indicator & Quick Action */}
        <button
          onClick={onOpenShiftModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            activeShift
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 animate-pulse'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <Clock className="w-3.5 h-3.5" />
          <span>
            {activeShift
              ? `${language === 'ar' ? 'الوردية مفتوحة:' : 'Open Shift:'} ${activeShift.shiftNumber}`
              : language === 'ar'
              ? 'لا توجد وردية مفتوحة! (اضغط هنا)'
              : 'No Active Shift! (Click here)'}
          </span>
        </button>

        {/* Online / Offline status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
            isOnline ? 'text-emerald-700 bg-emerald-50/70' : 'text-rose-700 bg-rose-50 animate-bounce'
          }`}
          title={isOnline ? 'Online - متصل' : 'Offline - وضع عدم الاتصال'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
          <span className="hidden sm:inline">{isOnline ? (language === 'ar' ? 'متصل' : 'Online') : (language === 'ar' ? 'غير متصل' : 'Offline')}</span>
        </div>
      </div>

      {/* Right side: Tools & Profile */}
      <div className="flex items-center gap-2">
        {/* Currency Pill */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
          <span>{settings?.currency || 'EGP'}</span>
          <span className="text-slate-400">({settings?.currencySymbolAr || 'ج.م'})</span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
          title="تغيير اللغة / Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          title="شاشة كاملة للكاشير (Fullscreen)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Info & Role */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-end">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {language === 'ar' ? user.nameAr : user.nameEn}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md self-end mt-0.5">
                {user.role}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.username.slice(0, 2).toUpperCase()}
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title={language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
