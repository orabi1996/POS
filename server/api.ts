import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import {
  CartItem,
  SaleInvoice,
  SalePayment,
  SaleReturn,
  Shift,
  Product,
  Expense,
  InventoryTransaction,
} from '../src/types/index.ts';

export const apiRouter = Router();

// --- Auth Routes ---
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const users = db.getUsers();
  const user = users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());

  if (!user) {
    return res.status(401).json({ messageAr: 'اسم المستخدم غير صحيح', messageEn: 'Invalid username' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ messageAr: 'هذا الحساب معطل، يرجى مراجعة المسؤول', messageEn: 'Account is deactivated' });
  }

  // Check branch
  const branch = db.getBranches().find((b) => b.id === user.branchId);

  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'LOGIN',
    module: 'Authentication',
    recordId: user.id,
    branchId: user.branchId,
    details: `تسجيل دخول ناجح للمستخدم ${user.nameAr} (${user.role})`,
  });

  res.json({
    user,
    branch,
    token: `token_${user.id}_${Date.now()}`,
  });
});

// --- Branches & Registers ---
apiRouter.get('/branches', (req: Request, res: Response) => {
  res.json(db.getBranches());
});

apiRouter.get('/registers', (req: Request, res: Response) => {
  const { branchId } = req.query;
  const registers = db.getRegisters();
  if (branchId) {
    return res.json(registers.filter((r) => r.branchId === branchId));
  }
  res.json(registers);
});

// --- Categories ---
apiRouter.get('/categories', (req: Request, res: Response) => {
  res.json(db.getCategories());
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  const { nameAr, nameEn, code, color, icon } = req.body;
  if (!nameAr || !nameEn) {
    return res.status(400).json({ message: 'Category names are required' });
  }
  const newCat = {
    id: `cat_${Date.now()}`,
    code: code || `CAT-${Date.now().toString().slice(-4)}`,
    nameAr,
    nameEn,
    color: color || '#0284c7',
    icon: icon || 'Tag',
    status: 'active' as const,
  };
  db.getCategories().push(newCat);
  db.save();
  res.status(201).json(newCat);
});

// --- Products & Barcode Lookup ---
apiRouter.get('/products', (req: Request, res: Response) => {
  const { branchId = 'BR01', search, categoryId, lowStock } = req.query as {
    branchId?: string;
    search?: string;
    categoryId?: string;
    lowStock?: string;
  };

  let products = db.getProducts().map((p) => {
    const stock = db.getProductStock(p.id, branchId);
    return { ...p, stock };
  });

  if (categoryId && categoryId !== 'all') {
    products = products.filter((p) => p.categoryId === categoryId);
  }

  if (search) {
    const term = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(term) ||
        p.nameEn.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.additionalBarcodes && p.additionalBarcodes.some((b) => b.toLowerCase().includes(term)))
    );
  }

  if (lowStock === 'true') {
    products = products.filter((p) => (p.stock ?? 0) <= p.minStock);
  }

  res.json(products);
});

// Fast Barcode Lookup for POS scanner
apiRouter.get('/pos/barcode/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const { branchId = 'BR01' } = req.query as { branchId?: string };

  const cleanCode = code.trim();
  const product = db.getProducts().find(
    (p) =>
      p.barcode === cleanCode ||
      p.sku === cleanCode ||
      p.qrCodeValue === cleanCode ||
      (p.additionalBarcodes && p.additionalBarcodes.includes(cleanCode))
  );

  if (!product) {
    return res.status(404).json({
      found: false,
      messageAr: `المنتج ذو الباركود ${cleanCode} غير مسجل بالنظام`,
      messageEn: `Product with barcode ${cleanCode} not found`,
    });
  }

  if (product.status !== 'active') {
    return res.status(400).json({
      found: false,
      messageAr: `المنتج (${product.nameAr}) موقوف حالياً`,
      messageEn: `Product is inactive`,
    });
  }

  const stock = db.getProductStock(product.id, branchId);

  res.json({
    found: true,
    product: { ...product, stock },
  });
});

