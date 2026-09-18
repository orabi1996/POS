import { Product, SystemSettings } from '../../src/types/index.ts';
import { roundMoney } from '../utils/money.ts';

export interface RawCheckoutItem {
  productId: string;
  quantity: number;
  discount?: number; // fixed discount per line or unit
}

export interface CalculatedInvoiceItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  barcode: string;
  unit: string;
  price: number; // shelf/selling price
  costPrice: number; // server cost price
  quantity: number;
  discount: number; // total discount allocated to this line
  taxRate: number;
  taxAmount: number;
  lineTotal: number; // final line total (including tax if taxInclusive)
  netRevenue: number; // revenue excluding tax for COGS/profit computation
  lineCost: number; // costPrice * quantity
  lineProfit: number; // netRevenue - lineCost
}

export interface CalculationResult {
  items: CalculatedInvoiceItem[];
  subtotal: number;
  discount: number; // total discount (item discounts + invoice discount)
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  tax: number;
  total: number;
  totalCost: number; // COGS
  grossProfit: number;
}

export function calculateSale({
  rawItems,
  productLookup,
  settings,
  discountType = 'fixed',
  discountValue = 0,
}: {
  rawItems: RawCheckoutItem[];
  productLookup: (id: string) => Product | undefined;
  settings: SystemSettings;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
}): CalculationResult {
  const taxEnabled = settings.taxEnabled !== false;
  const isTaxInclusive = settings.taxInclusive !== false;

  // 1. Initial calculation per item with line discounts
  const preliminaryItems = rawItems.map((raw) => {
    const product = productLookup(raw.productId);
    if (!product) {
      throw new Error(`Product not found: ${raw.productId}`);
    }

    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${product.nameAr}: ${raw.quantity}`);
    }

    const price = roundMoney(product.sellingPrice);
    const costPrice = roundMoney(product.purchasePrice || 0);
    const lineDiscount = Math.max(0, roundMoney(Number(raw.discount) || 0));
    const grossLine = roundMoney(price * quantity);
    const netLineBeforeInvoiceDiscount = Math.max(0, roundMoney(grossLine - lineDiscount));

    const taxRate = taxEnabled ? Number(product.taxRate ?? settings.defaultTaxRate ?? 14) : 0;

    return {
      product,
      quantity,
      price,
      costPrice,
      lineDiscount,
      grossLine,
      netLineBeforeInvoiceDiscount,
      taxRate,
    };
  });

  const rawSubtotal = roundMoney(
    preliminaryItems.reduce((acc, item) => acc + item.grossLine, 0)
  );
  const totalLineDiscounts = roundMoney(
    preliminaryItems.reduce((acc, item) => acc + item.lineDiscount, 0)
  );
  const totalAfterLineDiscounts = Math.max(0, roundMoney(rawSubtotal - totalLineDiscounts));

  // 2. Invoice-level discount calculation
  let invoiceDiscount = 0;
  const numDiscountVal = Math.max(0, Number(discountValue) || 0);

  if (discountType === 'percentage') {
    const cappedPercent = Math.min(100, numDiscountVal);
    invoiceDiscount = roundMoney((totalAfterLineDiscounts * cappedPercent) / 100);
  } else {
    invoiceDiscount = Math.min(totalAfterLineDiscounts, roundMoney(numDiscountVal));
  }

  const totalDiscount = roundMoney(totalLineDiscounts + invoiceDiscount);

  // 3. Apportion invoice discount to items to calculate exact net revenues & taxes
  const calculatedItems: CalculatedInvoiceItem[] = preliminaryItems.map((item) => {
    let allocatedInvoiceDiscount = 0;
    if (totalAfterLineDiscounts > 0 && invoiceDiscount > 0) {
      allocatedInvoiceDiscount = roundMoney(
        (item.netLineBeforeInvoiceDiscount / totalAfterLineDiscounts) * invoiceDiscount
      );
    }

    const finalItemDiscount = roundMoney(item.lineDiscount + allocatedInvoiceDiscount);
    const lineTotal = Math.max(0, roundMoney(item.grossLine - finalItemDiscount));

    let taxAmount = 0;
    let netRevenue = 0;

    if (item.taxRate > 0) {
      if (isTaxInclusive) {
        // Price includes tax: e.g. LineTotal = NetRevenue * (1 + rate/100)
        netRevenue = roundMoney(lineTotal / (1 + item.taxRate / 100));
        taxAmount = roundMoney(lineTotal - netRevenue);
      } else {
        // Price excludes tax: LineTotal is base, tax is added
        netRevenue = lineTotal;
        taxAmount = roundMoney((netRevenue * item.taxRate) / 100);
      }
    } else {
      netRevenue = lineTotal;
      taxAmount = 0;
    }

    const lineCost = roundMoney(item.costPrice * item.quantity);
    const lineProfit = roundMoney(netRevenue - lineCost);

    return {
      productId: item.product.id,
      productNameAr: item.product.nameAr,
      productNameEn: item.product.nameEn,
      barcode: item.product.barcode,
      unit: item.product.unit || 'حبة',
      price: item.price,
      costPrice: item.costPrice,
      quantity: item.quantity,
      discount: finalItemDiscount,
      taxRate: item.taxRate,
      taxAmount,
      lineTotal: isTaxInclusive ? lineTotal : roundMoney(lineTotal + taxAmount),
      netRevenue,
      lineCost,
      lineProfit,
    };
  });

  const totalTax = roundMoney(calculatedItems.reduce((acc, it) => acc + it.taxAmount, 0));
  const totalCost = roundMoney(calculatedItems.reduce((acc, it) => acc + it.lineCost, 0));
  const totalNetRevenue = roundMoney(calculatedItems.reduce((acc, it) => acc + it.netRevenue, 0));
  const grossProfit = roundMoney(totalNetRevenue - totalCost);

  let finalGrandTotal = 0;
  if (isTaxInclusive) {
    finalGrandTotal = roundMoney(rawSubtotal - totalDiscount);
  } else {
    finalGrandTotal = roundMoney(rawSubtotal - totalDiscount + totalTax);
  }

  return {
    items: calculatedItems,
    subtotal: rawSubtotal,
    discount: totalDiscount,
    discountType,
    discountValue: numDiscountVal,
    tax: totalTax,
    total: finalGrandTotal,
    totalCost,
    grossProfit,
  };
}
