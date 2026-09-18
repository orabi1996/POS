import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Product, InventoryMovement } from '../../types/index.ts';
import { Boxes, Plus, Search, Filter, History, AlertCircle, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const { branch, user, language, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [actualStock, setActualStock] = useState<number>(0);
  const [reason, setReason] = useState<string>('جرد دوري بالمحل');

  const loadData = () => {
    if (!branch) return;
    setLoading(true);
    fetch(`/api/products?branchId=${branch.id}&search=${encodeURIComponent(search)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Product[]) => {
        setProducts(data);
        if (data.length > 0 && !selectedProductId) {
          setSelectedProductId(data[0].id);
          setActualStock(data[0].stock || 0);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    fetch(`/api/inventory/movements?branchId=${branch.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setMovements(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [branch, search]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentExpectedStock = selectedProduct ? selectedProduct.stock || 0 : 0;
  const difference = actualStock - currentExpectedStock;

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) setActualStock(p.stock || 0);
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !branch || !user) return;

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productNameAr: selectedProduct.nameAr,
          branchId: branch.id,
          expectedStock: currentExpectedStock,
          actualStock: Number(actualStock),
          difference,
          reason,
          userId: user.id,
          userName: user.nameAr,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          language === 'ar' ? 'تمت التسوية الجردية وتحديث المخزون بنجاح' : 'Stock adjusted successfully',
          'success'
        );
        setShowAdjustModal(false);
        loadData();
      } else {
        showToast(data.messageAr || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast('Error adjusting stock', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'إدارة المخزون والتسويات الجردية' : 'Inventory & Stock Movements'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar' ? `متابعة أرصدة المخازن وحركات الجرد في ${branch?.nameAr}` : `Track stock ledger in ${branch?.nameEn}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'balances' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'أرصدة الأصناف' : 'Stock Balances'}
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'movements' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'سجل حركات المخزون' : 'Movements Ledger'}
            </button>
          </div>

          <button
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'تسوية جردية جديدة' : 'Stock Adjustment'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'balances' ? (
        /* BALANCES VIEW */
        <div className="space-y-3">
          {/* Search bar */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ms-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'ar' ? 'بحث عن صنف لمعاينة رصيد المخزن...' : 'Search product stock...'}
              className="w-full text-xs font-medium outline-none bg-transparent"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 text-start">الصنف</th>
                  <th className="py-3 px-3 text-start">الباركود / SKU</th>
                  <th className="py-3 px-3 text-end">سعر التكلفة</th>
                  <th className="py-3 px-3 text-end">قيمة المخزون</th>
                  <th className="py-3 px-3 text-center">الحد الأدنى</th>
                  <th className="py-3 px-4 text-center">الرصيد الفعلي</th>
                  <th className="py-3 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const stock = p.stock ?? 0;
                  const totalCostVal = stock * p.purchasePrice;
                  const isLow = stock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.nameAr}</div>
                        <div className="text-[10px] text-slate-400">{p.nameEn}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        <div>{p.barcode}</div>
                        <div className="text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-slate-700">
                        {p.purchasePrice.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-slate-900">
                        {totalCostVal.toFixed(2)} ج.م
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono ${
                            stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            handleProductSelect(p.id);
                            setShowAdjustModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          تسوية جرد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MOVEMENTS LEDGER VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-start">التاريخ والوقت</th>
                <th className="py-3 px-4 text-start">نوع الحركة</th>
                <th className="py-3 px-4 text-start">البيان / المرجع</th>
                <th className="py-3 px-3 text-center">الكمية</th>
                <th className="py-3 px-3 text-center">الرصيد بعد الحركة</th>
                <th className="py-3 px-4 text-start">المستخدم المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    لا توجد حركات مخزون مسجلة حالياً
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const qtyChange = m.quantityChange ?? m.quantity ?? 0;
                  const isPositive = qtyChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(m.timestamp || m.date || Date.now()).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            m.type === 'sale'
                              ? 'bg-blue-50 text-blue-700'
                              : m.type === 'return'
                              ? 'bg-emerald-50 text-emerald-700'
                              : m.type === 'adjustment'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          <span>
                            {m.type === 'sale'
                              ? 'بيع كاشير'
                              : m.type === 'return'
                              ? 'مرتجع بيع'
                              : m.type === 'adjustment'
                              ? 'تسوية جردية'
                              : m.type}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {m.referenceNumber ? (
                          <span className="font-mono font-bold text-slate-800">{m.referenceNumber}</span>
                        ) : (
                          m.reason || 'حركة نظام'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {m.stockAfter}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.userName || 'النظام'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'تسوية رصيد المخزن (Stock Adjustment)' : 'Stock Adjustment'}</span>
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اختر الصنف المراد تسويته:</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} (الحالي: {p.stock || 0} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400 block">الرصيد الدفتري الحالي:</span>
                  <span className="text-lg font-black font-mono text-slate-800">
                    {currentExpectedStock} {selectedProduct?.unit}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-700 block">الرصيد الفعلي (الجديد):</span>
                  <input
                    type="number"
                    min="0"
                    value={actualStock}
                    onChange={(e) => setActualStock(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-base font-black font-mono outline-none text-emerald-900 mt-1"
                  />
                </div>
              </div>

              {/* Difference feedback */}
              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  difference === 0
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : difference > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>فرق التسوية الجردية:</span>
                <span className="font-mono text-sm font-black">
                  {difference > 0 ? `+${difference}` : difference} {selectedProduct?.unit}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">سبب التسوية / التعديل:</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="جرد دوري بالمحل">جرد دوري بالمحل</option>
                  <option value="تالف / منتهي الصلاحية">تالف / منتهي الصلاحية (Damaged/Expired)</option>
                  <option value="كسر أثناء التخزين">كسر أثناء التخزين</option>
                  <option value="خطأ إدخال سابق">تصحيح خطأ إدخال سابق</option>
                  <option value="بضاعة إضافية مجانية من المورد">بضاعة إضافية مجانية من المورد</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  تأكيد واعتماد التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
