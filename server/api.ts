import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import { signToken, comparePassword } from './config/auth.ts';
import { authenticateJWT, optionalAuth } from './middleware/auth.ts';
import { requirePermission, requireBranchAccess, hasPermission, hasBranchAccess } from './middleware/permissions.ts';
import { processCheckout } from './services/checkoutService.ts';
import { AppError } from './middleware/errorHandler.ts';
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

// Global optional authentication middleware: populates req.user whenever Authorization: Bearer <token> is present
apiRouter.use(optionalAuth);

// --- Auth Routes ---
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      messageAr: 'اسم المستخدم وكلمة المرور مطلوبان',
      messageEn: 'Username and password are required',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Username and password are required',
        messageAr: 'اسم المستخدم وكلمة المرور مطلوبان',
      },
    });
  }

  const userRecord = db.findUserForAuth(username);
  if (!userRecord || !userRecord.passwordHash) {
    return res.status(401).json({
      success: false,
      messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      messageEn: 'Invalid username or password',
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      },
    });
  }

  const isMatch = comparePassword(password, userRecord.passwordHash);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      messageEn: 'Invalid username or password',
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        messageAr: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      },
    });
  }

  if (userRecord.status !== 'active') {
    return res.status(403).json({
      success: false,
      messageAr: 'هذا الحساب معطل، يرجى مراجعة المسؤول',
      messageEn: 'Account is deactivated',
      error: {
        code: 'USER_DEACTIVATED',
        message: 'Account is deactivated',
        messageAr: 'هذا الحساب معطل، يرجى مراجعة المسؤول',
      },
    });
  }

  const token = signToken({
    userId: userRecord.id,
    username: userRecord.username,
    role: userRecord.role,
    branchId: userRecord.branchId,
  });

  const branch = db.getBranches().find((b) => b.id === userRecord.branchId);
  const { passwordHash, ...safeUser } = userRecord;

  db.logAudit({
    userId: safeUser.id,
    userName: safeUser.nameAr,
    userRole: safeUser.role,
    action: 'LOGIN',
    module: 'Authentication',
    recordId: safeUser.id,
    branchId: safeUser.branchId,
    details: `تسجيل دخول ناجح للمستخدم ${safeUser.nameAr} (${safeUser.role})`,
  });

  res.json({
    success: true,
    user: safeUser,
    branch,
    token,
  });
});

apiRouter.get('/auth/me', authenticateJWT, (req: Request, res: Response) => {
  const user = req.user!;
  const branch = db.getBranches().find((b) => b.id === user.branchId);
  const openShift = db.getShifts().find(
    (s) => s.cashierId === user.id && s.status === 'open'
  );

  res.json({
    success: true,
    user,
    branch,
    openShift: openShift || null,
  });
});

// --- Branches & Registers ---
apiRouter.get('/branches', (req: Request, res: Response) => {
  res.json(db.getBranches());
});

apiRouter.get('/registers', authenticateJWT, requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId } = req.query as { branchId?: string };
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }
  const registers = db.getRegisters();
  if (branchId) {
    return res.json(registers.filter((r) => r.branchId === branchId));
  }
  res.json(registers);
});

// --- Categories ---
apiRouter.get('/categories', authenticateJWT, (req: Request, res: Response) => {
  res.json(db.getCategories());
});

apiRouter.post('/categories', authenticateJWT, requirePermission('CATEGORY_MANAGE'), (req: Request, res: Response) => {
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
  db.logAudit({
    userId: req.user!.id,
    userName: req.user!.nameAr,
    userRole: req.user!.role,
    action: 'CATEGORY_CREATED',
    module: 'Categories',
    recordId: newCat.id,
    branchId: req.user!.branchId,
    details: `إضافة تصنيف جديد: ${nameAr}`,
  });
  db.save();
  res.status(201).json(newCat);
});

