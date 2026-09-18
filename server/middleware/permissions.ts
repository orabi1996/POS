import { Request, Response, NextFunction } from 'express';
import { UserRole, User } from '../../src/types/index.ts';
import { db } from '../db.ts';

export type Permission =
  | 'POS_SELL'
  | 'POS_DISCOUNT'
  | 'POS_OVERRIDE_DISCOUNT'
  | 'SALE_VIEW'
  | 'SALE_CANCEL'
  | 'SALE_RETURN'
  | 'RECEIPT_REPRINT'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_EDIT'
  | 'CATEGORY_MANAGE'
  | 'INVENTORY_VIEW'
  | 'INVENTORY_ADJUST'
  | 'SHIFT_OPEN'
  | 'SHIFT_CLOSE'
  | 'EXPENSE_VIEW'
  | 'EXPENSE_CREATE'
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_CREATE'
  | 'SUPPLIER_VIEW'
  | 'SUPPLIER_CREATE'
  | 'REPORT_VIEW'
  | 'SETTINGS_VIEW'
  | 'SETTINGS_EDIT'
  | 'AUDIT_VIEW'
  | 'USER_MANAGE';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Super Admin': [
    'POS_SELL',
    'POS_DISCOUNT',
    'POS_OVERRIDE_DISCOUNT',
    'SALE_VIEW',
    'SALE_CANCEL',
    'SALE_RETURN',
    'RECEIPT_REPRINT',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'CATEGORY_MANAGE',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
    'EXPENSE_VIEW',
    'EXPENSE_CREATE',
    'CUSTOMER_VIEW',
    'CUSTOMER_CREATE',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
    'REPORT_VIEW',
    'SETTINGS_VIEW',
    'SETTINGS_EDIT',
    'AUDIT_VIEW',
    'USER_MANAGE',
  ],
  'Admin': [
    'POS_SELL',
    'POS_DISCOUNT',
    'POS_OVERRIDE_DISCOUNT',
    'SALE_VIEW',
    'SALE_CANCEL',
    'SALE_RETURN',
    'RECEIPT_REPRINT',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'CATEGORY_MANAGE',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
    'EXPENSE_VIEW',
    'EXPENSE_CREATE',
    'CUSTOMER_VIEW',
    'CUSTOMER_CREATE',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
    'REPORT_VIEW',
    'SETTINGS_VIEW',
    'SETTINGS_EDIT',
    'AUDIT_VIEW',
    'USER_MANAGE',
  ],
  'Branch Manager': [
    'POS_SELL',
    'POS_DISCOUNT',
    'POS_OVERRIDE_DISCOUNT',
    'SALE_VIEW',
    'SALE_CANCEL',
    'SALE_RETURN',
    'RECEIPT_REPRINT',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'CATEGORY_MANAGE',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
    'EXPENSE_VIEW',
    'EXPENSE_CREATE',
    'CUSTOMER_VIEW',
    'CUSTOMER_CREATE',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
    'REPORT_VIEW',
    'SETTINGS_VIEW',
    'AUDIT_VIEW',
  ],
  'Cashier': [
    'POS_SELL',
    'POS_DISCOUNT',
    'SALE_VIEW',
    'SALE_RETURN',
    'RECEIPT_REPRINT',
    'PRODUCT_VIEW',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
    'CUSTOMER_VIEW',
    'CUSTOMER_CREATE',
  ],
  'Inventory Officer': [
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'CATEGORY_MANAGE',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
  ],
  'Purchasing Officer': [
    'PRODUCT_VIEW',
    'INVENTORY_VIEW',
    'REPORT_VIEW',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
  ],
  'Accountant': [
    'SALE_VIEW',
    'REPORT_VIEW',
    'AUDIT_VIEW',
    'SETTINGS_VIEW',
    'PRODUCT_VIEW',
    'INVENTORY_VIEW',
    'EXPENSE_VIEW',
    'EXPENSE_CREATE',
    'CUSTOMER_VIEW',
    'SUPPLIER_VIEW',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(permission);
}

export function hasBranchAccess(user: User, branchId: string): boolean {
  if (user.role === 'Super Admin' || user.role === 'Admin') return true;
  return user.branchId === branchId;
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          messageAr: 'يجب تسجيل الدخول أولاً للمتابعة',
        },
      });
    }

    const role = user.role as UserRole;
    const hasAll = permissions.every((p) => hasPermission(role, p));

    if (!hasAll) {
      try {
        db.logAudit({
          userId: user.id,
          userName: user.nameAr,
          userRole: user.role,
          action: 'PERMISSION_DENIED',
          module: 'Security',
          recordId: permissions.join(','),
          branchId: user.branchId,
          details: `تم رفض الوصول: المستخدم يحتاج صلاحية (${permissions.join(', ')}) للمسار [${req.method}] ${req.originalUrl || req.baseUrl + req.path}`,
        });
      } catch (auditErr) {
        console.error('Failed to log denied audit:', auditErr);
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Access denied. Required permission(s): ${permissions.join(', ')}`,
          messageAr: 'عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء',
        },
      });
    }

    next();
  };
}

export function requireBranchAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        messageAr: 'يجب تسجيل الدخول أولاً للمتابعة',
      },
    });
  }

  // Super Admin and Admin can access any branch
  if (user.role === 'Super Admin' || user.role === 'Admin') {
    return next();
  }

  const branchId = (req.body && req.body.branchId) || (req.query && req.query.branchId) || (req.params && req.params.branchId);

  if (branchId === 'all') {
    try {
      db.logAudit({
        userId: user.id,
        userName: user.nameAr,
        userRole: user.role,
        action: 'BRANCH_ACCESS_DENIED',
        module: 'Security',
        recordId: 'all',
        branchId: user.branchId,
        details: `محاولة وصول غير مصرح بها لبيانات جميع الفروع للمسار [${req.method}] ${req.originalUrl || req.baseUrl + req.path}`,
      });
    } catch {}

    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: 'Accessing multi-branch aggregate data is restricted to system administrators',
        messageAr: 'الوصول لبيانات كافة الفروع مقتصر على مسؤولي النظام فقط',
      },
    });
  }

  if (branchId && branchId !== user.branchId) {
    try {
      db.logAudit({
        userId: user.id,
        userName: user.nameAr,
        userRole: user.role,
        action: 'BRANCH_ACCESS_DENIED',
        module: 'Security',
        recordId: String(branchId),
        branchId: user.branchId,
        details: `محاولة وصول غير مصرح بها لبيانات فرع آخر (${branchId}) للمسار [${req.method}] ${req.originalUrl || req.baseUrl + req.path}`,
      });
    } catch {}

    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: `Cannot access data outside your assigned branch (${user.branchId})`,
        messageAr: 'لا يمكنك الوصول لبيانات خارج نطاق فرعك المخصص',
      },
    });
  }

  // Force scope to user's assigned branch
  if (req.query && typeof req.query === 'object') {
    (req.query as any).branchId = user.branchId;
  }
  if (req.body && typeof req.body === 'object' && req.body.branchId !== undefined) {
    req.body.branchId = user.branchId;
  }

  next();
}