// Product CRUD
apiRouter.post('/products', (req: Request, res: Response) => {
  const {
    id,
    sku,
    nameAr,
    nameEn,
    barcode,
    categoryId,
    unit,
    purchasePrice,
    sellingPrice,
    taxRate = 14,
    minStock = 10,
    trackStock = true,
    trackExpiry = false,
    description = '',
    branchId = 'BR01',
    initialStock = 0,
    userId = 'usr_admin',
    userName = 'أحمد محمود',
  } = req.body;

  if (!nameAr || !nameEn || !barcode || !sku || sellingPrice === undefined) {
    return res.status(400).json({ messageAr: 'يرجى ملء جميع الحقول الإلزامية', messageEn: 'Required fields missing' });
  }

  if (sellingPrice < 0 || purchasePrice < 0) {
    return res.status(400).json({ messageAr: 'لا يمكن أن تكون الأسعار بالسالب', messageEn: 'Prices cannot be negative' });
  }

  const existingBarcode = db.getProducts().find((p) => p.barcode === barcode && p.id !== id);
  if (existingBarcode) {
    return res.status(400).json({
      messageAr: `الباركود ${barcode} مستخدم بالفعل لمنتج: ${existingBarcode.nameAr}`,
      messageEn: `Barcode ${barcode} is already assigned to: ${existingBarcode.nameEn}`,
    });
  }

  const existingSku = db.getProducts().find((p) => p.sku === sku && p.id !== id);
  if (existingSku) {
    return res.status(400).json({
      messageAr: `رمز SKU ${sku} مستخدم بالفعل`,
      messageEn: `SKU ${sku} is already assigned`,
    });
  }

  const products = db.getProducts();

  if (id) {
    // Edit
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const oldProduct = { ...products[index] };
    products[index] = {
      ...products[index],
      sku,
      nameAr,
      nameEn,
      barcode,
      categoryId,
      unit,
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate),
      minStock: Number(minStock),
      trackStock: Boolean(trackStock),
      trackExpiry: Boolean(trackExpiry),
      description,
      updatedAt: new Date().toISOString(),
    };

    db.logAudit({
      userId,
      userName,
      userRole: 'Admin',
      action: 'PRODUCT_UPDATED',
      module: 'Products',
      recordId: id,
      oldValues: oldProduct,
      newValues: products[index],
      branchId,
      details: `تعديل بيانات المنتج ${nameAr}`,
    });

    db.save();
    return res.json({ ...products[index], stock: db.getProductStock(id, branchId) });
  }

  // Create new
  const newProduct: Product = {
    id: `prod_${Date.now()}`,
    sku,
    nameAr,
    nameEn,
    barcode,
    additionalBarcodes: [],
    qrCodeValue: `PROD-${sku}-${barcode}`,
    categoryId,
    brand: nameEn.split(' ')[0] || 'Generic',
    unit,
    purchasePrice: Number(purchasePrice),
    sellingPrice: Number(sellingPrice),
    taxRate: Number(taxRate),
    minStock: Number(minStock),
    maxStock: Number(minStock) * 4,
    trackStock: Boolean(trackStock),
    trackExpiry: Boolean(trackExpiry),
    description,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products.push(newProduct);

  // Set initial stock if provided
  if (Number(initialStock) > 0) {
    db.setProductStock(
      newProduct.id,
      branchId,
      Number(initialStock),
      'Opening Balance',
      'Initial',
      'SYS-NEW',
      userId,
      userName,
      'رصيد افتتاحي للمنتج الجديد'
    );
  } else {
    db.setProductStock(
      newProduct.id,
      branchId,
      0,
      'Opening Balance',
      'Initial',
      'SYS-NEW',
      userId,
      userName,
      'تهيئة رصيد صفر'
    );
  }

  db.logAudit({
    userId,
    userName,
    userRole: 'Admin',
    action: 'PRODUCT_CREATED',
    module: 'Products',
    recordId: newProduct.id,
    newValues: newProduct,
    branchId,
    details: `إضافة منتج جديد: ${nameAr} بسعر بيع ${sellingPrice}`,
  });

  db.save();
  res.status(201).json({ ...newProduct, stock: Number(initialStock) || 0 });
});

// --- Shifts Management ---
apiRouter.get('/shifts', (req: Request, res: Response) => {
  const { branchId } = req.query as { branchId?: string };
  let shifts = db.getShifts();
  if (branchId && branchId !== 'all') {
    shifts = shifts.filter((s) => s.branchId === branchId);
  }
  res.json(shifts);
});

apiRouter.get('/shifts/current', (req: Request, res: Response) => {
  const { cashierId, branchId } = req.query as { cashierId?: string; branchId?: string };
  const shifts = db.getShifts();
  const current = shifts.find(
    (s) => s.status === 'open' && (!cashierId || s.cashierId === cashierId) && (!branchId || s.branchId === branchId)
  );

  res.json({ hasOpenShift: !!current, shift: current || null });
});