// --- Products & Barcode Lookup ---
apiRouter.get(
  '/products',
  authenticateJWT,
  requirePermission('PRODUCT_VIEW'),
  requireBranchAccess,
  (req: Request, res: Response) => {
    const user = req.user!;
    let { branchId = user.branchId || 'BR01', search, categoryId, lowStock } = req.query as {
      branchId?: string;
      search?: string;
      categoryId?: string;
      lowStock?: string;
    };

    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      branchId = user.branchId;
    }

    let products = db.getProducts().map((p) => {
      const stock = db.getProductStock(p.id, branchId);
      // Mask wholesale purchasePrice for cashier role
      if (user.role === 'Cashier') {
        return { ...p, purchasePrice: 0, stock };
      }
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
  }
);

// Fast Barcode Lookup for POS scanner
apiRouter.get(
  '/pos/barcode/:code',
  authenticateJWT,
  requirePermission('POS_SELL'),
  requireBranchAccess,
  (req: Request, res: Response) => {
    const user = req.user!;
    const { code } = req.params;
    let { branchId = user.branchId || 'BR01' } = req.query as { branchId?: string };

    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      branchId = user.branchId;
    }

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
    const safeProduct = user.role === 'Cashier' ? { ...product, purchasePrice: 0 } : product;

    res.json({
      found: true,
      product: { ...safeProduct, stock },
    });
  }
);

// Product CRUD
apiRouter.post('/products', authenticateJWT, requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const requiredPerm = req.body.id ? 'PRODUCT_EDIT' : 'PRODUCT_CREATE';

  if (!hasPermission(user.role, requiredPerm)) {
    try {
      db.logAudit({
        userId: user.id,
        userName: user.nameAr,
        userRole: user.role,
        action: 'PERMISSION_DENIED',
        module: 'Security',
        recordId: requiredPerm,
        branchId: user.branchId,
        details: `تم رفض الوصول: المستخدم يحتاج صلاحية (${requiredPerm}) للمسار [POST] /api/products`,
      });
    } catch {}

    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: `Access denied. Required permission: ${requiredPerm}`,
        messageAr: 'عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء',
      },
    });
  }

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
    branchId = user.branchId || 'BR01',
    initialStock = 0,
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
      userId: user.id,
      userName: user.nameAr,
      userRole: user.role,
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
      user.id,
      user.nameAr,
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
      user.id,
      user.nameAr,
      'تهيئة رصيد صفر'
    );
  }

  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
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
apiRouter.get('/shifts', authenticateJWT, requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let shifts = db.getShifts();

  // Cashiers only see their own shifts
  if (user.role === 'Cashier') {
    shifts = shifts.filter((s) => s.cashierId === user.id && s.branchId === user.branchId);
  } else if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    shifts = shifts.filter((s) => s.branchId === user.branchId);
  } else {
    let { branchId } = req.query as { branchId?: string };
    if (branchId && branchId !== 'all') {
      shifts = shifts.filter((s) => s.branchId === branchId);
    }
  }

  res.json(shifts);
});

apiRouter.get('/shifts/current', authenticateJWT, requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { cashierId, branchId } = req.query as { cashierId?: string; branchId?: string };
  const isSupervisor = user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Branch Manager';
  if (!isSupervisor) {
    cashierId = user.id;
    branchId = user.branchId;
  }
  const shifts = db.getShifts();
  const current = shifts.find(
    (s) => s.status === 'open' && (!cashierId || s.cashierId === cashierId) && (!branchId || s.branchId === branchId)
  );

  res.json({ hasOpenShift: !!current, shift: current || null });
});

