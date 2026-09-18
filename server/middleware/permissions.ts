import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../src/types/index.ts';

export type Permission =
  | 'POS_SELL'
  | 'POS_DISCOUNT'
  | 'POS_OVERRIDE_DISCOUNT'
  | 'SALE_CANCEL'
  | 'SALE_RETURN'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_EDIT'
  | 'INVENTORY_VIEW'
  | 'INVENTORY_ADJUST'
  | 'SHIFT_OPEN'
  | 'SHIFT_CLOSE'
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
    'SALE_CANCEL',
    'SALE_RETURN',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
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
    'SALE_CANCEL',
    'SALE_RETURN',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
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
    'SALE_CANCEL',
    'SALE_RETURN',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
    'REPORT_VIEW',
    'SETTINGS_VIEW',
    'AUDIT_VIEW',
  ],
  'Cashier': [
    'POS_SELL',
    'POS_DISCOUNT',
    'SALE_RETURN',
    'PRODUCT_VIEW',
    'SHIFT_OPEN',
    'SHIFT_CLOSE',
  ],
  'Inventory Officer': [
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_EDIT',
    'INVENTORY_VIEW',
    'INVENTORY_ADJUST',
  ],
  'Purchasing Officer': [
    'PRODUCT_VIEW',
    'INVENTORY_VIEW',
    'REPORT_VIEW',
  ],
  'Accountant': [
    'REPORT_VIEW',
    'AUDIT_VIEW',
    'SETTINGS_VIEW',
    'PRODUCT_VIEW',
    'INVENTORY_VIEW',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(permission);
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
        messageAr: 'يجب تسجيل الدخول أولاً',
      },
    });
  }

  // Super Admin and Admin can access any branch
  if (user.role === 'Super Admin' || user.role === 'Admin') {
    return next();
  }

  const branchId = (req.body && req.body.branchId) || (req.query && req.query.branchId) || (req.params && req.params.branchId);
  if (branchId && branchId !== 'all' && branchId !== user.branchId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BRANCH_ACCESS_DENIED',
        message: `Cannot access data outside your assigned branch (${user.branchId})`,
        messageAr: 'لا يمكنك الوصول لبيانات خارج نطاق فرعك المخصص',
      },
    });
  }

  next();
}
