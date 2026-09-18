import { db } from '../db.ts';
import { User, SaleInvoice, SalePayment, Shift } from '../../src/types/index.ts';
import { calculateSale, RawCheckoutItem } from './saleCalculator.ts';
import { roundMoney } from '../utils/money.ts';
import { getBusinessDateTime, DEFAULT_TIMEZONE } from '../utils/businessDate.ts';
import { AppError } from '../middleware/errorHandler.ts';
import { hasPermission } from '../middleware/permissions.ts';

export interface CheckoutInput {
  clientOperationId?: string;
  branchId: string;
  shiftId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    discount?: number;
  }>;
  payments: SalePayment[];
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  notes?: string;
}

export async function processCheckout(
  user: User,
  input: CheckoutInput
): Promise<SaleInvoice> {
  // 1. Check Idempotency
  if (input.clientOperationId) {
    const existingResult = db.getProcessedOperation(input.clientOperationId);
    if (existingResult) {
      return existingResult as SaleInvoice;
    }
  }

  // 2. Concurrency Lock: ensures sequential execution of sales across cashiers
  return await db.runWithLock(async () => {
    // Check idempotency again inside lock in case duplicate request arrived concurrently
    if (input.clientOperationId) {
      const existing = db.getProcessedOperation(input.clientOperationId);
      if (existing) return existing as SaleInvoice;
    }

    const { branchId, shiftId, customerId, items: rawItems, notes } = input;
    let payments = input.payments;
    if ((!payments || payments.length === 0) && (input as any).paymentMethod) {
      payments = [
        {
          method: (input as any).paymentMethod,
          amount: Number((input as any).paidAmount) || 0,
        },
      ];
    }
    const settings = db.getSettings();

    // 3. Basic Validation
    if (!branchId) {
      throw new AppError({
        statusCode: 400,
        code: 'BRANCH_REQUIRED',
        message: 'Branch ID is required',
        messageAr: 'محدد الفرع مطلوب',
      });
    }

    const branch = db.getBranches().find((b) => b.id === branchId);
    if (!branch || branch.status !== 'active') {
      throw new AppError({
        statusCode: 400,
        code: 'INVALID_BRANCH',
        message: 'Branch is invalid or inactive',
        messageAr: 'الفرع المحدد غير موجود أو غير نشط',
      });
    }

    // Branch access check for non-admins
    if (user.role !== 'Super Admin' && user.role !== 'Admin' && user.branchId !== branchId) {
      throw new AppError({
        statusCode: 403,
        code: 'BRANCH_ACCESS_DENIED',
        message: `You do not have access to branch ${branchId}`,
        messageAr: 'ليس لديك صلاحية لإجراء عمليات على هذا الفرع',
      });
    }

    // 4. Shift Validation
    const shift = db.getShifts().find((s) => s.id === shiftId);
    if (!shift) {
      throw new AppError({
        statusCode: 400,
        code: 'SHIFT_NOT_FOUND',
        message: 'Shift not found',
        messageAr: 'الوردية غير موجودة',
      });
    }

    if (shift.status !== 'open') {
      throw new AppError({
        statusCode: 400,
        code: 'SHIFT_CLOSED',
        message: 'Shift is closed. Please open a shift before checkout',
        messageAr: 'الوردية مغلقة، يرجى فتح وردية جديدة لإتمام البيع',
      });
    }

    if (shift.branchId !== branchId) {
      throw new AppError({
        statusCode: 400,
        code: 'SHIFT_BRANCH_MISMATCH',
        message: 'Shift does not belong to the selected branch',
        messageAr: 'الوردية لا تنتمي لنفس الفرع المحدد',
      });
    }

    // Cashier ownership check: cashier must own the shift, unless manager/admin
    const isSupervisor = user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Branch Manager';
    if (!isSupervisor && shift.cashierId !== user.id) {
      throw new AppError({
        statusCode: 403,
        code: 'SHIFT_NOT_OWNED',
        message: 'You can only record sales on your own open shift',
        messageAr: 'لا يمكنك البيع على وردية كاشير آخر بدون صلاحية إشرافية',
      });
    }

    // 5. Items Validation
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new AppError({
        statusCode: 400,
        code: 'CART_EMPTY',
        message: 'Cart items cannot be empty',
        messageAr: 'سلة المشتريات فارغة',
      });
    }

    const allProducts = db.getProducts();
    const productLookup = (id: string) => allProducts.find((p) => p.id === id);

    for (const item of rawItems) {
      const prod = productLookup(item.productId);
      if (!prod) {
        throw new AppError({
          statusCode: 400,
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${item.productId} not found`,
          messageAr: `المنتج رقم ${item.productId} غير موجود`,
        });
      }
      if (prod.status !== 'active') {
        throw new AppError({
          statusCode: 400,
          code: 'PRODUCT_INACTIVE',
          message: `Product ${prod.nameAr} is inactive`,
          messageAr: `المنتج ${prod.nameAr} غير نشط حالياً`,
        });
      }

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new AppError({
          statusCode: 400,
          code: 'INVALID_QUANTITY',
          message: `Invalid quantity for product ${prod.nameAr}`,
          messageAr: `كمية غير صالحة للمنتج ${prod.nameAr}`,
        });
      }

      // Stock check
      if (prod.trackStock) {
        const currentStock = db.getProductStock(prod.id, branchId);
        if (currentStock < qty && !settings.allowNegativeStock) {
          throw new AppError({
            statusCode: 400,
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${prod.nameAr}. Available: ${currentStock}, Requested: ${qty}`,
            messageAr: `الرصيد غير كافٍ للمنتج ${prod.nameAr}. المتوفر بالمخزن: ${currentStock}، المطلوب: ${qty}`,
          });
        }
      }
    }

    // 6. Central Financial Calculation (Source of Truth)
    const calculation = calculateSale({
      rawItems: rawItems as RawCheckoutItem[],
      productLookup,
      settings,
      discountType: input.discountType,
      discountValue: input.discountValue,
    });

    // 7. Discount Permissions Check
    const hasDiscount = calculation.discount > 0.001;
    if (hasDiscount) {
      if (!hasPermission(user.role, 'POS_DISCOUNT')) {
        throw new AppError({
          statusCode: 403,
          code: 'DISCOUNT_PERMISSION_DENIED',
          message: 'You do not have permission to apply discounts',
          messageAr: 'عفواً، ليس لديك صلاحية تطبيق خصومات على الفاتورة',
        });
      }

      const maxAllowedDiscountPercent = Number(
        user.maxDiscountPercent ??
        (user.role === 'Cashier'
          ? settings.maxCashierDiscountPercent
          : settings.maxManagerDiscountPercent ?? 100)
      );

      const calculatedDiscountPercent = calculation.subtotal > 0
        ? (calculation.discount / calculation.subtotal) * 100
        : 0;

      if (calculatedDiscountPercent > maxAllowedDiscountPercent + 0.001) {
        const canOverride = hasPermission(user.role, 'POS_OVERRIDE_DISCOUNT');
        if (!canOverride) {
          throw new AppError({
            statusCode: 403,
            code: 'DISCOUNT_LIMIT_EXCEEDED',
            message: `Discount of ${roundMoney(calculatedDiscountPercent)}% exceeds your maximum allowed discount of ${maxAllowedDiscountPercent}%. Supervisor authorization required.`,
            messageAr: `نسبة الخصم (${roundMoney(calculatedDiscountPercent)}%) تتجاوز الحد الأقصى المسموح لك (${maxAllowedDiscountPercent}%). يتطلب تصريح مشرف.`,
          });
        }
      }
    }

    // 8. Payments Validation
    if (!Array.isArray(payments) || payments.length === 0) {
      throw new AppError({
        statusCode: 400,
        code: 'PAYMENT_REQUIRED',
        message: 'At least one payment method is required',
        messageAr: 'يرجى تحديد طريقة دفع واحدة على الأقل',
      });
    }

    const totalPaid = roundMoney(
      payments.reduce((sum, p) => {
        const amt = Number(p.amount);
        if (!Number.isFinite(amt) || amt < 0) {
          throw new AppError({
            statusCode: 400,
            code: 'INVALID_PAYMENT_AMOUNT',
            message: 'Payment amount must be a positive number',
            messageAr: 'قيمة الدفع يجب أن تكون رقماً موجباً',
          });
        }
        return sum + amt;
      }, 0)
    );

    if (totalPaid < calculation.total - 0.01) {
      throw new AppError({
        statusCode: 400,
        code: 'INSUFFICIENT_PAYMENT',
        message: `Total paid (${totalPaid}) is less than invoice total (${calculation.total})`,
        messageAr: `المبلغ المدفوع (${totalPaid}) أقل من إجمالي الفاتورة (${calculation.total})`,
      });
    }

    const change = Math.max(0, roundMoney(totalPaid - calculation.total));

    // Customer lookup
    let customerName = 'عميل نقدي عام';
    if (customerId) {
      const cust = db.getCustomers().find((c) => c.id === customerId);
      if (cust) customerName = cust.name;
    }

    // 9. Atomic DB Execution
    const invoice = db.runTransaction<SaleInvoice>(() => {
      const { date: businessDate, time: businessTime, iso: nowIso } = getBusinessDateTime(DEFAULT_TIMEZONE);
      const invoiceNumber = db.getNextInvoiceNumber(branchId, DEFAULT_TIMEZONE);
      const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Deduct inventory and log transactions
      for (const it of calculation.items) {
        const currentStock = db.getProductStock(it.productId, branchId);
        const newStock = currentStock - it.quantity;

        db.setProductStock(
          it.productId,
          branchId,
          newStock,
          'Sale',
          'Sale',
          invoiceNumber,
          user.id,
          user.nameAr,
          `فاتورة بيع رقم ${invoiceNumber}`,
          false // do not autoSave inside transaction
        );
      }

      // Update Shift Totals
      const cashAmountPaid = payments
        .filter((p) => p.method === 'cash')
        .reduce((sum, p) => sum + p.amount, 0);
      const netCashFromSale = roundMoney(Math.max(0, cashAmountPaid - change));

      const cardAmountPaid = roundMoney(
        payments
          .filter((p) => p.method === 'card')
          .reduce((sum, p) => sum + p.amount, 0)
      );

      const walletAmountPaid = roundMoney(
        payments
          .filter((p) => p.method === 'wallet' || p.method === 'bank_transfer')
          .reduce((sum, p) => sum + p.amount, 0)
      );

      shift.salesCount += 1;
      shift.totalSales = roundMoney(shift.totalSales + calculation.total);
      shift.cashSales = roundMoney(shift.cashSales + netCashFromSale);
      shift.cardSales = roundMoney(shift.cardSales + cardAmountPaid);
      shift.walletSales = roundMoney(shift.walletSales + walletAmountPaid);
      shift.expectedCash = roundMoney(
        shift.openingCash +
        shift.cashSales +
        (shift.cashIn || 0) -
        (shift.returnsAmount || 0) -
        (shift.expensesAmount || 0) -
        (shift.cashOut || 0)
      );

      // Create Sale Invoice Record
      const newInvoice: SaleInvoice = {
        id: invoiceId,
        invoiceNumber,
        branchId,
        branchNameAr: branch.nameAr,
        branchNameEn: branch.nameEn,
        cashierId: user.id,
        cashierName: user.nameAr,
        shiftId: shift.id,
        customerId,
        customerName,
        date: businessDate,
        time: businessTime,
        items: calculation.items,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        discountType: calculation.discountType,
        discountValue: calculation.discountValue,
        tax: calculation.tax,
        total: calculation.total,
        totalCost: calculation.totalCost,
        grossProfit: calculation.grossProfit,
        payments,
        amountPaid: totalPaid,
        change,
        status: 'Completed',
        notes: notes || '',
        reprintCount: 0,
      };

      db.getSales().unshift(newInvoice);

      // Log Audit
      db.logAudit(
        {
          userId: user.id,
          userName: user.nameAr,
          userRole: user.role,
          action: 'SALE_COMPLETED',
          module: 'POS',
          recordId: invoiceNumber,
          branchId,
          details: `إتمام عملية بيع فاتورة ${invoiceNumber} بمبلغ ${calculation.total} ج.م (أرباح تقديرية: ${calculation.grossProfit} ج.م)`,
        },
        false
      );

      return newInvoice;
    });

    // Record idempotency operation result
    if (input.clientOperationId) {
      db.setProcessedOperation(input.clientOperationId, invoice);
    }

    return invoice;
  });
}