apiRouter.post('/shifts/open', (req: Request, res: Response) => {
  const { cashierId, cashierName, branchId, branchName, registerId, registerName, openingCash } = req.body;

  // Check if cashier already has an open shift
  const existing = db.getShifts().find((s) => s.cashierId === cashierId && s.status === 'open');
  if (existing) {
    return res.status(400).json({
      messageAr: 'لديك وردية مفتوحة بالفعل، يرجى إغلاقها أولاً قبل فتح وردية جديدة',
      messageEn: 'You already have an open shift',
    });
  }

  const shiftNumber = `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(
    db.getShifts().length + 1
  )
    .toString()
    .padStart(3, '0')}`;

  const newShift: Shift = {
    id: `shift_${Date.now()}`,
    shiftNumber,
    cashierId,
    cashierName,
    branchId,
    branchName: branchName || 'الفرع الرئيسي',
    registerId,
    registerName: registerName || 'كاشير 1',
    openingCash: Number(openingCash) || 0,
    openingTime: new Date().toISOString(),
    status: 'open',
    salesCount: 0,
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    walletSales: 0,
    returnsAmount: 0,
    expensesAmount: 0,
    cashIn: 0,
    cashOut: 0,
    expectedCash: Number(openingCash) || 0,
  };

  db.getShifts().unshift(newShift);

  db.logAudit({
    userId: cashierId,
    userName: cashierName,
    userRole: 'Cashier',
    action: 'SHIFT_OPENED',
    module: 'Shifts',
    recordId: newShift.id,
    branchId,
    details: `فتح وردية جديدة رقم ${shiftNumber} بعهدة نقدية ${openingCash} ج.م`,
  });

  db.save();
  res.status(201).json(newShift);
});

apiRouter.post('/shifts/close', (req: Request, res: Response) => {
  const { shiftId, actualCash, notes, userId, userName } = req.body;
  const shifts = db.getShifts();
  const shift = shifts.find((s) => s.id === shiftId);

  if (!shift) {
    return res.status(404).json({ message: 'Shift not found' });
  }

  if (shift.status === 'closed') {
    return res.status(400).json({ messageAr: 'الوردية مغلقة بالفعل', messageEn: 'Shift already closed' });
  }

  const expected = shift.openingCash + shift.cashSales - shift.returnsAmount - shift.expensesAmount + shift.cashIn - shift.cashOut;
  const actual = Number(actualCash) || 0;
  const difference = actual - expected;

  shift.status = 'closed';
  shift.closingTime = new Date().toISOString();
  shift.expectedCash = expected;
  shift.actualCash = actual;
  shift.difference = difference;
  shift.notes = notes || '';

  db.logAudit({
    userId: userId || shift.cashierId,
    userName: userName || shift.cashierName,
    userRole: 'Cashier',
    action: 'SHIFT_CLOSED',
    module: 'Shifts',
    recordId: shift.id,
    branchId: shift.branchId,
    details: `إغلاق الوردية ${shift.shiftNumber}: المتوقع ${expected} ج.م، الفعلي ${actual} ج.م، الفارق ${difference} ج.م`,
  });

  db.save();
  res.json(shift);
});

