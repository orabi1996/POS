import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { AuditLog } from '../../types/index.ts';
import { apiClient } from '../../services/apiClient.ts';
import { ShieldAlert, Search, Filter, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

export const AuditLogScreen: React.FC = () => {
  const { language } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<AuditLog[]>('/audit-logs')
      .then((data) => setLogs(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.entity ? log.entity.toLowerCase().includes(q) : false) ||
      (log.module ? log.module.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-600" />
          <span>{language === 'ar' ? 'سجل العمليات والرقابة (Audit Trail)' : 'Audit Trail'}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {language === 'ar'
            ? 'سجل غير قابل للتعديل يوثق جميع عمليات البيع والإلغاء وإعادة الطباعة والتسويات الجردية'
            : 'Immutable system event log for anti-theft and supervisory auditing'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-2 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 ms-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'ar' ? 'بحث في سجل العمليات (باسم المستخدم، الفاتورة، أو نوع الإجراء)...' : 'Search audit log...'}
          className="w-full text-xs font-medium outline-none bg-transparent"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 text-start">الوقت والتاريخ</th>
              <th className="py-3 px-3 text-start">نوع الإجراء</th>
              <th className="py-3 px-3 text-start">المستخدم</th>
              <th className="py-3 px-3 text-start">الكيان / المستند</th>
              <th className="py-3 px-4 text-start">تفاصيل العملية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                  لا توجد سجلات مطابقة
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        log.action.includes('CANCEL') || log.action.includes('VOID')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : log.action.includes('REPRINT')
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : log.action.includes('ADJUST')
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{log.userName}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{log.entity}</td>
                  <td className="py-3 px-4 text-slate-700">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