apiRouter.post('/shifts/open', authenticateJWT, requirePermission('SHIFT_OPEN'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const cashierId = user.id;
  const cashierName = user.nameAr;
  const branchId = req.body.branchId || user.branchId || 'BR01';
  const { branchName, registerId, registerName, openingCash } = req.body;

  // Check if cashier already has an open shift
  const existing = db.getShifts().find((s) => s.cashierId === cashierId && s.status === 'open');
  if (existing) {
    return res.status(400).json({
      success: false,
      messageAr: 'لديك وردية مفتوحة بالفعل، يرجى إغلاقها أولاً قبل فتح وردية جديدة',
      messageEn: 'You already have an open shift',
      error: {
        code: 'SHIFT_ALREADY_OPEN',
        message: 'You already have an open shift',
        messageAr: 'لديك وردية مفتوحة بالفعل، يرجى إغلاقها أولاً قبل فتح وردية جديدة',
      },
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
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'SHIFT_OPENED',
    module: 'Shifts',
    recordId: newShift.id,
    branchId,
    details: `فتح وردية جديدة رقم ${shiftNumber} بعهدة نقدية ${openingCash} ج.م`,
  });

  db.save();
  res.status(201).json(newShift);
});

apiRouter.post('/shifts/close', authenticateJWT, requirePermission('SHIFT_CLOSE'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const { shiftId, actualCash, notes } = req.body;
  const shifts = db.getShifts();
  const shift = shifts.find((s) => s.id === shiftId);

  if (!shift) {
    return res.status(404).json({
      success: false,
      messageAr: 'الوردية غير موجودة',
      messageEn: 'Shift not found',
      error: {
        code: 'SHIFT_NOT_FOUND',
        message: 'Shift not found',
        messageAr: 'الوردية غير موجودة',
      },
    });
  }

  if (shift.status === 'closed') {
    return res.status(400).json({
      success: false,
      messageAr: 'الوردية مغلقة بالفعل',
      messageEn: 'Shift already closed',
      error: {
        code: 'SHIFT_ALREADY_CLOSED',
        message: 'Shift already closed',
        messageAr: 'الوردية مغلقة بالفعل',
      },
    });
  }

  // Branch access on shift
  if (!hasBranchAccess(user, shift.branchId)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: `Cannot close shift from branch ${shift.branchId}`,
        messageAr: 'لا يمكنك إغلاق وردية تابعة لفرع آخر',
      },
    });
  }

  // Cashier ownership check: cashier must own shift unless supervisor
  const isSupervisor = user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Branch Manager';
  if (!isSupervisor && shift.cashierId !== user.id) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SHIFT_NOT_OWNED',
        message: 'You can only close your own shift',
        messageAr: 'لا يمكنك إغلاق وردية كاشير آخر بدون صلاحية إشرافية',
      },
    });
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
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'SHIFT_CLOSED',
    module: 'Shifts',
    recordId: shift.id,
    branchId: shift.branchId,
    details: `إغلاق الوردية ${shift.shiftNumber}: المتوقع ${expected} ج.م، الفعلي ${actual} ج.م، الفارق ${difference} ج.م`,
  });

  db.save();
  res.json(shift);
});

// --- Checkout (Atomic Sales Transaction & Central Calculation) ---
apiRouter.post(
  '/sales/checkout',
  authenticateJWT,
  requirePermission('POS_SELL'),
  requireBranchAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      const rawItems = (req.body.items || []).map((it: any) => ({
        productId: it.productId || (it.product && it.product.id),
        quantity: Number(it.quantity),
        discount: Number(it.discount) || 0,
      }));

      const invoice = await processCheckout(user, {
        clientOperationId: req.body.clientOperationId || (req.headers['x-idempotency-key'] as string),
        branchId: req.body.branchId || user.branchId,
        shiftId: req.body.shiftId,
        customerId: req.body.customerId,
        items: rawItems,
        payments:
          Array.isArray(req.body.payments) && req.body.payments.length > 0
            ? req.body.payments
            : req.body.paymentMethod
            ? [{ method: req.body.paymentMethod, amount: Number(req.body.paidAmount) || 0 }]
            : [],
        discountType: req.body.discountType,
        discountValue: req.body.discountValue,
        notes: req.body.notes,
      });

      res.status(201).json({
        success: true,
        invoice,
        data: invoice,
        ...invoice,
      });
    } catch (err) {
      next(err);
    }
  }
);

// --- Sales List & Details ---
apiRouter.get(
  '/sales',
  authenticateJWT,
  requirePermission('SALE_VIEW'),
  requireBranchAccess,
  (req: Request, res: Response) => {
    const user = req.user!;
    let { branchId, status, date, search } = req.query as {
      branchId?: string;
      status?: string;
      date?: string;
      search?: string;
    };

    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      branchId = user.branchId;
    }

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
  }
);

apiRouter.get(
  '/sales/:id',
  authenticateJWT,
  requirePermission('SALE_VIEW'),
  (req: Request, res: Response) => {
    const user = req.user!;
    const invoice = db.getSales().find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
    if (!invoice) {
      return res.status(404).json({ messageAr: 'الفاتورة غير موجودة', messageEn: 'Invoice not found' });
    }

    if (!hasBranchAccess(user, invoice.branchId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BRANCH_ACCESS_DENIED',
          message: 'Cannot access invoice belonging to another branch',
          messageAr: 'لا يمكنك استعراض فاتورة تابعة لفرع آخر',
        },
      });
    }

    res.json(invoice);
  }
);