// --- Checkout (Atomic Sales Transaction) ---
apiRouter.post('/sales/checkout', (req: Request, res: Response) => {
  const {
    branchId,
    cashierId,
    cashierName,
    shiftId,
    items,
    payments,
    discountType = 'fixed',
    discountValue = 0,
    customerId,
    customerName,
    notes,
  } = req.body as {
    branchId: string;
    cashierId: string;
    cashierName: string;
    shiftId: string;
    items: CartItem[];
    payments: SalePayment[];
    discountType?: 'fixed' | 'percentage';
    discountValue?: number;
    customerId?: string;
    customerName?: string;
    notes?: string;
  };

  if (!items || items.length === 0) {
    return res.status(400).json({ messageAr: 'سلة المبيعات فارغة', messageEn: 'Cart is empty' });
  }

  // Verify shift
  const shift = db.getShifts().find((s) => s.id === shiftId && s.status === 'open');
  if (!shift) {
    return res.status(400).json({
      messageAr: 'لا يمكن إتمام البيع بدون وردية كاشير مفتوحة! يرجى فتح وردية أولاً.',
      messageEn: 'No active shift found. Please open a shift first.',
    });
  }

  // Check inventory stock and validate items
  const validatedItems: SaleInvoice['items'] = [];
  let calculatedSubtotal = 0;
  let calculatedCost = 0;

  for (const it of items) {
    const p = db.getProducts().find((prod) => prod.id === it.product.id);
    if (!p) {
      return res.status(400).json({ messageAr: `المنتج ${it.product.nameAr} غير موجود`, messageEn: 'Product not found' });
    }
    if (p.status !== 'active') {
      return res.status(400).json({ messageAr: `المنتج ${p.nameAr} معطل حالياً`, messageEn: 'Product inactive' });
    }

    const currentStock = db.getProductStock(p.id, branchId);
    if (p.trackStock && currentStock < it.quantity) {
      return res.status(400).json({
        messageAr: `المخزون غير كافٍ للمنتج: ${p.nameAr} (المتاح: ${currentStock} ${p.unit}، المطلوب: ${it.quantity})`,
        messageEn: `Insufficient stock for ${p.nameEn} (Available: ${currentStock}, Requested: ${it.quantity})`,
      });
    }

    const price = p.sellingPrice;
    const cost = p.purchasePrice;
    const itemSubtotal = price * it.quantity;
    const itemDiscount = it.discount || 0;
    const itemTax = ((itemSubtotal - itemDiscount) * (p.taxRate || 14)) / 100;
    const lineTotal = itemSubtotal - itemDiscount + (db.getSettings().taxInclusive ? 0 : itemTax);

    calculatedSubtotal += itemSubtotal;
    calculatedCost += cost * it.quantity;

    validatedItems.push({
      productId: p.id,
      productNameAr: p.nameAr,
      productNameEn: p.nameEn,
      barcode: p.barcode,
      unit: p.unit,
      price,
      costPrice: cost,
      quantity: it.quantity,
      discount: itemDiscount,
      taxRate: p.taxRate || 14,
      taxAmount: itemTax,
      lineTotal: Number(lineTotal.toFixed(2)),
      refundedQuantity: 0,
    });
  }

  // Invoice Discount
  let totalDiscount = validatedItems.reduce((sum, item) => sum + item.discount, 0);
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      const invDisc = (calculatedSubtotal * discountValue) / 100;
      totalDiscount += invDisc;
    } else {
      totalDiscount += Number(discountValue);
    }
  }

  const taxableAmount = Math.max(0, calculatedSubtotal - totalDiscount);
  const totalTax = (taxableAmount * (db.getSettings().defaultTaxRate || 14)) / 100;
  const grandTotal = db.getSettings().taxInclusive
    ? taxableAmount
    : Number((taxableAmount + totalTax).toFixed(2));

  // Payments verification
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (totalPaid < grandTotal) {
    return res.status(400).json({
      messageAr: `المبلغ المدفوع (${totalPaid} ج.م) أقل من إجمالي الفاتورة (${grandTotal} ج.م)`,
      messageEn: `Amount paid (${totalPaid}) is less than total (${grandTotal})`,
    });
  }

  const change = totalPaid > grandTotal ? Number((totalPaid - grandTotal).toFixed(2)) : 0;
  const branch = db.getBranches().find((b) => b.id === branchId);

  // Generate unique invoice number: BR01-YYYYMMDD-000123
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = (db.getSales().length + 1).toString().padStart(6, '0');
  const invoiceNumber = `${branch ? branch.id : 'BR01'}-${dateStr}-${seq}`;

  const grossProfit = Number((grandTotal - calculatedCost).toFixed(2));

  const invoice: SaleInvoice = {
    id: `inv_${Date.now()}`,
    invoiceNumber,
    branchId,
    branchNameAr: branch ? branch.nameAr : 'الفرع الرئيسي',
    branchNameEn: branch ? branch.nameEn : 'Main Branch',
    cashierId,
    cashierName,
    shiftId,
    customerId: customerId || 'cust_01',
    customerName: customerName || 'عميل نقدي عام',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString('ar-EG', { hour12: true }),
    items: validatedItems,
    subtotal: Number(calculatedSubtotal.toFixed(2)),
    discount: Number(totalDiscount.toFixed(2)),
    discountType,
    discountValue: Number(discountValue),
    tax: Number(totalTax.toFixed(2)),
    total: grandTotal,
    totalCost: Number(calculatedCost.toFixed(2)),
    grossProfit,
    payments,
    amountPaid: totalPaid,
    change,
    status: 'Completed',
    notes,
    reprintCount: 0,
  };

  // 1. Save invoice
  db.getSales().unshift(invoice);

  // 2. Deduct inventory atomically & record transaction ledger
  for (const item of validatedItems) {
    const prod = db.getProducts().find((p) => p.id === item.productId);
    if (prod && prod.trackStock) {
      const currentStock = db.getProductStock(item.productId, branchId);
      const newStock = currentStock - item.quantity;
      db.setProductStock(
        item.productId,
        branchId,
        newStock,
        'Sale',
        'Sale',
        invoice.invoiceNumber,
        cashierId,
        cashierName,
        `خصم تلقائي لفاتورة بيع رقم ${invoice.invoiceNumber}`
      );
    }
  }

  // 3. Update shift financial metrics
  shift.salesCount += 1;
  shift.totalSales += grandTotal;
  for (const p of payments) {
    if (p.method === 'cash') {
      const cashPortion = p.amount - change; // deduct change from cash intake
      shift.cashSales += Math.max(0, cashPortion);
      shift.expectedCash += Math.max(0, cashPortion);
    } else if (p.method === 'card') {
      shift.cardSales += p.amount;
    } else if (p.method === 'wallet') {
      shift.walletSales += p.amount;
    }
  }

  // 4. Audit Log
  db.logAudit({
    userId: cashierId,
    userName: cashierName,
    userRole: 'Cashier',
    action: 'SALE_COMPLETED',
    module: 'Sales',
    recordId: invoice.id,
    branchId,
    details: `إتمام عملية بيع ${invoice.invoiceNumber} بقيمة ${grandTotal} ج.م (${validatedItems.length} أصناف)`,
  });

  db.save();

  res.status(201).json({
    success: true,
    invoice,
  });
});

