import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, Shift, SystemSettings } from '../types/index.ts';
import { apiClient, authStorage, ApiError } from '../services/apiClient.ts';

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
  login: (username: string, password?: string) => Promise<boolean>;
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
  const [loading, setLoading] = useState<boolean>(true);
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

  // Listen for expired authentication
  useEffect(() => {
    authStorage.onAuthExpired(() => {
      setUser(null);
      setActiveShift(null);
      showToast(
        language === 'ar'
          ? 'انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مجدداً'
          : 'Session expired. Please log in again.',
        'warning'
      );
    });
  }, [language]);

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

  // Session restoration and initial config
  useEffect(() => {
    authStorage.onAuthExpired(() => {
      setUser(null);
      setActiveShift(null);
      showToast(
        language === 'ar' ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' : 'Session expired. Please sign in again.',
        'warning'
      );
    });

    const initializeApp = async () => {
      setLoading(true);
      try {
        // Load Settings
        try {
          const settingsData = await apiClient.get<SystemSettings>('/settings');
          setSettings(settingsData);
          if (settingsData.defaultLanguage) {
            setLanguage(settingsData.defaultLanguage);
          }
        } catch (e) {
          console.error('Failed to load settings:', e);
        }

        // Load Branches
        let loadedBranches: Branch[] = [];
        try {
          loadedBranches = await apiClient.get<Branch[]>('/branches');
          setBranches(loadedBranches);
        } catch (e) {
          console.error('Failed to load branches:', e);
        }

        // Restore Session if Token exists
        const token = authStorage.getToken();
        if (token) {
          try {
            const meData = await apiClient.get<{
              user: User;
              branch: Branch | null;
              openShift: Shift | null;
            }>('/auth/me');

            if (meData?.user) {
              setUser(meData.user);
              if (meData.branch) {
                setBranch(meData.branch);
              } else if (loadedBranches.length > 0) {
                const assigned = loadedBranches.find((b) => b.id === meData.user.branchId);
                setBranch(assigned || loadedBranches[0]);
              }
              if (meData.openShift) {
                setActiveShift(meData.openShift);
              }
            }
          } catch (authErr) {
            console.warn('Session restoration failed:', authErr);
            authStorage.clearToken();
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const refreshShift = async () => {
    if (!user || !branch) return;
    try {
      const data = await apiClient.get<{ shift: Shift | null }>(
        `/shifts/current?cashierId=${user.id}&branchId=${branch.id}`
      );
      setActiveShift(data?.shift || null);
    } catch (err) {
      console.error('Failed to refresh shift:', err);
    }
  };

  useEffect(() => {
    if (user && branch) {
      refreshShift();
    }
  }, [user?.id, branch?.id]);

  const login = async (username: string, password: string = '123456'): Promise<boolean> => {
    try {
      const data = await apiClient.post<{
        user: User;
        branch?: Branch;
        token: string;
      }>('/auth/login', { username, password });

      if (data?.token && data?.user) {
        authStorage.setToken(data.token);
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
      }
      return false;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.messageAr : 'حدث خطأ في الاتصال بالخادم';
      showToast(msg, 'error');
      return false;
    }
  };

  const logout = () => {
    authStorage.clearToken();
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
      const data = await apiClient.put<SystemSettings>('/settings', {
        ...newSettings,
        userId: user?.id,
        userName: user?.nameAr,
      });
      setSettings(data);
      showToast(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.messageAr : 'فشل حفظ الإعدادات';
      showToast(msg, 'error');
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
