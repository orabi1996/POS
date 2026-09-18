import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { StoreSettings } from '../../types/index.ts';
import { Settings, Save, Printer, Percent, ShieldCheck, Keyboard, Store, Phone, CheckCircle2 } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, language, showToast } = useApp();

  const [formData, setFormData] = useState<StoreSettings>(settings || {
    storeNameAr: 'سوبر ماركت سمارت',
    storeNameEn: 'Smart Market POS',
    taxNumber: '300-456-789',
    commercialRecord: '123456',
    phone: '01001234567',
    addressAr: 'القاهرة - مصر',
    addressEn: 'Cairo - Egypt',
    currency: 'EGP',
    currencySymbolAr: 'ج.م',
    currencySymbolEn: 'EGP',
    taxEnabled: true,
    defaultTaxRate: 14,
    taxInclusive: false,
    allowNegativeStock: false,
    receiptPaperWidth: '80mm',
    receiptFooterMessageAr: 'شكراً لزيارتكم ونسعد بخدمتكم دائماً',
    receiptFooterMessageEn: 'Thank you for shopping with us!',
    autoPrintReceipt: true,
  });

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateSettings(formData);
    setSaving(false);
  };

  const shortcuts = [
    { key: 'F2', descAr: 'البحث السريع عن صنف بالاسم أو الكود', descEn: 'Focus product search input' },
    { key: 'F4', descAr: 'تعديل كمية الصنف المحدد في السلة', descEn: 'Edit selected item quantity' },
    { key: 'F8', descAr: 'تعليق الفاتورة الحالية لخدمة عميل آخر', descEn: 'Hold current sale' },
    { key: 'F9', descAr: 'استرجاع الفواتير المعلقة', descEn: 'Recall held sales' },
    { key: 'F10', descAr: 'فتح نافذة الدفع وإغلاق الفاتورة', descEn: 'Open payment modal' },
    { key: 'F12', descAr: 'الدفع النقدي السريع المباشر (كاش)', descEn: 'Fast cash checkout' },
    { key: 'ESC', descAr: 'إغلاق أي نافذة منبثقة والعودة للاسكانر', descEn: 'Close dialog and focus scanner' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          <span>{language === 'ar' ? 'إعدادات النظام وطباعة الإيصالات' : 'System & Printing Settings'}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {language === 'ar' ? 'تخصيص بيانات المنشأة، الضرائب، الطابعة الحرارية واختصارات لوحة المفاتيح' : 'Configure store identity, taxes and printer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Profile Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>بيانات المنشأة والسوبر ماركت (تظهر على الفاتورة)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم السوبر ماركت بالعربية:</label>
              <input
                type="text"
                value={formData.storeNameAr}
                onChange={(e) => setFormData({ ...formData, storeNameAr: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم السوبر ماركت بالإنجليزية:</label>
              <input
                type="text"
                value={formData.storeNameEn}
                onChange={(e) => setFormData({ ...formData, storeNameEn: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الرقم الضريبي للمنشأة:</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رقم السجل التجاري:</label>
              <input
                type="text"
                value={formData.commercialRecord}
                onChange={(e) => setFormData({ ...formData, commercialRecord: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف وخدمة العملاء:</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">العنوان:</label>
              <input
                type="text"
                value={formData.addressAr}
                onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Thermal Receipt Settings */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>إعدادات الطابعة الحرارية وإيصال الكاشير</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">عرض ورق الطابعة الحرارية:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, receiptPaperWidth: '80mm' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${
                    formData.receiptPaperWidth === '80mm'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  80 مم (قياسي واسع)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, receiptPaperWidth: '58mm' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${
                    formData.receiptPaperWidth === '58mm'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  58 مم (طابعة صغيرة)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الطباعة التلقائية:</label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoPrintReceipt}
                  onChange={(e) => setFormData({ ...formData, autoPrintReceipt: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700">فتح نافذة الطباعة فور تأكيد البيع</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">رسالة شكر أسفل الإيصال (Footer):</label>
              <input
                type="text"
                value={formData.receiptFooterMessageAr}
                onChange={(e) => setFormData({ ...formData, receiptFooterMessageAr: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Taxes & Accounting */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>الضريبة وسياسات المخزن</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">نسبة ضريبة القيمة المضافة الافتراضية (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">البيع بالسالب (بدون رصيد مخزن):</label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowNegativeStock}
                  onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700">السماح بإتمام البيع حتى لو كان المخزون 0</span>
              </label>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2 text-emerald-400">
            <Keyboard className="w-4 h-4" />
            <span>دليل اختصارات لوحة المفاتيح لشاشة الكاشير السريع</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {shortcuts.map((sc) => (
              <div key={sc.key} className="p-2 bg-slate-800/80 rounded-lg flex items-center justify-between">
                <span className="text-slate-300">{sc.descAr}</span>
                <kbd className="px-2 py-1 bg-slate-700 text-emerald-300 rounded font-mono font-bold text-xs border border-slate-600">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