// --- Sales List & Details ---
apiRouter.get('/sales', (req: Request, res: Response) => {
  const { branchId, status, date, search } = req.query as {
    branchId?: string;
    status?: string;
    date?: string;
    search?: string;
  };

  let sales = db.getSales();

  if (branchId && branchId !== 'all') {
    sales = sales.filter((s) => s.branchId === branchId);
  }

  if (status && status !== 'all') {
    sales = sales.filter((s) => s.status === status);
  }

  if (date) {
    sales = sales.filter((s) => s.date === date);
  }

  if (search) {
    const term = search.trim().toLowerCase();
    sales = sales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(term) ||
        s.cashierName.toLowerCase().includes(term) ||
        (s.customerName && s.customerName.toLowerCase().includes(term))
    );
  }

  res.json(sales);
});

apiRouter.get('/sales/:id', (req: Request, res: Response) => {
  const invoice = db.getSales().find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ messageAr: 'الفاتورة غير موجودة', messageEn: 'Invoice not found' });
  }
  res.json(invoice);
});

// Reprint Receipt (with audit logging)
apiRouter.post('/sales/:id/reprint', (req: Request, res: Response) => {
  const { userId = 'usr_admin', userName = 'أحمد محمود' } = req.body;
  const invoice = db.getSales().find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  invoice.reprintCount = (invoice.reprintCount || 0) + 1;

  db.logAudit({
    userId,
    userName,
    userRole: 'Cashier',
    action: 'RECEIPT_REPRINTED',
    module: 'Sales',
    recordId: invoice.id,
    branchId: invoice.branchId,
    details: `إعادة طباعة إيصال الفاتورة ${invoice.invoiceNumber} (المرة رقم ${invoice.reprintCount})`,
  });

  db.save();
  res.json({ success: true, invoice });
});

