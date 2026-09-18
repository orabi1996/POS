import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, Shift, SystemSettings } from '../types/index.ts';

interface AppContextType {
  user: User | null;
  branch: Branch | null;
  branches: Branch[];
  activeShift: Shift | null;
  settings: SystemSettings | null;
  language: 'ar' | 'en';
  isOnline: boolean;
  loading: boolean;
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>;
  login: (username: string, pass?: string) => Promise<boolean>;
  logout: () => void;
  switchBranch: (branchId: string) => void;
  refreshShift: () => Promise<void>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  setLanguage: (lang: 'ar' | 'en') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [language, setLanguageState] = useState<'ar' | 'en'>('ar');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setLanguage = (lang: 'ar' | 'en') => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(language === 'ar' ? 'تم استعادة الاتصال بالخادم' : 'Connection restored', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(language === 'ar' ? 'انقطع الاتصال بالإنترنت! النظام في وضع التنبيه' : 'Offline mode activated', 'warning');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language]);

  // Load initial settings and branches
  useEffect(() => {
    fetch('/api/settings')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSettings(data);
        if (data.defaultLanguage) {
          setLanguage(data.defaultLanguage);
        }
      })
      .catch((err) => console.error('Failed to load settings:', err));

    fetch('/api/branches')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Branch[]) => {
        setBranches(data);
        if (data.length > 0 && !branch) {
          setBranch(data[0]);
        }
      })
      .catch((err) => console.error('Failed to load branches:', err));
  }, []);

  const refreshShift = async () => {
    if (!user || !branch) return;
    try {
      const res = await fetch(`/api/shifts/current?cashierId=${user.id}&branchId=${branch.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveShift(data.shift);
    } catch (err) {
      console.error('Failed to refresh shift:', err);
    }
  };

  useEffect(() => {
    if (user && branch) {
      refreshShift();
    }
  }, [user, branch]);

  const login = async (username: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        if (data.branch) {
          setBranch(data.branch);
        }
        showToast(
          language === 'ar'
            ? `مرحباً بك ${data.user.nameAr} (${data.user.role})`
            : `Welcome back, ${data.user.nameEn}`,
          'success'
        );
        return true;
      } else {
        showToast(language === 'ar' ? data.messageAr : data.messageEn, 'error');
        return false;
      }
    } catch (err) {
      showToast(language === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Connection failed', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setActiveShift(null);
    showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  };

  const switchBranch = (branchId: string) => {
    const selected = branches.find((b) => b.id === branchId);
    if (selected) {
      setBranch(selected);
      showToast(
        language === 'ar'
          ? `تم التبديل إلى: ${selected.nameAr}`
          : `Switched to: ${selected.nameEn}`,
        'info'
      );
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSettings, userId: user?.id, userName: user?.nameAr }),
      });
      const data = await res.json();
      setSettings(data);
      showToast(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully', 'success');
    } catch (err) {
      showToast(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        branch,
        branches,
        activeShift,
        settings,
        language,
        isOnline,
        loading,
        toasts,
        login,
        logout,
        switchBranch,
        refreshShift,
        updateSettings,
        setLanguage,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
