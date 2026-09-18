export type UserRole = 
  | 'Super Admin'
  | 'Admin'
  | 'Branch Manager'
  | 'Cashier'
  | 'Inventory Officer'
  | 'Purchasing Officer'
  | 'Accountant';

export interface User {
  id: string;
  username: string;
  nameAr: string;
  nameEn: string;
  role: UserRole;
  branchId: string;
  status: 'active' | 'inactive';
  email: string;
  avatar?: string;
  maxDiscountPercent?: number; // Cashier = 5, Manager = 20, Admin = 100
}

export interface Branch {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Register {
  id: string;
  code: string;
  name: string;
  branchId: string;
  printerSettings: {
    paperWidth: '58mm' | '80mm';
    autoPrint: boolean;
  };
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentCategoryId?: string | null;
  status: 'active' | 'inactive';
  color?: string;
  icon?: string;
}

export interface Product {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  barcode: string; // Primary barcode
  additionalBarcodes?: string[]; // Additional barcodes
  qrCodeValue?: string;
  categoryId: string;
  brand?: string;
  unit: string; // 'حبة' | 'كجم' | 'علبة' | 'كرتونة' | 'قطعة'
  purchasePrice: number; // Cost
  sellingPrice: number;
  taxRate: number; // e.g. 14 for Egypt VAT
  minStock: number;
  maxStock?: number;
  trackStock: boolean;
  trackExpiry: boolean;
  description?: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  // Dynamic per branch when loaded
  stock?: number;
}

export interface InventoryBalance {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  lastUpdated: string;
}

export type InventoryTransactionType =
  | 'Opening Balance'
  | 'Purchase'
  | 'Sale'
  | 'Sales Return'
  | 'Purchase Return'
  | 'Stock Adjustment'
  | 'Damage'
  | 'Expired'
  | 'Transfer In'
  | 'Transfer Out';

export interface InventoryTransaction {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  branchId: string;
  branchName?: string;
  transactionType: InventoryTransactionType;
  quantity: number; // positive or negative
  quantityBefore: number;
  quantityAfter: number;
  referenceType: 'Sale' | 'Return' | 'Adjustment' | 'Purchase' | 'Initial';
  referenceId: string;
  userId: string;
  userName: string;
  date: string;
  notes?: string;
  // Aliases for convenience
  type?: string;
  quantityChange?: number;
  stockAfter?: number;
  referenceNumber?: string;
  reason?: string;
  timestamp?: string;
}

export type InventoryMovement = InventoryTransaction;

export interface Shift {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  branchName: string;
  registerId: string;
  registerName: string;
  openingCash: number;
  openingTime: string;
  closingTime?: string;
  startTime?: string;
  endTime?: string;
  status: 'open' | 'closed';
  salesCount: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  returnsAmount: number;
  expensesAmount: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  discount: number; // amount
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  costPrice: number; // snapshot cost at sale time for accurate COGS
}

export interface SalePayment {
  method: 'cash' | 'card' | 'wallet' | 'bank_transfer';
  amount: number;
  reference?: string;
}

export type SaleStatus =
  | 'Completed'
  | 'Held'
  | 'Cancelled'
  | 'Refunded'
  | 'Partially Refunded'
  | 'completed'
  | 'returned'
  | 'cancelled';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string; // e.g. BR01-20260918-000123
  branchId: string;
  branchNameAr: string;
  branchNameEn: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  customerId?: string;
  customerName?: string;
  date: string;
  time: string;
  items: Array<{
    productId: string;
    productNameAr: string;
    productNameEn: string;
    barcode: string;
    unit: string;
    price: number;
    costPrice: number;
    quantity: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    refundedQuantity?: number;
  }>;
  subtotal: number;
  discount: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  tax: number;
  total: number;
  totalCost: number; // for Profit/Loss
  grossProfit: number;
  payments: SalePayment[];
  amountPaid: number;
  change: number;
  status: SaleStatus;
  notes?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  reprintCount: number;
}

export interface SaleReturnItem {
  productId: string;
  productNameAr: string;
  quantity: number;
  price: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  restock: boolean;
}

export interface SaleReturn {
  id: string;
  returnNumber: string; // e.g. RET-20260918-000045
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  date: string;
  items: SaleReturnItem[];
  subtotal: number;
  taxAmount: number;
  totalRefund: number;
  refundMethod: 'cash' | 'card' | 'wallet' | 'store_credit';
  reason: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number;
  points: number;
  status: 'active' | 'inactive';
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  balance: number;
  status: 'active' | 'inactive';
}

export interface Expense {
  id: string;
  expenseNumber: string;
  branchId: string;
  shiftId?: string;
  category: string;
  amount: number;
  source?: 'register' | 'safe';
  description: string;
  userId: string;
  userName: string;
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entity?: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  branchId: string;
  branchName?: string;
  details: string;
}

export interface SystemSettings {
  storeNameAr: string;
  storeNameEn: string;
  taxNumber: string;
  commercialRecord?: string;
  phone: string;
  addressAr: string;
  addressEn: string;
  currency: string;
  currencySymbolAr: string;
  currencySymbolEn: string;
  defaultLanguage: 'ar' | 'en';
  taxEnabled: boolean;
  defaultTaxRate: number;
  taxInclusive: boolean; // whether selling prices include tax
  allowNegativeStock?: boolean;
  receiptPaperWidth: '58mm' | '80mm';
  receiptHeaderMessageAr: string;
  receiptHeaderMessageEn: string;
  receiptFooterMessageAr: string;
  receiptFooterMessageEn: string;
  autoPrintReceipt?: boolean;
  maxCashierDiscountPercent: number;
  maxManagerDiscountPercent: number;
  shortcuts: {
    productSearch: string;
    quantity: string;
    discount: string;
    holdSale: string;
    recallSale: string;
    payment: string;
    quickCash: string;
    closeModal: string;
  };
}

export type StoreSettings = Partial<SystemSettings> & {
  storeNameAr: string;
  storeNameEn: string;
  taxNumber: string;
  commercialRecord?: string;
  phone: string;
  addressAr: string;
  addressEn?: string;
  currency: string;
  currencySymbolAr?: string;
  currencySymbolEn?: string;
  taxEnabled: boolean;
  defaultTaxRate: number;
  taxInclusive: boolean;
  allowNegativeStock?: boolean;
  receiptPaperWidth: '58mm' | '80mm';
  receiptFooterMessageAr: string;
  receiptFooterMessageEn?: string;
  autoPrintReceipt?: boolean;
};