// Cancel / Void Invoice (restores stock & logs audit)
apiRouter.post('/sales/:id/cancel', (req: Request, res: Response) => {
  const { reason, userId = 'usr_admin', userName = 'أحمد محمود' } = req.body;
  const invoice = db.getSales().find((s) => s.id === req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  if (invoice.status === 'Cancelled') {
    return res.status(400).json({ messageAr: 'الفاتورة ملغاة بالفعل', messageEn: 'Invoice already cancelled' });
  }

  // Restore inventory
  for (const item of invoice.items) {
    const prod = db.getProducts().find((p) => p.id === item.productId);
    if (prod && prod.trackStock) {
      const currentStock = db.getProductStock(item.productId, invoice.branchId);
      db.setProductStock(
        item.productId,
        invoice.branchId,
        currentStock + item.quantity,
        'Stock Adjustment',
        'Sale',
        invoice.invoiceNumber,
        userId,
        userName,
        `إرجاع مخزون نتيجة إلغاء الفاتورة ${invoice.invoiceNumber}`
      );
    }
  }

  invoice.status = 'Cancelled';
  invoice.cancelReason = reason || 'إلغاء بناء على طلب العميل/الإدارة';
  invoice.cancelledBy = userName;
  invoice.cancelledAt = new Date().toISOString();

  db.logAudit({
    userId,
    userName,
    userRole: 'Admin',
    action: 'INVOICE_CANCELLED',
    module: 'Sales',
    recordId: invoice.id,
    branchId: invoice.branchId,
    details: `إلغاء الفاتورة رقم ${invoice.invoiceNumber} بقيمة ${invoice.total} ج.م. السبب: ${invoice.cancelReason}`,
  });

  db.save();
  res.json({ success: true, invoice });
});

// --- Sales Returns ---
apiRouter.post('/returns', (req: Request, res: Response) => {
  const {
    invoiceNumber,
    items,
    refundMethod = 'cash',
    reason = '',
    userId,
    userName,
    shiftId,
    branchId,
  } = req.body;

  const invoice = db.getSales().find((s) => s.invoiceNumber === invoiceNumber || s.id === invoiceNumber);
  if (!invoice) {
    return res.status(404).json({ messageAr: 'الفاتورة الأصلية غير موجودة', messageEn: 'Original invoice not found' });
  }

  if (invoice.status === 'Cancelled') {
    return res.status(400).json({ messageAr: 'لا يمكن إرجاع فاتورة ملغاة', messageEn: 'Cannot refund a cancelled invoice' });
  }

  let totalRefund = 0;
  const processedReturnItems = [];

  for (const retItem of items) {
    const origItem = invoice.items.find((i) => i.productId === retItem.productId);
    if (!origItem) {
      return res.status(400).json({
        messageAr: `المنتج غير موجود في الفاتورة الأصلية`,
        messageEn: 'Item not in original invoice',
      });
    }

    const previouslyRefunded = origItem.refundedQuantity || 0;
    const remainingReturnable = origItem.quantity - previouslyRefunded;

    if (retItem.quantity > remainingReturnable) {
      return res.status(400).json({
        messageAr: `الكمية المطلوب إرجاعها (${retItem.quantity}) أكبر من الكمية المتبقية القابلة للإرجاع (${remainingReturnable}) للمنتج ${origItem.productNameAr}`,
        messageEn: `Return quantity exceeds returnable quantity`,
      });
    }

    origItem.refundedQuantity = previouslyRefunded + retItem.quantity;

    const lineTotalRefund = (origItem.lineTotal / origItem.quantity) * retItem.quantity;
    totalRefund += lineTotalRefund;

    processedReturnItems.push({
      productId: origItem.productId,
      productNameAr: origItem.productNameAr,
      quantity: retItem.quantity,
      price: origItem.price,
      taxRate: origItem.taxRate,
      taxAmount: (origItem.taxAmount / origItem.quantity) * retItem.quantity,
      total: Number(lineTotalRefund.toFixed(2)),
      restock: retItem.restock !== false,
    });

    // If restock is true, return to stock
    if (retItem.restock !== false) {
      const currentStock = db.getProductStock(origItem.productId, invoice.branchId);
      db.setProductStock(
        origItem.productId,
        invoice.branchId,
        currentStock + retItem.quantity,
        'Sales Return',
        'Return',
        invoice.invoiceNumber,
        userId,
        userName,
        `مرتجع مبيعات للفاتورة ${invoice.invoiceNumber}`
      );
    }
  }

  // Update original invoice status
  const allRefunded = invoice.items.every((i) => (i.refundedQuantity || 0) >= i.quantity);
  invoice.status = allRefunded ? 'Refunded' : 'Partially Refunded';

  const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(
    db.getReturns().length + 1
  )
    .toString()
    .padStart(4, '0')}`;

  const saleReturn: SaleReturn = {
    id: `ret_${Date.now()}`,
    returnNumber,
    originalInvoiceId: invoice.id,
    originalInvoiceNumber: invoice.invoiceNumber,
    branchId: invoice.branchId,
    cashierId: userId,
    cashierName: userName,
    shiftId: shiftId || invoice.shiftId,
    date: new Date().toISOString().slice(0, 10),
    items: processedReturnItems,
    subtotal: totalRefund,
    taxAmount: processedReturnItems.reduce((s, i) => s + i.taxAmount, 0),
    totalRefund: Number(totalRefund.toFixed(2)),
    refundMethod,
    reason: reason || 'طلب العميل إرجاع المنتج',
  };

  db.getReturns().unshift(saleReturn);

  // Deduct from shift if open
  if (shiftId) {
    const shift = db.getShifts().find((s) => s.id === shiftId);
    if (shift) {
      shift.returnsAmount += totalRefund;
      if (refundMethod === 'cash') {
        shift.expectedCash -= totalRefund;
      }
    }
  }

  db.logAudit({
    userId,
    userName,
    userRole: 'Cashier',
    action: 'RETURN_CREATED',
    module: 'Returns',
    recordId: saleReturn.id,
    branchId: invoice.branchId,
    details: `إنشاء مرتجع مبيعات ${returnNumber} للفاتورة ${invoice.invoiceNumber} بقيمة ${totalRefund} ج.م`,
  });

  db.save();
  res.status(201).json({ success: true, return: saleReturn });
});

// --- Inventory Ledger & Adjustments ---
apiRouter.get('/inventory/movements', (req: Request, res: Response) => {
  const { branchId, productId, type } = req.query as {
    branchId?: string;
    productId?: string;
    type?: string;
  };

  let list = db.getTransactions();
  if (branchId && branchId !== 'all') {
    list = list.filter((t) => t.branchId === branchId);
  }
  if (productId && productId !== 'all') {
    list = list.filter((t) => t.productId === productId);
  }
  if (type && type !== 'all') {
    list = list.filter((t) => t.transactionType === type || (t as any).type === type);
  }

  res.json(list);
});

apiRouter.get('/inventory/transactions', (req: Request, res: Response) => {
  const { branchId, productId, type } = req.query as {
    branchId?: string;
    productId?: string;
    type?: string;
  };

  let list = db.getTransactions();
  if (branchId && branchId !== 'all') {
    list = list.filter((t) => t.branchId === branchId);
  }
  if (productId && productId !== 'all') {
    list = list.filter((t) => t.productId === productId);
  }
  if (type && type !== 'all') {
    list = list.filter((t) => t.transactionType === type || (t as any).type === type);
  }

  res.json(list);
});

apiRouter.post('/inventory/adjust', (req: Request, res: Response) => {
  const { productId, branchId, actualQuantity, reason, userId, userName } = req.body;

  const currentStock = db.getProductStock(productId, branchId);
  const diff = Number(actualQuantity) - currentStock;

  db.setProductStock(
    productId,
    branchId,
    Number(actualQuantity),
    'Stock Adjustment',
    'Adjustment',
    `ADJ-${Date.now().toString().slice(-6)}`,
    userId || 'usr_admin',
    userName || 'أحمد محمود',
    `تسوية جردية: الفرق ${diff > 0 ? '+' : ''}${diff}. السبب: ${reason || 'جرد دوري'}`
  );

  db.logAudit({
    userId: userId || 'usr_admin',
    userName: userName || 'أحمد محمود',
    userRole: 'Inventory Officer',
    action: 'STOCK_ADJUSTED',
    module: 'Inventory',
    recordId: productId,
    branchId,
    details: `تسوية جردية للمنتج. الرصيد السابق: ${currentStock}، الرصيد الجديد: ${actualQuantity}`,
  });

  res.json({ success: true, newStock: Number(actualQuantity) });
});

// --- Expenses ---
apiRouter.get('/expenses', (req: Request, res: Response) => {
  res.json(db.getExpenses());
});

apiRouter.post('/expenses', (req: Request, res: Response) => {
  const { category, amount, description, branchId, shiftId, userId, userName } = req.body;

  if (!category || !amount || Number(amount) <= 0) {
    return res.status(400).json({ messageAr: 'المبلغ والتصنيف مطلوبان', messageEn: 'Amount and category required' });
  }

  const exp: Expense = {
    id: `exp_${Date.now()}`,
    expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
    branchId: branchId || 'BR01',
    shiftId,
    category,
    amount: Number(amount),
    description: description || '',
    userId: userId || 'usr_admin',
    userName: userName || 'أحمد محمود',
    date: new Date().toISOString().slice(0, 10),
  };

  db.getExpenses().unshift(exp);

  if (shiftId) {
    const shift = db.getShifts().find((s) => s.id === shiftId);
    if (shift) {
      shift.expensesAmount += exp.amount;
      shift.expectedCash -= exp.amount;
    }
  }

  db.logAudit({
    userId: exp.userId,
    userName: exp.userName,
    userRole: 'Cashier',
    action: 'EXPENSE_RECORDED',
    module: 'Expenses',
    recordId: exp.id,
    branchId: exp.branchId,
    details: `تسجيل مصروف ${exp.category} بقيمة ${exp.amount} ج.م: ${exp.description}`,
  });

  db.save();
  res.status(201).json(exp);
});

// --- Customers & Suppliers ---
apiRouter.get('/customers', (req: Request, res: Response) => {
  res.json(db.getCustomers());
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const { name, phone, email, address } = req.body;
  const newCust = {
    id: `cust_${Date.now()}`,
    code: `CUST-${(db.getCustomers().length + 1).toString().padStart(3, '0')}`,
    name,
    phone,
    email,
    address,
    balance: 0,
    points: 0,
    status: 'active' as const,
  };
  db.getCustomers().push(newCust);
  db.save();
  res.status(201).json(newCust);
});

apiRouter.get('/suppliers', (req: Request, res: Response) => {
  res.json(db.getSuppliers());
});

// --- Dashboard Stats & Reports ---
apiRouter.get('/reports/daily', (req: Request, res: Response) => {
  const { branchId = 'BR01' } = req.query as { branchId?: string };

  const today = new Date().toISOString().slice(0, 10);
  const sales = db.getSales().filter((s) => s.branchId === branchId && s.status !== 'Cancelled');
  const todaySales = sales.filter((s) => s.date === today);

  const todayTotalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayTotalProfit = todaySales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);
  const todayInvoices = todaySales.length;
  const averageBasket = todayInvoices > 0 ? todayTotalRevenue / todayInvoices : 0;

  const cashSales = todaySales.reduce(
    (sum, s) => sum + (s.payments || []).filter((p) => p.method === 'cash').reduce((pSum, p) => pSum + p.amount, 0),
    0
  );
  const cardSales = todaySales.reduce(
    (sum, s) => sum + (s.payments || []).filter((p) => p.method === 'card').reduce((pSum, p) => pSum + p.amount, 0),
    0
  );

  // Products stock check
  const products = db.getProducts();
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    const stock = db.getProductStock(p.id, branchId);
    if (stock <= 0) outOfStockCount++;
    else if (stock <= p.minStock) lowStockCount++;
  });

  // Top selling products
  const productSalesMap: Record<string, { id: string; name: string; nameAr: string; quantity: number; qty: number; total: number }> = {};
  sales.forEach((sale) => {
    (sale.items || []).forEach((it) => {
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = {
          id: it.productId,
          name: it.productNameAr,
          nameAr: it.productNameAr,
          quantity: 0,
          qty: 0,
          total: 0,
        };
      }
      productSalesMap[it.productId].quantity += it.quantity;
      productSalesMap[it.productId].qty += it.quantity;
      productSalesMap[it.productId].total += it.lineTotal;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Hourly sales distribution
  const hourlyBuckets: Record<string, number> = {};
  for (let h = 8; h <= 23; h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    hourlyBuckets[label] = 0;
  }
  todaySales.forEach((s) => {
    const time = s.time || '12:00';
    const hour = time.split(':')[0];
    const label = `${hour.padStart(2, '0')}:00`;
    if (hourlyBuckets[label] !== undefined) {
      hourlyBuckets[label] += s.total;
    } else {
      hourlyBuckets[label] = (hourlyBuckets[label] || 0) + s.total;
    }
  });

  const hourlySales = Object.entries(hourlyBuckets).map(([hour, salesVal]) => ({
    hour,
    sales: Number(salesVal.toFixed(2)),
  }));

  const metrics = {
    todaySales: Number(todayTotalRevenue.toFixed(2)),
    todayProfit: Number(todayTotalProfit.toFixed(2)),
    todayInvoices,
    averageBasket: Number(averageBasket.toFixed(2)),
    cashSales: Number(cashSales.toFixed(2)),
    cardSales: Number(cardSales.toFixed(2)),
    lowStockCount,
    outOfStockCount,
  };

  res.json({
    metrics,
    hourlySales,
    topProducts,
    ...metrics,
  });
});

apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const { branchId = 'BR01' } = req.query as { branchId?: string };

  const today = new Date().toISOString().slice(0, 10);
  const sales = db.getSales().filter((s) => s.branchId === branchId && s.status !== 'Cancelled');
  const todaySales = sales.filter((s) => s.date === today);

  const todayTotalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayTotalProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);
  const transactionsCount = todaySales.length;
  const avgBasket = transactionsCount > 0 ? todayTotalRevenue / transactionsCount : 0;

  const cashSales = todaySales.reduce(
    (sum, s) => sum + s.payments.filter((p) => p.method === 'cash').reduce((pSum, p) => pSum + p.amount, 0),
    0
  );
  const cardSales = todaySales.reduce(
    (sum, s) => sum + s.payments.filter((p) => p.method === 'card').reduce((pSum, p) => pSum + p.amount, 0),
    0
  );

  // Products stock check
  const products = db.getProducts();
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    const stock = db.getProductStock(p.id, branchId);
    if (stock <= 0) outOfStockCount++;
    else if (stock <= p.minStock) lowStockCount++;
  });

  // Top selling products
  const productSalesMap: Record<string, { id: string; name: string; nameAr: string; qty: number; quantity: number; total: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((it) => {
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = {
          id: it.productId,
          name: it.productNameAr,
          nameAr: it.productNameAr,
          qty: 0,
          quantity: 0,
          total: 0,
        };
      }
      productSalesMap[it.productId].qty += it.quantity;
      productSalesMap[it.productId].quantity += it.quantity;
      productSalesMap[it.productId].total += it.lineTotal;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  res.json({
    todaySales: todayTotalRevenue,
    todayProfit: todayTotalProfit,
    transactionsCount,
    avgBasket: Number(avgBasket.toFixed(2)),
    cashSales,
    cardSales,
    lowStockCount,
    outOfStockCount,
    topProducts,
    totalProductsCount: products.length,
  });
});

// --- Audit Logs ---
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const { module, action, search } = req.query as { module?: string; action?: string; search?: string };
  let logs = db.getAuditLogs();

  if (module && module !== 'all') {
    logs = logs.filter((l) => l.module === module);
  }
  if (action && action !== 'all') {
    logs = logs.filter((l) => l.action === action);
  }
  if (search) {
    const term = search.trim().toLowerCase();
    logs = logs.filter(
      (l) =>
        l.details.toLowerCase().includes(term) ||
        l.userName.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term)
    );
  }

  res.json(logs);
});

// --- Settings ---
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(db.getSettings());
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  db.logAudit({
    userId: req.body.userId || 'usr_admin',
    userName: req.body.userName || 'أحمد محمود',
    userRole: 'Admin',
    action: 'SETTINGS_UPDATED',
    module: 'Settings',
    recordId: 'SETTINGS',
    branchId: 'BR01',
    details: 'تحديث إعدادات النظام العامة وتنسيق الإيصال والضرائب',
  });
  res.json(updated);
});