// Reprint Receipt (with audit logging)
apiRouter.post(
  '/sales/:id/reprint',
  authenticateJWT,
  requirePermission('RECEIPT_REPRINT'),
  requireBranchAccess,
  (req: Request, res: Response) => {
  const user = req.user!;
  const invoice = db.getSales().find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  if (!hasBranchAccess(user, invoice.branchId)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: 'Cannot reprint invoice from another branch',
        messageAr: 'لا يمكنك طباعة فاتورة تابعة لفرع آخر',
      },
    });
  }

  invoice.reprintCount = (invoice.reprintCount || 0) + 1;

  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
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
apiRouter.post(
  '/sales/:id/cancel',
  authenticateJWT,
  requirePermission('SALE_CANCEL'),
  requireBranchAccess,
  (req: Request, res: Response) => {
  const user = req.user!;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      success: false,
      messageAr: 'سبب إلغاء الفاتورة إلزامي ومطلوب',
      messageEn: 'Cancellation reason is required',
      error: {
        code: 'REASON_REQUIRED',
        message: 'Cancellation reason is required',
        messageAr: 'سبب إلغاء الفاتورة إلزامي ومطلوب',
      },
    });
  }

  const invoice = db.getSales().find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found' });
  }

  if (!hasBranchAccess(user, invoice.branchId)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: 'Cannot cancel invoice from another branch',
        messageAr: 'لا يمكنك إلغاء فاتورة تابعة لفرع آخر',
      },
    });
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
        user.id,
        user.nameAr,
        `إرجاع مخزون نتيجة إلغاء الفاتورة ${invoice.invoiceNumber}`
      );
    }
  }

  invoice.status = 'Cancelled';
  invoice.cancelReason = reason.trim();
  invoice.cancelledBy = user.nameAr;
  invoice.cancelledAt = new Date().toISOString();

  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
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
apiRouter.post('/returns', authenticateJWT, requirePermission('SALE_RETURN'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const {
    invoiceNumber,
    originalInvoiceNumber,
    originalInvoiceId,
    items,
    refundMethod = 'cash',
    reason = '',
    shiftId,
  } = req.body;

  const targetRef = invoiceNumber || originalInvoiceNumber || originalInvoiceId;
  const invoice = db.getSales().find(
    (s) => s.invoiceNumber === targetRef || s.id === targetRef || s.id === originalInvoiceId || s.invoiceNumber === originalInvoiceNumber
  );

  if (!invoice) {
    return res.status(404).json({ messageAr: 'الفاتورة الأصلية غير موجودة', messageEn: 'Original invoice not found' });
  }

  if (!hasBranchAccess(user, invoice.branchId)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: 'Cannot process return for invoice from another branch',
        messageAr: 'لا يمكنك إرجاع فاتورة تابعة لفرع آخر',
      },
    });
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
        user.id,
        user.nameAr,
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
    cashierId: user.id,
    cashierName: user.nameAr,
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
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'RETURN_CREATED',
    module: 'Returns',
    recordId: saleReturn.id,
    branchId: invoice.branchId,
    details: `إنشاء مرتجع مبيعات ${returnNumber} للفاتورة ${invoice.invoiceNumber} بقيمة ${totalRefund} ج.م`,
  });

  db.save();
  res.status(201).json({ success: true, return: saleReturn, returnInvoice: saleReturn });
});

// --- Inventory Ledger & Adjustments ---
apiRouter.get('/inventory/movements', authenticateJWT, requirePermission('INVENTORY_VIEW'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId, productId, type } = req.query as {
    branchId?: string;
    productId?: string;
    type?: string;
  };

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }

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

apiRouter.get('/inventory/transactions', authenticateJWT, requirePermission('INVENTORY_VIEW'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId, productId, type } = req.query as {
    branchId?: string;
    productId?: string;
    type?: string;
  };

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }

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

