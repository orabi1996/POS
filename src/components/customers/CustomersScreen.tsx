import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Customer, Supplier } from '../../types/index.ts';
import { Users, Plus, Phone, MapPin, Award, Truck, X } from 'lucide-react';

export const CustomersScreen: React.FC = () => {
  const { language, showToast } = useApp();
  const [tab, setTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const loadData = () => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(data))
      .catch((err) => console.error(err));

    fetch('/api/suppliers')
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      const endpoint = tab === 'customers' ? '/api/customers' : '/api/suppliers';
      const body = tab === 'customers' ? { name, phone, address } : { name, companyName: name, phone, address };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(
          language === 'ar'
            ? tab === 'customers'
              ? 'تمت إضافة العميل بنجاح'
              : 'تمت إضافة المورد بنجاح'
            : 'Saved successfully',
          'success'
        );
        setShowModal(false);
        setName('');
        setPhone('');
        setAddress('');
        loadData();
      }
    } catch (err) {
      showToast('Error saving data', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'العملاء وبرنامج الولاء والموردون' : 'Customers & Suppliers'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar' ? 'إدارة حسابات العملاء ونقاط المكافآت وسجل الموردين' : 'Manage customers loyalty and suppliers'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTab('customers')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tab === 'customers' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              العملاء ({customers.length})
            </button>
            <button
              onClick={() => setTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tab === 'suppliers' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              الموردون ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'customers' ? 'إضافة عميل جديد' : 'إضافة مورد جديد'}</span>
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {tab === 'customers' ? (
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-start">اسم العميل</th>
                <th className="py-3 px-3 text-start">رقم الهاتف</th>
                <th className="py-3 px-3 text-start">العنوان</th>
                <th className="py-3 px-3 text-center">نقاط الولاء (Points)</th>
                <th className="py-3 px-3 text-end">رصيد الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{c.phone}</td>
                  <td className="py-3 px-3 text-slate-500">{c.address || '—'}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold font-mono">
                      <Award className="w-3 h-3 text-amber-500" />
                      <span>{c.points} نقطة</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-800">
                    {c.balance.toFixed(2)} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-start">اسم شركة التوريد</th>
                <th className="py-3 px-3 text-start">جهة الاتصال</th>
                <th className="py-3 px-3 text-start">رقم الهاتف</th>
                <th className="py-3 px-3 text-end">رصيد المورد الدائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>{s.companyName}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-semibold">{s.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{s.phone}</td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-900">
                    {s.balance.toFixed(2)} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {tab === 'customers' ? 'إضافة عميل جديد' : 'إضافة مورد جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الاسم الكامل *:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف *:</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العنوان أو الحي:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
