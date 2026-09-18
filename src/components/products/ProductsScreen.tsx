import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Product, Category } from '../../types/index.ts';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Barcode,
  Edit2,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';

export const ProductsScreen: React.FC = () => {
  const { branch, language, showToast, user } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [sku, setSku] = useState<string>('');
  const [nameAr, setNameAr] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unit, setUnit] = useState<string>('علبة');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(14);
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(50);
  const [trackStock, setTrackStock] = useState<boolean>(true);

  const loadData = () => {
    if (!branch) return;
    setLoading(true);
    fetch(`/api/products?branchId=${branch.id}&search=${encodeURIComponent(search)}&categoryId=${selectedCategory}&lowStock=${lowStockOnly}`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    fetch('/api/categories')
      .then((res) => res.json())
      .then((cats: Category[]) => {
        setCategories(cats);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [branch, search, selectedCategory, lowStockOnly]);

  const openAddModal = () => {
    setEditingProduct(null);
    const nextNum = products.length + 1;
    setSku(`SKU-${nextNum.toString().padStart(3, '0')}`);
    setNameAr('');
    setNameEn('');
    setBarcode(`622${Date.now().toString().slice(-10)}`);
    setCategoryId(categories.length > 0 ? categories[0].id : 'cat_groceries');
    setUnit('علبة');
    setPurchasePrice(20);
    setSellingPrice(25);
    setTaxRate(14);
    setMinStock(10);
    setInitialStock(50);
    setTrackStock(true);
    setShowModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setNameAr(prod.nameAr);
    setNameEn(prod.nameEn);
    setBarcode(prod.barcode);
    setCategoryId(prod.categoryId);
    setUnit(prod.unit);
    setPurchasePrice(prod.purchasePrice);
    setSellingPrice(prod.sellingPrice);
    setTaxRate(prod.taxRate);
    setMinStock(prod.minStock);
    setInitialStock(prod.stock || 0);
    setTrackStock(prod.trackStock);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameAr || !nameEn || !barcode || !sku) {
      showToast(language === 'ar' ? 'يرجى تعبئة الحقول الإلزامية' : 'Please fill all fields', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct?.id,
          sku,
          nameAr,
          nameEn,
          barcode,
          categoryId,
          unit,
          purchasePrice,
          sellingPrice,
          taxRate,
          minStock,
          initialStock,
          trackStock,
          branchId: branch?.id || 'BR01',
          userId: user?.id,
          userName: user?.nameAr,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          language === 'ar'
            ? editingProduct
              ? 'تم تعديل المنتج بنجاح'
              : 'تمت إضافة المنتج بنجاح'
            : 'Product saved successfully',
          'success'
        );
        setShowModal(false);
        loadData();
      } else {
        showToast(language === 'ar' ? data.messageAr : data.messageEn, 'error');
      }
    } catch (err) {
      showToast(language === 'ar' ? 'فشل حفظ المنتج' : 'Failed to save product', 'error');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['SKU', 'Name_AR', 'Name_EN', 'Barcode', 'Category', 'Unit', 'Cost_Price', 'Selling_Price', 'Stock'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.nameAr}"`,
      `"${p.nameEn}"`,
      `"${p.barcode}"`,
      p.categoryId,
      p.unit,
      p.purchasePrice,
      p.sellingPrice,
      p.stock || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartMarket_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'ar' ? 'تم تصدير المنتجات بصيغة CSV' : 'Exported to CSV', 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'إدارة المنتجات والباركود' : 'Products & Barcodes'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? `إجمالي المنتجات المسجلة: ${products.length} صنف في ${branch?.nameAr}`
              : `Total products: ${products.length} in ${branch?.nameEn}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة منتج جديد' : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute top-3 start-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالاسم، الباركود أو SKU...' : 'Search by name, barcode or SKU...'}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Category filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'ar' ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Filter */}
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            lowStockOnly
              ? 'bg-rose-50 border-rose-300 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'المنتجات أوشكت على النفاد' : 'Low Stock Only'}</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'الباركود و SKU' : 'Barcode / SKU'}</th>
                <th className="py-3 px-3 text-start">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="py-3 px-3 text-end">{language === 'ar' ? 'سعر التكلفة' : 'Cost'}</th>
                <th className="py-3 px-3 text-end">{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</th>
                <th className="py-3 px-3 text-center">{language === 'ar' ? 'المخزون المتاح' : 'Stock'}</th>
                <th className="py-3 px-4 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    {language === 'ar' ? 'لا توجد منتجات مطابقة للبحث' : 'No products found'}
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const stock = prod.stock ?? 0;
                  const isLow = stock <= prod.minStock;
                  const cat = categories.find((c) => c.id === prod.categoryId);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{prod.nameAr}</div>
                        <div className="text-[11px] text-slate-400">{prod.nameEn}</div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1 text-slate-700 font-bold">
                          <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{prod.barcode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{prod.sku}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {cat ? (language === 'ar' ? cat.nameAr : cat.nameEn) : prod.categoryId}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-end font-mono text-slate-600">
                        {prod.purchasePrice.toFixed(2)} ج.م
                      </td>

                      <td className="py-3 px-3 text-end font-mono font-bold text-emerald-700 text-sm">
                        {prod.sellingPrice.toFixed(2)} ج.م
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {stock} {prod.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل المنتج"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>
                  {editingProduct
                    ? language === 'ar'
                      ? 'تعديل بيانات المنتج'
                      : 'Edit Product'
                    : language === 'ar'
                    ? 'إضافة منتج جديد'
                    : 'Add New Product'}
                </span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الاسم باللغة العربية *' : 'Arabic Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="مثال: حليب المراعي 1 لتر"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الاسم باللغة الإنجليزية *' : 'English Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                    placeholder="e.g. Almarai Milk 1L"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الباركود (EAN-13 / Code128) *' : 'Barcode *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'كود الصنف (SKU) *' : 'SKU *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'التصنيف *' : 'Category *'}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'ar' ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'سعر الشراء (التكلفة) *' : 'Cost Price *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'سعر البيع للجمهور *' : 'Selling Price *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'وحدة القياس' : 'Unit'}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="علبة">علبة</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كيس">كيس</option>
                    <option value="زجاجة">زجاجة</option>
                    <option value="كجم">كجم</option>
                    <option value="كرتونة">كرتونة</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الحد الأدنى للطلب' : 'Min Stock'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الرصيد الافتتاحي بالمخزن للفرع الحالي:' : 'Initial Stock:'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  {language === 'ar' ? 'حفظ الصنف' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