apiRouter.post('/inventory/adjust', authenticateJWT, requirePermission('INVENTORY_ADJUST'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const { productId, branchId = user.branchId, reason } = req.body;
  const rawQuantity = req.body.actualQuantity ?? req.body.actualStock;

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      success: false,
      messageAr: 'سبب التسوية الجردية إلزامي ومطلوب',
      messageEn: 'Adjustment reason is required',
      error: {
        code: 'REASON_REQUIRED',
        message: 'Adjustment reason is required',
        messageAr: 'سبب التسوية الجردية إلزامي ومطلوب',
      },
    });
  }

  if (!productId || !branchId || rawQuantity === undefined || rawQuantity === null) {
    return res.status(400).json({
      success: false,
      messageAr: 'المنتج والفرع والكمية الفعلية مطلوبة',
      messageEn: 'Product, branch and actual quantity are required',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Product, branch and actual quantity are required',
        messageAr: 'المنتج والفرع والكمية الفعلية مطلوبة',
      },
    });
  }

  const actualQuantity = Number(rawQuantity);
  if (isNaN(actualQuantity) || actualQuantity < 0) {
    return res.status(400).json({
      success: false,
      messageAr: 'الكمية الفعلية يجب أن تكون رقماً موجباً أو صفراً',
      messageEn: 'Actual quantity must be a non-negative number',
      error: {
        code: 'INVALID_QUANTITY',
        message: 'Actual quantity must be a non-negative number',
        messageAr: 'الكمية الفعلية يجب أن تكون رقماً موجباً أو صفراً',
      },
    });
  }

  const currentStock = db.getProductStock(productId, branchId);
  const diff = actualQuantity - currentStock;

  db.setProductStock(
    productId,
    branchId,
    actualQuantity,
    'Stock Adjustment',
    'Adjustment',
    `ADJ-${Date.now().toString().slice(-6)}`,
    user.id,
    user.nameAr,
    `تسوية جردية: الفرق ${diff > 0 ? '+' : ''}${diff}. السبب: ${reason.trim()}`
  );

  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'STOCK_ADJUSTED',
    module: 'Inventory',
    recordId: productId,
    branchId,
    details: `تسوية جردية للمنتج. الرصيد السابق: ${currentStock}، الرصيد الجديد: ${actualQuantity}. السبب: ${reason.trim()}`,
  });

  res.json({ success: true, newStock: actualQuantity });
});

// --- Expenses ---
apiRouter.get('/expenses', authenticateJWT, requirePermission('EXPENSE_VIEW'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId } = req.query as { branchId?: string };
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }
  let expenses = db.getExpenses();
  if (branchId && branchId !== 'all') {
    expenses = expenses.filter((e) => e.branchId === branchId);
  }
  res.json(expenses);
});

apiRouter.post('/expenses', authenticateJWT, requirePermission('EXPENSE_CREATE'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  const { category, amount, description, branchId, shiftId } = req.body;

  if (!category || !amount || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      messageAr: 'المبلغ والتصنيف مطلوبان وموجبان',
      messageEn: 'Valid amount and category required',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Valid amount and category required',
        messageAr: 'المبلغ والتصنيف مطلوبان وموجبان',
      },
    });
  }

  const effectiveBranchId = branchId || user.branchId || 'BR01';

  const exp: Expense = {
    id: `exp_${Date.now()}`,
    expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
    branchId: effectiveBranchId,
    shiftId,
    category,
    amount: Number(amount),
    description: description || '',
    userId: user.id,
    userName: user.nameAr,
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
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
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
apiRouter.get('/customers', authenticateJWT, requirePermission('CUSTOMER_VIEW'), (req: Request, res: Response) => {
  res.json(db.getCustomers());
});

apiRouter.post('/customers', authenticateJWT, requirePermission('CUSTOMER_CREATE'), (req: Request, res: Response) => {
  const { name, phone, email, address } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      messageAr: 'اسم العميل مطلوب',
      messageEn: 'Customer name is required',
    });
  }
  const newCust = {
    id: `cust_${Date.now()}`,
    code: `CUST-${(db.getCustomers().length + 1).toString().padStart(3, '0')}`,
    name: name.trim(),
    phone: phone || '',
    email: email || '',
    address: address || '',
    balance: 0,
    points: 0,
    status: 'active' as const,
  };
  db.getCustomers().push(newCust);
  db.save();
  res.status(201).json(newCust);
});

