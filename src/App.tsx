import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { ToastContainer } from './components/common/ToastContainer.tsx';
import { TopHeader } from './components/layout/TopHeader.tsx';
import { Sidebar, ScreenType } from './components/layout/Sidebar.tsx';
import { LoginScreen } from './components/auth/LoginScreen.tsx';
import { PosScreen } from './components/pos/PosScreen.tsx';
import { ShiftModal } from './components/pos/ShiftModal.tsx';
import { DashboardScreen } from './components/dashboard/DashboardScreen.tsx';
import { ProductsScreen } from './components/products/ProductsScreen.tsx';
import { CategoriesScreen } from './components/categories/CategoriesScreen.tsx';
import { InventoryScreen } from './components/inventory/InventoryScreen.tsx';
import { SalesScreen } from './components/sales/SalesScreen.tsx';
import { ReturnsScreen } from './components/returns/ReturnsScreen.tsx';
import { ShiftsScreen } from './components/shifts/ShiftsScreen.tsx';
import { ExpensesScreen } from './components/expenses/ExpensesScreen.tsx';
import { CustomersScreen } from './components/customers/CustomersScreen.tsx';
import { ReportsScreen } from './components/reports/ReportsScreen.tsx';
import { AuditLogScreen } from './components/audit/AuditLogScreen.tsx';
import { SettingsScreen } from './components/settings/SettingsScreen.tsx';

const MainLayout: React.FC = () => {
  const { user, loading } = useApp();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('pos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold tracking-wide">جارٍ تحميل Smart Market POS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ToastContainer />
        <LoginScreen />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      <ToastContainer />

      <div className="flex flex-1 h-screen overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onSelectScreen={(screen) => setCurrentScreen(screen)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar */}
          <TopHeader onOpenShiftModal={() => setShowShiftModal(true)} />

          {/* Dynamic Screen View */}
          <main className="flex-1 overflow-y-auto bg-slate-100">
            {currentScreen === 'pos' && <PosScreen />}
            {currentScreen === 'dashboard' && <DashboardScreen onNavigate={(s) => setCurrentScreen(s)} />}
            {currentScreen === 'products' && <ProductsScreen />}
            {currentScreen === 'categories' && <CategoriesScreen />}
            {currentScreen === 'inventory' && <InventoryScreen />}
            {currentScreen === 'sales' && <SalesScreen />}
            {currentScreen === 'returns' && <ReturnsScreen />}
            {currentScreen === 'shifts' && <ShiftsScreen onOpenShiftModal={() => setShowShiftModal(true)} />}
            {currentScreen === 'expenses' && <ExpensesScreen />}
            {currentScreen === 'parties' && <CustomersScreen />}
            {currentScreen === 'reports' && <ReportsScreen />}
            {currentScreen === 'audit' && <AuditLogScreen />}
            {currentScreen === 'settings' && <SettingsScreen />}
          </main>
        </div>
      </div>

      {/* Global Shift Modal (Open / Close shift) */}
      {showShiftModal && <ShiftModal onClose={() => setShowShiftModal(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
