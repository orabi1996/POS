import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Product, Category, CartItem, SaleInvoice } from '../../types/index.ts';
import { apiClient } from '../../services/apiClient.ts';
import { PaymentModal } from './PaymentModal.tsx';
import { ThermalReceiptModal } from './ThermalReceiptModal.tsx';
import { CameraScannerModal } from './CameraScannerModal.tsx';
import {
  Barcode,
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  Percent,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Banknote,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const PosScreen: React.FC = () => {
  const { branch, activeShift, refreshShift, language, showToast, settings } = useApp();

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<Array<{ id: string; time: string; items: CartItem[] }>>([]);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number>(0);

  // Barcode Input
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Products Grid
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState<boolean>(false);
  const [lastInvoice, setLastInvoice] = useState<SaleInvoice | null>(null);

  // Ensure autofocus returns to barcode input
  const refocusBarcode = useCallback(() => {
    setTimeout(() => {
      if (barcodeInputRef.current && !showPaymentModal && !showReceiptModal && !showCameraModal) {
        barcodeInputRef.current.focus();
      }
    }, 50);
  }, [showPaymentModal, showReceiptModal, showCameraModal]);

  useEffect(() => {
    refocusBarcode();
  }, [refocusBarcode]);

  // Load Categories & Products
  useEffect(() => {
    apiClient.get<Category[]>('/categories')
      .then((data) => setCategories(data || []))
      .catch((err) => console.error(err));
  }, []);

  const loadProducts = useCallback(() => {
    if (!branch) return;
    setLoadingProducts(true);
    const url = `/products?branchId=${branch.id}&categoryId=${selectedCategoryId}&search=${encodeURIComponent(
      searchQuery
    )}`;
    apiClient.get<Product[]>(url)
      .then((data: Product[]) => {
        setProducts(data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingProducts(false));
  }, [branch, selectedCategoryId, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Add product to cart logic
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (product.status !== 'active') {
      showToast(
        language === 'ar' ? `المنتج (${product.nameAr}) موقوف حالياً` : 'Product is inactive',
        'error'
      );
      return;
    }

    const currentStock = product.stock ?? 0;
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const existingItem = cart[existingIndex];
      const newQty = existingItem.quantity + quantityToAdd;

      if (product.trackStock && newQty > currentStock) {
        showToast(
          language === 'ar'
            ? `المخزون غير كافٍ! المتاح بالمخزن: ${currentStock} ${product.unit}`
            : `Insufficient stock! Available: ${currentStock}`,
          'warning'
        );
        return;
      }

      const updatedCart = [...cart];
      const price = existingItem.price;
      const subtotal = price * newQty;
      const discount = existingItem.discount;
      const taxRate = product.taxRate || 14;
      const taxAmount = ((subtotal - discount) * taxRate) / 100;
      const total = subtotal - discount + (settings?.taxInclusive ? 0 : taxAmount);

      updatedCart[existingIndex] = {
        ...existingItem,
        quantity: newQty,
        subtotal,
        taxAmount,
        total,
      };

      setCart(updatedCart);
      setSelectedCartIndex(existingIndex);
    } else {
      if (product.trackStock && quantityToAdd > currentStock) {
        showToast(
          language === 'ar'
            ? `المخزون غير كافٍ! المتاح: ${currentStock} ${product.unit}`
            : `Insufficient stock! Available: ${currentStock}`,
          'warning'
        );
        return;
      }

      const price = product.sellingPrice;
      const costPrice = product.purchasePrice;
      const subtotal = price * quantityToAdd;
      const discount = 0;
      const taxRate = product.taxRate || 14;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + (settings?.taxInclusive ? 0 : taxAmount);

      const newItem: CartItem = {
        product,
        quantity: quantityToAdd,
        price,
        costPrice,
        discount: 0,
        discountPercent: 0,
        taxRate,
        taxAmount,
        subtotal,
        total,
      };

      setCart((prev) => [...prev, newItem]);
      setSelectedCartIndex(cart.length);
    }

    refocusBarcode();
  };

  // Fast Barcode Lookup handler (called on Enter from USB scanner or keyboard)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      const data = await apiClient.get<any>(`/pos/barcode/${encodeURIComponent(code)}?branchId=${branch?.id || 'BR01'}`);

      if (data && data.found && data.product) {
        addToCart(data.product, 1);
        setBarcodeInput('');
      } else {
        showToast(
          language === 'ar' ? data?.messageAr || 'المنتج غير موجود' : data?.messageEn || 'Product not found',
          'error'
        );
        setBarcodeInput('');
      }
    } catch (err) {
      showToast(language === 'ar' ? 'خطأ في قراءة الباركود' : 'Barcode lookup failed', 'error');
    } finally {
      refocusBarcode();
    }
  };

  // Quantity modification
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cart[index];
    const stock = item.product.stock ?? 0;
    if (item.product.trackStock && newQty > stock) {
      showToast(
        language === 'ar'
          ? `المخزون المتاح فقط هو ${stock} ${item.product.unit}`
          : `Available stock is only ${stock}`,
        'warning'
      );
      return;
    }

    const updated = [...cart];
    const subtotal = item.price * newQty;
    const taxRate = item.taxRate;
    const taxAmount = ((subtotal - item.discount) * taxRate) / 100;
    const total = subtotal - item.discount + (settings?.taxInclusive ? 0 : taxAmount);

    updated[index] = {
      ...item,
      quantity: newQty,
      subtotal,
      taxAmount,
      total,
    };

    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    if (selectedCartIndex >= cart.length - 1) {
      setSelectedCartIndex(Math.max(0, cart.length - 2));
    }
    refocusBarcode();
  };

  const clearCart = () => {
    setCart([]);
    refocusBarcode();
  };

  // Hold / Recall Sale
  const handleHoldSale = () => {
    if (cart.length === 0) {
      showToast(language === 'ar' ? 'السلة فارغة لتعليقها!' : 'Cart is empty!', 'warning');
      return;
    }

    const newHold = {
      id: `hold_${Date.now()}`,
      time: new Date().toLocaleTimeString('ar-EG', { hour12: true }),
      items: [...cart],
    };

    setHeldCarts((prev) => [newHold, ...prev]);
    setCart([]);
    showToast(
      language === 'ar' ? 'تم تعليق الفاتورة الحالية بنجاح (F8)' : 'Sale held successfully (F8)',
      'info'
    );
    refocusBarcode();
  };

  const handleRecallSale = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (target) {
      setCart(target.items);
      setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
      setShowHeldSalesModal(false);
      showToast(
        language === 'ar' ? 'تم استرجاع الفاتورة المعلقة (F9)' : 'Held sale recalled (F9)',
        'success'
      );
      refocusBarcode();
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, let ESC close it
      if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        if (showReceiptModal) setShowReceiptModal(false);
        if (showCameraModal) setShowCameraModal(false);
        if (showHeldSalesModal) setShowHeldSalesModal(false);
        refocusBarcode();
        return;
      }

      // POS Shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-product-search') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && selectedCartIndex < cart.length) {
          const newQtyStr = prompt(
            language === 'ar'
              ? `أدخل الكمية الجديدة لـ ${cart[selectedCartIndex].product.nameAr}:`
              : 'Enter new quantity:',
            cart[selectedCartIndex].quantity.toString()
          );
          if (newQtyStr) {
            const num = parseFloat(newQtyStr);
            if (!isNaN(num) && num > 0) updateQuantity(selectedCartIndex, num);
          }
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (heldCarts.length > 0) setShowHeldSalesModal(true);
        else showToast(language === 'ar' ? 'لا توجد فواتير معلقة' : 'No held sales', 'info');
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
        else showToast(language === 'ar' ? 'السلة فارغة!' : 'Cart is empty!', 'warning');
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    selectedCartIndex,
    heldCarts,
    showPaymentModal,
    showReceiptModal,
    showCameraModal,
    showHeldSalesModal,
    language,
    refocusBarcode,
  ]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = cart.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = Number(
    (subtotal - totalItemDiscount + (settings?.taxInclusive ? 0 : totalTax)).toFixed(2)
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden select-none bg-slate-100">
      {/* LEFT / CENTER: Cart & Bill Items List */}
      <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col h-full bg-white border-e border-slate-200">
        {/* Barcode Fast Input Bar */}
        <div className="p-3 bg-slate-900 text-white flex items-center gap-2 shadow-inner">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center relative">
            <Barcode className="w-5 h-5 absolute start-3 text-emerald-400 pointer-events-none" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'امسح الباركود بجهاز الاسكانر USB أو اكتب الكود واضغط Enter...'
                  : 'Scan barcode with USB scanner or type code and press Enter...'
              }
              className="w-full ps-10 pe-10 py-2.5 bg-slate-800 border-2 border-emerald-500/80 rounded-xl text-white text-sm font-mono placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
            />
            {barcodeInput && (
              <button
                type="button"
                onClick={() => setBarcodeInput('')}
                className="absolute end-3 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </form>

          {/* Camera Scanner Toggle */}
          <button
            type="button"
            onClick={() => setShowCameraModal(true)}
            className="px-3 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
            title="كاميرا الاسكانر"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'كاميرا' : 'Camera'}</span>
          </button>
        </div>

        {/* Cart Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-600">
          <div className="col-span-5">{language === 'ar' ? 'اسم الصنف / الباركود' : 'Product / Barcode'}</div>
          <div className="col-span-2 text-center">{language === 'ar' ? 'السعر' : 'Price'}</div>
          <div className="col-span-3 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</div>
          <div className="col-span-2 text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Barcode className="w-16 h-16 text-slate-300 stroke-[1.2] mb-3 animate-pulse" />
              <p className="font-extrabold text-slate-700 text-base">
                {language === 'ar' ? 'فاتورة البيع فارغة حالياً' : 'Cart is Empty'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {language === 'ar'
                  ? 'استخدم قارئ الباركود اليدوي USB أو اختر الأصناف السريعة من القائمة الجانبية.'
                  : 'Use USB barcode scanner or select products from the quick menu on the right.'}
              </p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const isSelected = selectedCartIndex === idx;
              return (
                <div
                  key={`${item.product.id}_${idx}`}
                  onClick={() => setSelectedCartIndex(idx)}
                  className={`grid grid-cols-12 gap-2 p-2.5 rounded-xl transition-all cursor-pointer items-center ${
                    isSelected ? 'bg-emerald-50/70 border border-emerald-300 shadow-2xs' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Product Info */}
                  <div className="col-span-5 flex flex-col">
                    <span className="font-bold text-xs text-slate-900 leading-tight">
                      {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>{item.product.barcode}</span>
                      <span className="text-emerald-700 font-bold">({item.product.unit})</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-center font-bold text-xs font-mono text-slate-800">
                    {item.price.toFixed(2)}
                  </div>

                  {/* Quantity controls */}
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(idx, item.quantity - 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-10 text-center font-black text-sm font-mono text-slate-900">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(idx, item.quantity + 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="font-extrabold text-xs font-mono text-slate-900">
                      {item.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(idx);
                      }}
                      className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM FINANCIAL SUMMARY & ACTION BAR */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal, Tax, Discount details */}
          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
              <span className="text-slate-500">{language === 'ar' ? 'المجموع:' : 'Subtotal:'}</span>
              <span className="font-mono text-slate-800">{subtotal.toFixed(2)} ج.م</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
              <span className="text-slate-500">{language === 'ar' ? 'الخصومات:' : 'Discount:'}</span>
              <span className="font-mono text-rose-600">-{totalItemDiscount.toFixed(2)} ج.م</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
              <span className="text-slate-500">{language === 'ar' ? 'الضريبة (14%):' : 'Tax:'}</span>
              <span className="font-mono text-slate-800">{totalTax.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Grand Total Bar */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">
                {language === 'ar' ? 'المبلغ الإجمالي النهائي (Grand Total)' : 'Grand Total'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {grandTotal.toFixed(2)}{' '}
                <span className="text-sm font-normal text-emerald-200">ج.م</span>
              </div>
            </div>

            {/* Quick Actions (Hold, Recall, Clear) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleHoldSale}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="تعليق البيع (F8)"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{language === 'ar' ? 'تعليق (F8)' : 'Hold'}</span>
              </button>

              {heldCarts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeldSalesModal(true)}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer animate-pulse"
                  title="استرجاع معلق (F9)"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>({heldCarts.length})</span>
                </button>
              )}

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg border border-rose-800/40 transition-colors"
                  title="إلغاء السلة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* PAY BUTTON */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>{language === 'ar' ? 'الدفع (F10)' : 'Checkout (F10)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Quick Product Grid & Categories */}
      <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col h-full bg-slate-50">
        {/* Product Search & Category Filters */}
        <div className="p-3 bg-white border-b border-slate-200 space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute top-3 start-3 text-slate-400 pointer-events-none" />
            <input
              id="pos-product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الكود (F2)...' : 'Search by name or code (F2)...'}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          {/* Category Tabs Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {language === 'ar' ? 'الكل (All)' : 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {language === 'ar' ? cat.nameAr : cat.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingProducts ? (
            <div className="h-40 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
              <span>{language === 'ar' ? 'لا توجد منتجات مطابقة' : 'No products found'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((prod) => {
                const stock = prod.stock ?? 0;
                const isOutOfStock = prod.trackStock && stock <= 0;

                return (
                  <button
                    key={prod.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod, 1)}
                    className={`p-2.5 rounded-xl border text-start flex flex-col justify-between transition-all group relative cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-mono text-slate-400 truncate max-w-[70px]">
                          {prod.barcode.slice(-5)}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] ${
                            stock <= prod.minStock
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {stock} {prod.unit}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-emerald-700">
                        {language === 'ar' ? prod.nameAr : prod.nameEn}
                      </h4>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black font-mono text-emerald-700">
                        {prod.sellingPrice.toFixed(2)} ج.م
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        +
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <PaymentModal
          items={cart}
          subtotal={subtotal}
          initialDiscount={totalItemDiscount}
          taxAmount={totalTax}
          total={grandTotal}
          onClose={() => {
            setShowPaymentModal(false);
            refocusBarcode();
          }}
          onSuccess={(invoice) => {
            setLastInvoice(invoice);
            setCart([]);
            setShowPaymentModal(false);
            setShowReceiptModal(true);
            loadProducts(); // refresh stock numbers
            refreshShift(); // refresh financial metrics of active shift
          }}
        />
      )}

      {/* THERMAL RECEIPT MODAL */}
      {showReceiptModal && lastInvoice && (
        <ThermalReceiptModal
          invoice={lastInvoice}
          onClose={() => {
            setShowReceiptModal(false);
            refocusBarcode();
          }}
          onNewSale={() => {
            setShowReceiptModal(false);
            clearCart();
            refocusBarcode();
          }}
        />
      )}

      {/* CAMERA SCANNER MODAL */}
      {showCameraModal && (
        <CameraScannerModal
          onScan={(code) => {
            setBarcodeInput(code);
            // Auto submit
            apiClient.get<any>(`/pos/barcode/${encodeURIComponent(code)}?branchId=${branch?.id || 'BR01'}`)
              .then((data) => {
                if (data && data.found && data.product) {
                  addToCart(data.product, 1);
                  setBarcodeInput('');
                  showToast(
                    language === 'ar'
                      ? `تمت إضافة: ${data.product.nameAr}`
                      : `Added: ${data.product.nameEn}`,
                    'success'
                  );
                } else {
                  showToast(language === 'ar' ? data?.messageAr || 'المنتج غير موجود' : data?.messageEn || 'Product not found', 'error');
                }
              })
              .catch(() => {
                showToast(language === 'ar' ? 'خطأ في قراءة الباركود' : 'Barcode lookup failed', 'error');
              })
              .finally(() => refocusBarcode());
          }}
          onClose={() => {
            setShowCameraModal(false);
            refocusBarcode();
          }}
        />
      )}

      {/* HELD SALES MODAL */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-amber-400" />
                <span>{language === 'ar' ? 'الفواتير المعلقة (Held Sales)' : 'Held Sales'}</span>
              </h3>
              <button
                onClick={() => setShowHeldSalesModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {heldCarts.map((h, i) => {
                const total = h.items.reduce((s, it) => s + it.total, 0);
                return (
                  <div key={h.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        فاتورة معلقة #{i + 1} ({h.items.length} أصناف)
                      </span>
                      <span className="text-[10px] text-slate-500">{h.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{total.toFixed(2)} ج.م</span>
                      <button
                        onClick={() => handleRecallSale(h.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {language === 'ar' ? 'استرجاع' : 'Recall'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