apiRouter.get('/suppliers', authenticateJWT, requirePermission('SUPPLIER_VIEW'), (req: Request, res: Response) => {
  res.json(db.getSuppliers());
});

apiRouter.post('/suppliers', authenticateJWT, requirePermission('SUPPLIER_CREATE'), (req: Request, res: Response) => {
  const { name, phone, email, address, companyName } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      messageAr: 'اسم المورد مطلوب',
      messageEn: 'Supplier name is required',
    });
  }
  const newSupp = {
    id: `supp_${Date.now()}`,
    code: `SUPP-${(db.getSuppliers().length + 1).toString().padStart(3, '0')}`,
    name: name.trim(),
    companyName: companyName || name.trim(),
    phone: phone || '',
    email: email || '',
    address: address || '',
    balance: 0,
    status: 'active' as const,
  };
  db.getSuppliers().push(newSupp);
  db.save();
  res.status(201).json(newSupp);
});

// --- Dashboard Stats & Reports ---
apiRouter.get('/reports/daily', authenticateJWT, requirePermission('REPORT_VIEW'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId = 'BR01' } = req.query as { branchId?: string };

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }

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

apiRouter.get('/dashboard/stats', authenticateJWT, requirePermission('REPORT_VIEW'), requireBranchAccess, (req: Request, res: Response) => {
  const user = req.user!;
  let { branchId = 'BR01' } = req.query as { branchId?: string };

  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    branchId = user.branchId;
  }

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
apiRouter.get('/audit-logs', authenticateJWT, requirePermission('AUDIT_VIEW'), (req: Request, res: Response) => {
  const user = req.user!;
  const { module, action, search } = req.query as { module?: string; action?: string; search?: string };
  let logs = db.getAuditLogs();

  // Branch Manager only sees audit logs from their own branch
  if (user.role !== 'Super Admin' && user.role !== 'Admin') {
    logs = logs.filter((l) => l.branchId === user.branchId);
  }

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

// --- Users (RBAC Protected) ---
apiRouter.get('/users', authenticateJWT, requirePermission('USER_MANAGE'), (req: Request, res: Response) => {
  res.json(db.getUsers());
});

// --- Public Settings (No Auth required for initial branding, tax rates, languages) ---
apiRouter.get('/public/settings', (req: Request, res: Response) => {
  const s = db.getSettings();
  res.json({
    storeNameAr: s.storeNameAr,
    storeNameEn: s.storeNameEn,
    taxNumber: s.taxNumber,
    commercialRecord: s.commercialRecord,
    phone: s.phone,
    addressAr: s.addressAr,
    addressEn: s.addressEn,
    currency: s.currency,
    currencySymbolAr: s.currencySymbolAr,
    currencySymbolEn: s.currencySymbolEn,
    defaultLanguage: s.defaultLanguage,
    taxEnabled: s.taxEnabled,
    defaultTaxRate: s.defaultTaxRate,
    taxInclusive: s.taxInclusive,
    allowNegativeStock: s.allowNegativeStock,
    receiptPaperWidth: s.receiptPaperWidth,
    receiptHeaderMessageAr: s.receiptHeaderMessageAr,
    receiptHeaderMessageEn: s.receiptHeaderMessageEn,
    receiptFooterMessageAr: s.receiptFooterMessageAr,
    receiptFooterMessageEn: s.receiptFooterMessageEn,
    autoPrintReceipt: s.autoPrintReceipt,
  });
});

// --- Settings ---
apiRouter.get('/settings', authenticateJWT, requirePermission('SETTINGS_VIEW'), (req: Request, res: Response) => {
  res.json(db.getSettings());
});

apiRouter.put('/settings', authenticateJWT, requirePermission('SETTINGS_EDIT'), (req: Request, res: Response) => {
  const user = req.user!;
  const updated = db.updateSettings(req.body);
  db.logAudit({
    userId: user.id,
    userName: user.nameAr,
    userRole: user.role,
    action: 'SETTINGS_UPDATED',
    module: 'Settings',
    recordId: 'SETTINGS',
    branchId: user.branchId,
    details: 'تحديث إعدادات النظام العامة وتنسيق الإيصال والضرائب',
  });
  res.json(updated);
});
