import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Boxes,
  Receipt,
  RotateCcw,
  Clock,
  Wallet,
  Users,
  BarChart3,
  ShieldAlert,
  Settings as SettingsIcon,
  Store,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export type ScreenType =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'sales'
  | 'returns'
  | 'shifts'
  | 'expenses'
  | 'parties' // Customers & Suppliers
  | 'reports'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
  collapsed,
  onToggleCollapse,
}) => {
  const { language, user, activeShift } = useApp();

  const menuItems = [
    {
      id: 'pos' as ScreenType,
      labelAr: 'نقطة البيع (POS)',
      labelEn: 'Point of Sale',
      icon: ShoppingCart,
      badge: activeShift ? null : (language === 'ar' ? 'افتح وردية' : 'Open Shift'),
      badgeColor: 'bg-amber-500 text-white',
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Cashier'],
      highlight: true,
    },
    {
      id: 'dashboard' as ScreenType,
      labelAr: 'لوحة التحكم',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Accountant'],
    },
    {
      id: 'products' as ScreenType,
      labelAr: 'المنتجات والباركود',
      labelEn: 'Products & Barcode',
      icon: Package,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Inventory Officer', 'Purchasing Officer'],
    },
    {
      id: 'categories' as ScreenType,
      labelAr: 'التصنيفات',
      labelEn: 'Categories',
      icon: Tags,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Inventory Officer'],
    },
    {
      id: 'inventory' as ScreenType,
      labelAr: 'المخزون وحركات الجرد',
      labelEn: 'Inventory & Ledger',
      icon: Boxes,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Inventory Officer'],
    },
    {
      id: 'sales' as ScreenType,
      labelAr: 'فواتير المبيعات',
      labelEn: 'Sales Invoices',
      icon: Receipt,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Cashier', 'Accountant'],
    },
    {
      id: 'returns' as ScreenType,
      labelAr: 'المرتجعات',
      labelEn: 'Sales Returns',
      icon: RotateCcw,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Cashier'],
    },
    {
      id: 'shifts' as ScreenType,
      labelAr: 'الورديات والخزينة',
      labelEn: 'Shifts & Register',
      icon: Clock,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Cashier', 'Accountant'],
    },
    {
      id: 'expenses' as ScreenType,
      labelAr: 'المصروفات',
      labelEn: 'Expenses',
      icon: Wallet,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Accountant'],
    },
    {
      id: 'parties' as ScreenType,
      labelAr: 'العملاء والموردون',
      labelEn: 'Customers & Suppliers',
      icon: Users,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Accountant'],
    },
    {
      id: 'reports' as ScreenType,
      labelAr: 'التقارير والأرباح',
      labelEn: 'Reports & Profit',
      icon: BarChart3,
      roles: ['Super Admin', 'Admin', 'Branch Manager', 'Accountant'],
    },
    {
      id: 'audit' as ScreenType,
      labelAr: 'سجل العمليات (Audit)',
      labelEn: 'Audit Trail',
      icon: ShieldAlert,
      roles: ['Super Admin', 'Admin', 'Branch Manager'],
    },
    {
      id: 'settings' as ScreenType,
      labelAr: 'إعدادات النظام',
      labelEn: 'System Settings',
      icon: SettingsIcon,
      roles: ['Super Admin', 'Admin'],
    },
  ];

  // Filter menu items by user role if user logged in
  const visibleItems = menuItems.filter((item) => {
    if (!user) return true;
    return item.roles.includes(user.role);
  });

  return (
    <aside
      className={`bg-slate-900 text-slate-200 flex flex-col transition-all duration-300 border-e border-slate-800 select-none z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
            <Store className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm text-white tracking-wide truncate">
                Smart Market POS
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase truncate">
                Enterprise Edition
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {collapsed ? (
            language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              title={collapsed ? (language === 'ar' ? item.labelAr : item.labelEn) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-bold'
                  : item.highlight
                  ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:text-white border border-emerald-800/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />

              {!collapsed && (
                <span className="truncate flex-1 text-start">
                  {language === 'ar' ? item.labelAr : item.labelEn}
                </span>
              )}

              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator bar */}
              {isActive && (
                <span
                  className={`absolute ${
                    language === 'ar' ? '-left-2' : '-right-2'
                  } top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-full`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Cashier Mode Quick Shortcut Bar at bottom */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-300">
                {language === 'ar' ? 'شاشة الكاشير السريع' : 'Fast Cashier Mode'}
              </span>
              <span className="text-[10px] text-slate-400">
                F2 (بحث) • F10 (دفع) • F12 (كاش)
              </span>
            </div>
            <button
              onClick={() => onSelectScreen('pos')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              POS
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
