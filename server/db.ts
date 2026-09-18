import fs from 'fs';
import path from 'path';
import {
  User,
  Branch,
  Register,
  Category,
  Product,
  InventoryBalance,
  InventoryTransaction,
  Shift,
  SaleInvoice,
  SaleReturn,
  Customer,
  Supplier,
  Expense,
  AuditLog,
  SystemSettings,
} from '../src/types/index.ts';

interface StoreData {
  users: User[];
  branches: Branch[];
  registers: Register[];
  categories: Category[];
  products: Product[];
  inventoryBalances: InventoryBalance[];
  inventoryTransactions: InventoryTransaction[];
  shifts: Shift[];
  sales: SaleInvoice[];
  returns: SaleReturn[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_SETTINGS: SystemSettings = {
  storeNameAr: 'سوبر ماركت سمارت POS',
  storeNameEn: 'Smart Market POS',
  taxNumber: '300-456-789',
  phone: '01001234567',
  addressAr: 'شارع التحرير، الدقي، الجيزة',
  addressEn: 'Tahrir St, Dokki, Giza',
  currency: 'EGP',
  currencySymbolAr: 'ج.م',
  currencySymbolEn: 'EGP',
  defaultLanguage: 'ar',
  taxEnabled: true,
  defaultTaxRate: 14,
  taxInclusive: true,
  receiptPaperWidth: '80mm',
  receiptHeaderMessageAr: 'أهلاً بكم في سوبر ماركت سمارت',
  receiptHeaderMessageEn: 'Welcome to Smart Market',
  receiptFooterMessageAr: 'شكراً لزيارتكم ونسعد بخدمتكم دائماً',
  receiptFooterMessageEn: 'Thank you for shopping with us!',
  maxCashierDiscountPercent: 5,
  maxManagerDiscountPercent: 20,
  shortcuts: {
    productSearch: 'F2',
    quantity: 'F4',
    discount: 'F6',
    holdSale: 'F8',
    recallSale: 'F9',
    payment: 'F10',
    quickCash: 'F12',
    closeModal: 'Escape',
  },
};

const SEED_BRANCHES: Branch[] = [
  {
    id: 'BR01',
    code: 'BR-CAIRO',
    nameAr: 'الفرع الرئيسي - الدقي',
    nameEn: 'Main Branch - Dokki',
    addressAr: 'شارع التحرير، الدقي، الجيزة',
    addressEn: 'Tahrir St, Dokki, Giza',
    phone: '02-33345678',
    status: 'active',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'BR02',
    code: 'BR-ALEX',
    nameAr: 'فرع الإسكندرية - سموحة',
    nameEn: 'Alexandria Branch - Smouha',
    addressAr: 'طريق 14 مايو، سموحة، الإسكندرية',
    addressEn: '14th of May Rd, Smouha, Alex',
    phone: '03-42456789',
    status: 'active',
    createdAt: '2026-02-01T08:00:00.000Z',
  },
];

const SEED_REGISTERS: Register[] = [
  {
    id: 'REG-01',
    code: 'POS-01',
    name: 'كاشير 1 - الرئيسي (Main Cashier 1)',
    branchId: 'BR01',
    printerSettings: { paperWidth: '80mm', autoPrint: true },
    status: 'active',
  },
  {
    id: 'REG-02',
    code: 'POS-02',
    name: 'كاشير 2 - السريع (Express Cashier 2)',
    branchId: 'BR01',
    printerSettings: { paperWidth: '80mm', autoPrint: true },
    status: 'active',
  },
  {
    id: 'REG-03',
    code: 'POS-03',
    name: 'كاشير الإسكندرية 1 (Alex Cashier 1)',
    branchId: 'BR02',
    printerSettings: { paperWidth: '80mm', autoPrint: true },
    status: 'active',
  },
];

const SEED_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    nameAr: 'أحمد محمود (المدير العام)',
    nameEn: 'Ahmed Mahmoud (Super Admin)',
    role: 'Super Admin',
    branchId: 'BR01',
    status: 'active',
    email: 'admin@smartmarket.pos',
    maxDiscountPercent: 100,
  },
  {
    id: 'usr_manager',
    username: 'manager',
    nameAr: 'محمد علي (مدير فرع)',
    nameEn: 'Mohamed Ali (Branch Manager)',
    role: 'Branch Manager',
    branchId: 'BR01',
    status: 'active',
    email: 'manager@smartmarket.pos',
    maxDiscountPercent: 20,
  },
  {
    id: 'usr_cashier1',
    username: 'cashier1',
    nameAr: 'سارة إبراهيم (كاشير)',
    nameEn: 'Sara Ibrahim (Cashier)',
    role: 'Cashier',
    branchId: 'BR01',
    status: 'active',
    email: 'cashier1@smartmarket.pos',
    maxDiscountPercent: 5,
  },
  {
    id: 'usr_inventory',
    username: 'inventory',
    nameAr: 'خالد حسن (أمين مخزن)',
    nameEn: 'Khaled Hassan (Inventory Officer)',
    role: 'Inventory Officer',
    branchId: 'BR01',
    status: 'active',
    email: 'inventory@smartmarket.pos',
    maxDiscountPercent: 0,
  },
  {
    id: 'usr_accountant',
    username: 'accountant',
    nameAr: 'يوسف عادل (محاسب)',
    nameEn: 'Youssef Adel (Accountant)',
    role: 'Accountant',
    branchId: 'BR01',
    status: 'active',
    email: 'accountant@smartmarket.pos',
    maxDiscountPercent: 10,
  },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'cat_dairy', code: 'CAT-DAI', nameAr: 'ألبان وأجبان', nameEn: 'Dairy & Cheese', status: 'active', color: '#0284c7', icon: 'Milk' },
  { id: 'cat_beverages', code: 'CAT-BEV', nameAr: 'مشروبات وعصائر', nameEn: 'Beverages & Juices', status: 'active', color: '#0d9488', icon: 'CupSoda' },
  { id: 'cat_bakery', code: 'CAT-BAK', nameAr: 'مخبوزات وحلويات', nameEn: 'Bakery & Sweets', status: 'active', color: '#d97706', icon: 'Cake' },
  { id: 'cat_groceries', code: 'CAT-GRO', nameAr: 'بقالة ومعلبات', nameEn: 'Groceries & Canned', status: 'active', color: '#16a34a', icon: 'ShoppingBag' },
  { id: 'cat_oils', code: 'CAT-OIL', nameAr: 'زيوت وسمن', nameEn: 'Oils & Ghee', status: 'active', color: '#ca8a04', icon: 'Droplet' },
  { id: 'cat_grains', code: 'CAT-GRA', nameAr: 'أرز ومكرونة وحبوب', nameEn: 'Rice & Pasta', status: 'active', color: '#ea580c', icon: 'Wheat' },
  { id: 'cat_cleaning', code: 'CAT-CLE', nameAr: 'منظفات ومطهرات', nameEn: 'Cleaning & Detergents', status: 'active', color: '#2563eb', icon: 'Sparkles' },
  { id: 'cat_personal', code: 'CAT-PER', nameAr: 'عناية شخصية', nameEn: 'Personal Care', status: 'active', color: '#9333ea', icon: 'Heart' },
  { id: 'cat_frozen', code: 'CAT-FRO', nameAr: 'مجمدات ولحوم', nameEn: 'Frozen Foods', status: 'active', color: '#06b6d4', icon: 'Snowflake' },
  { id: 'cat_water', code: 'CAT-WAT', nameAr: 'مياه ومشروبات غازية', nameEn: 'Water & Soft Drinks', status: 'active', color: '#3b82f6', icon: 'GlassWater' },
];

const SEED_PRODUCTS_RAW = [
  { sku: 'SKU-001', nameAr: 'جهينة حليب كامل الدسم 1 لتر', nameEn: 'Juhayna Full Cream Milk 1L', barcode: '6221155012345', categoryId: 'cat_dairy', unit: 'علبة', purchasePrice: 36.50, sellingPrice: 44.00, minStock: 20 },
  { sku: 'SKU-002', nameAr: 'جبنة بيضاء دومتي بلس 500 جم', nameEn: 'Domty Plus White Cheese 500g', barcode: '6223001234567', categoryId: 'cat_dairy', unit: 'علبة', purchasePrice: 42.00, sellingPrice: 50.00, minStock: 15 },
  { sku: 'SKU-003', nameAr: 'زبادي المراعي طبيعي 105 جم', nameEn: 'Almarai Natural Yogurt 105g', barcode: '6281007123456', categoryId: 'cat_dairy', unit: 'كوب', purchasePrice: 8.50, sellingPrice: 11.00, minStock: 30 },
  { sku: 'SKU-004', nameAr: 'زبدة لورباك غير مملحة 200 جم', nameEn: 'Lurpak Unsalted Butter 200g', barcode: '5740500123456', categoryId: 'cat_dairy', unit: 'قطعة', purchasePrice: 135.00, sellingPrice: 165.00, minStock: 10 },
  { sku: 'SKU-005', nameAr: 'مياه معدنية نستله 1.5 لتر', nameEn: 'Nestle Pure Life Mineral Water 1.5L', barcode: '6221008123456', categoryId: 'cat_water', unit: 'زجاجة', purchasePrice: 6.50, sellingPrice: 9.00, minStock: 40 },
  { sku: 'SKU-006', nameAr: 'كوكاكولا كانز أصلية 330 مل', nameEn: 'Coca Cola Original Can 330ml', barcode: '5449000000996', categoryId: 'cat_water', unit: 'كانز', purchasePrice: 12.00, sellingPrice: 16.00, minStock: 35 },
  { sku: 'SKU-007', nameAr: 'بيبسي كانز 330 مل', nameEn: 'Pepsi Regular Can 330ml', barcode: '012000000133', categoryId: 'cat_water', unit: 'كانز', purchasePrice: 12.00, sellingPrice: 16.00, minStock: 35 },
  { sku: 'SKU-008', nameAr: 'عصير جهينة مانجو طبيعي 1 لتر', nameEn: 'Juhayna Pure Mango Juice 1L', barcode: '6221155098765', categoryId: 'cat_beverages', unit: 'علبة', purchasePrice: 32.00, sellingPrice: 40.00, minStock: 20 },
  { sku: 'SKU-009', nameAr: 'شاي العروسة أسود فاخر 250 جم', nameEn: 'El Arosa Black Tea 250g', barcode: '6221004123456', categoryId: 'cat_beverages', unit: 'باكت', purchasePrice: 50.00, sellingPrice: 62.00, minStock: 25 },
  { sku: 'SKU-010', nameAr: 'نسكافيه كلاسيك سريع التحضير 100 جم', nameEn: 'Nescafe Classic Instant Coffee 100g', barcode: '7613035123456', categoryId: 'cat_beverages', unit: 'برطمان', purchasePrice: 110.00, sellingPrice: 135.00, minStock: 12 },
  { sku: 'SKU-011', nameAr: 'سكر أبيض نقي المروة 1 كجم', nameEn: 'El Marwa Pure White Sugar 1kg', barcode: '6224001123456', categoryId: 'cat_groceries', unit: 'كيس', purchasePrice: 28.00, sellingPrice: 35.00, minStock: 50 },
  { sku: 'SKU-012', nameAr: 'زيت ذرة عافية نقي 800 مل', nameEn: 'Afia Pure Corn Oil 800ml', barcode: '6221009123456', categoryId: 'cat_oils', unit: 'زجاجة', purchasePrice: 85.00, sellingPrice: 105.00, minStock: 20 },
  { sku: 'SKU-013', nameAr: 'زيت زيتون بكر ممتاز وادي فود 500 مل', nameEn: 'Wadi Food Extra Virgin Olive Oil 500ml', barcode: '6221087123456', categoryId: 'cat_oils', unit: 'زجاجة', purchasePrice: 195.00, sellingPrice: 240.00, minStock: 8 },
  { sku: 'SKU-014', nameAr: 'مكرونة الملكة أقلام 400 جم', nameEn: 'El Maleka Penne Pasta 400g', barcode: '6221065123456', categoryId: 'cat_grains', unit: 'كيس', purchasePrice: 14.00, sellingPrice: 18.00, minStock: 40 },
  { sku: 'SKU-015', nameAr: 'أرز مصري كامولينو الضحى 1 كجم', nameEn: 'Al Doha Egyptian Camolino Rice 1kg', barcode: '6221054123456', categoryId: 'cat_grains', unit: 'كيس', purchasePrice: 38.00, sellingPrice: 46.00, minStock: 30 },
  { sku: 'SKU-016', nameAr: 'تونة صن شاين قطع في الزيت 185 جم', nameEn: 'Sunshine Tuna Chunks in Oil 185g', barcode: '8850123456789', categoryId: 'cat_groceries', unit: 'علبة', purchasePrice: 52.00, sellingPrice: 65.00, minStock: 20 },
  { sku: 'SKU-017', nameAr: 'فول مدمس سادة حدائق كاليفورنيا 400 جم', nameEn: 'California Garden Plain Fava Beans 400g', barcode: '6221123456789', categoryId: 'cat_groceries', unit: 'علبة', purchasePrice: 19.00, sellingPrice: 24.00, minStock: 25 },
  { sku: 'SKU-018', nameAr: 'شوكولاتة كادبوري ديري ميلك 90 جم', nameEn: 'Cadbury Dairy Milk Chocolate 90g', barcode: '7622210123456', categoryId: 'cat_bakery', unit: 'قطعة', purchasePrice: 38.00, sellingPrice: 48.00, minStock: 25 },
  { sku: 'SKU-019', nameAr: 'بسكويت أوريو شوكولاتة الأصلي 12 قطعة', nameEn: 'Oreo Original Sandwich Cookies 12pk', barcode: '7622300123456', categoryId: 'cat_bakery', unit: 'باكت', purchasePrice: 22.00, sellingPrice: 28.00, minStock: 30 },
  { sku: 'SKU-020', nameAr: 'خبز توست أبيض ريتش بيك 550 جم', nameEn: 'Rich Bake White Toast Bread 550g', barcode: '6221076123456', categoryId: 'cat_bakery', unit: 'كيس', purchasePrice: 38.00, sellingPrice: 46.00, minStock: 15 },
  { sku: 'SKU-021', nameAr: 'مسحوق غسيل أريال أوتوماتيك 2.5 كجم', nameEn: 'Ariel Automatic Detergent Powder 2.5kg', barcode: '4015600123456', categoryId: 'cat_cleaning', unit: 'كيس', purchasePrice: 190.00, sellingPrice: 235.00, minStock: 12 },
  { sku: 'SKU-022', nameAr: 'صابون سائل ديتول للأيدي 250 مل', nameEn: 'Dettol Handwash Liquid 250ml', barcode: '5000158123456', categoryId: 'cat_cleaning', unit: 'عبوة', purchasePrice: 55.00, sellingPrice: 70.00, minStock: 15 },
  { sku: 'SKU-023', nameAr: 'صابون لوكس معطر لمسة مخملية 120 جم', nameEn: 'Lux Velvet Touch Beauty Soap 120g', barcode: '8712561123456', categoryId: 'cat_personal', unit: 'قطعة', purchasePrice: 15.00, sellingPrice: 20.00, minStock: 35 },
  { sku: 'SKU-024', nameAr: 'معجون أسنان سيجنال مكافحة التسوس 100 مل', nameEn: 'Signal Cavity Fighter Toothpaste 100ml', barcode: '8717163123456', categoryId: 'cat_personal', unit: 'أنبوب', purchasePrice: 26.00, sellingPrice: 34.00, minStock: 20 },
  { sku: 'SKU-025', nameAr: 'شامبو بانتين بديل الزيت عناية ملكي 400 مل', nameEn: 'Pantene Pro-V Milky Damage Shampoo 400ml', barcode: '4015600987654', categoryId: 'cat_personal', unit: 'زجاجة', purchasePrice: 78.00, sellingPrice: 98.00, minStock: 12 },
  { sku: 'SKU-026', nameAr: 'كاتشب طماطم هاينز الأصلي 340 جم', nameEn: 'Heinz Tomato Ketchup 340g', barcode: '013000001234', categoryId: 'cat_groceries', unit: 'زجاجة', purchasePrice: 34.00, sellingPrice: 42.00, minStock: 20 },
  { sku: 'SKU-027', nameAr: 'مايونيز هاينز كلاسيك 310 جم', nameEn: 'Heinz Creamy Mayonnaise 310g', barcode: '013000004321', categoryId: 'cat_groceries', unit: 'برطمان', purchasePrice: 45.00, sellingPrice: 56.00, minStock: 15 },
  { sku: 'SKU-028', nameAr: 'بطاطس نصف مقلية فارم فريتس 1 كجم', nameEn: 'Farm Frites Pommes Frites 1kg', barcode: '6221043123456', categoryId: 'cat_frozen', unit: 'كيس', purchasePrice: 65.00, sellingPrice: 82.00, minStock: 15 },
  { sku: 'SKU-029', nameAr: 'برجر لحم بقري حلواني إخوان 8 قطع', nameEn: 'Halwani Bros Beef Burger 8pcs', barcode: '6221032123456', categoryId: 'cat_frozen', unit: 'علبة', purchasePrice: 145.00, sellingPrice: 180.00, minStock: 10 },
  { sku: 'SKU-030', nameAr: 'مسحوق فانيش أوكسي أكشن مزيل بقع 450 جم', nameEn: 'Vanish Oxi Action Fabric Stain Remover 450g', barcode: '5000158987654', categoryId: 'cat_cleaning', unit: 'عبوة', purchasePrice: 95.00, sellingPrice: 120.00, minStock: 8 },
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 'cust_01', code: 'CUST-001', name: 'عميل نقدي عام (General Cash Customer)', phone: '01000000000', balance: 0, points: 0, status: 'active' },
  { id: 'cust_02', code: 'CUST-002', name: 'عمرو دياب', phone: '01012345678', email: 'amr@example.com', address: 'المعادي، القاهرة', balance: 120, points: 150, status: 'active' },
  { id: 'cust_03', code: 'CUST-003', name: 'منى الشاذلي', phone: '01298765432', email: 'mona@example.com', address: 'مصر الجديدة، القاهرة', balance: 0, points: 340, status: 'active' },
  { id: 'cust_04', code: 'CUST-004', name: 'طارق لطفي', phone: '01123456789', email: 'tarek@example.com', address: 'الشيخ زايد، 6 أكتوبر', balance: 45, points: 80, status: 'active' },
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: 'sup_01', code: 'SUP-001', name: 'شركة جهينة للصناعات الغذائية', phone: '02-38380000', email: 'sales@juhayna.com', taxNumber: '100-234-567', balance: 15400, status: 'active' },
  { id: 'sup_02', code: 'SUP-002', name: 'شركة يونيليفر مشرق للتجارة', phone: '02-27350000', email: 'orders@unilever.com', taxNumber: '200-456-789', balance: 8900, status: 'active' },
  { id: 'sup_03', code: 'SUP-003', name: 'شركة إيديتا للصناعات الغذائية', phone: '02-38200000', email: 'info@edita.com.eg', taxNumber: '300-678-912', balance: 4200, status: 'active' },
];

class DatabaseService {
  private data: StoreData;
  private isSaving: boolean = false;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading store.json, initializing fresh store:', err);
    }

    return this.generateSeedData();
  }

  private generateSeedData(): StoreData {
    const products: Product[] = SEED_PRODUCTS_RAW.map((p, idx) => ({
      id: `prod_${(idx + 1).toString().padStart(3, '0')}`,
      sku: p.sku,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      barcode: p.barcode,
      additionalBarcodes: [],
      qrCodeValue: `PROD-${p.sku}-${p.barcode}`,
      categoryId: p.categoryId,
      brand: p.nameEn.split(' ')[0],
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      taxRate: 14,
      minStock: p.minStock,
      maxStock: p.minStock * 5,
      trackStock: true,
      trackExpiry: true,
      description: `${p.nameAr} - جودة ممتازة مضمونة`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Generate inventory balances for both branches
    const inventoryBalances: InventoryBalance[] = [];
    const inventoryTransactions: InventoryTransaction[] = [];

    products.forEach((prod, i) => {
      // Branch 1
      const qty1 = 50 + (i % 5) * 15;
      inventoryBalances.push({
        id: `bal_BR01_${prod.id}`,
        productId: prod.id,
        branchId: 'BR01',
        quantity: qty1,
        lastUpdated: new Date().toISOString(),
      });
      inventoryTransactions.push({
        id: `tx_init_1_${prod.id}`,
        productId: prod.id,
        productNameAr: prod.nameAr,
        productNameEn: prod.nameEn,
        branchId: 'BR01',
        branchName: 'الفرع الرئيسي - الدقي',
        transactionType: 'Opening Balance',
        quantity: qty1,
        quantityBefore: 0,
        quantityAfter: qty1,
        referenceType: 'Initial',
        referenceId: 'SYS-INIT',
        userId: 'usr_admin',
        userName: 'أحمد محمود',
        date: new Date().toISOString(),
        notes: 'الرصيد الافتتاحي للمنتج',
      });

      // Branch 2
      const qty2 = 30 + (i % 4) * 10;
      inventoryBalances.push({
        id: `bal_BR02_${prod.id}`,
        productId: prod.id,
        branchId: 'BR02',
        quantity: qty2,
        lastUpdated: new Date().toISOString(),
      });
    });

    // Default open shift for Cashier 1 at BR01
    const shift: Shift = {
      id: 'shift_today_01',
      shiftNumber: 'SH-20260918-001',
      cashierId: 'usr_cashier1',
      cashierName: 'سارة إبراهيم',
      branchId: 'BR01',
      branchName: 'الفرع الرئيسي - الدقي',
      registerId: 'REG-01',
      registerName: 'كاشير 1 - الرئيسي',
      openingCash: 500, // 500 EGP initial drawer float
      openingTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
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
      expectedCash: 500,
    };

    const initialAudit: AuditLog = {
      id: 'audit_001',
      userId: 'usr_admin',
      userName: 'أحمد محمود',
      userRole: 'Super Admin',
      action: 'SYSTEM_INITIALIZATION',
      module: 'System',
      recordId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      branchId: 'BR01',
      details: 'تهيئة نظام Smart Market POS بنجاح وتوليد البيانات الأولية.',
    };

    const store: StoreData = {
      users: SEED_USERS,
      branches: SEED_BRANCHES,
      registers: SEED_REGISTERS,
      categories: SEED_CATEGORIES,
      products,
      inventoryBalances,
      inventoryTransactions,
      shifts: [shift],
      sales: [],
      returns: [],
      customers: SEED_CUSTOMERS,
      suppliers: SEED_SUPPLIERS,
      expenses: [],
      auditLogs: [initialAudit],
      settings: DEFAULT_SETTINGS,
    };

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write initial store:', err);
    }

    return store;
  }

  public save(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DATA_FILE);
    } catch (err) {
      console.error('Failed to persist store:', err);
    } finally {
      this.isSaving = false;
    }
  }

  // Getters
  public getUsers(): User[] { return this.data.users; }
  public getBranches(): Branch[] { return this.data.branches; }
  public getRegisters(): Register[] { return this.data.registers; }
  public getCategories(): Category[] { return this.data.categories; }
  public getProducts(): Product[] { return this.data.products; }
  public getBalances(): InventoryBalance[] { return this.data.inventoryBalances; }
  public getTransactions(): InventoryTransaction[] { return this.data.inventoryTransactions; }
  public getShifts(): Shift[] { return this.data.shifts; }
  public getSales(): SaleInvoice[] { return this.data.sales; }
  public getReturns(): SaleReturn[] { return this.data.returns; }
  public getCustomers(): Customer[] { return this.data.customers; }
  public getSuppliers(): Supplier[] { return this.data.suppliers; }
  public getExpenses(): Expense[] { return this.data.expenses; }
  public getAuditLogs(): AuditLog[] { return this.data.auditLogs; }
  public getSettings(): SystemSettings { return this.data.settings; }

  // Setters / Mutators
  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const auditRecord: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(auditRecord);
    // Keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public getProductStock(productId: string, branchId: string): number {
    const bal = this.data.inventoryBalances.find(
      (b) => b.productId === productId && b.branchId === branchId
    );
    return bal ? bal.quantity : 0;
  }

  public setProductStock(
    productId: string,
    branchId: string,
    newQuantity: number,
    type: any,
    refType: 'Sale' | 'Return' | 'Adjustment' | 'Purchase' | 'Initial',
    refId: string,
    userId: string,
    userName: string,
    notes?: string
  ): void {
    let bal = this.data.inventoryBalances.find(
      (b) => b.productId === productId && b.branchId === branchId
    );
    const prod = this.data.products.find((p) => p.id === productId);
    const branch = this.data.branches.find((b) => b.id === branchId);

    const prevQty = bal ? bal.quantity : 0;
    const diff = newQuantity - prevQty;

    if (!bal) {
      bal = {
        id: `bal_${branchId}_${productId}`,
        productId,
        branchId,
        quantity: newQuantity,
        lastUpdated: new Date().toISOString(),
      };
      this.data.inventoryBalances.push(bal);
    } else {
      bal.quantity = newQuantity;
      bal.lastUpdated = new Date().toISOString();
    }

    const tx: InventoryTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId,
      productNameAr: prod ? prod.nameAr : productId,
      productNameEn: prod ? prod.nameEn : productId,
      branchId,
      branchName: branch ? branch.nameAr : branchId,
      transactionType: type,
      quantity: diff,
      quantityBefore: prevQty,
      quantityAfter: newQuantity,
      referenceType: refType,
      referenceId: refId,
      userId,
      userName,
      date: new Date().toISOString(),
      notes,
    };

    this.data.inventoryTransactions.unshift(tx);
    this.save();
  }
}

export const db = new DatabaseService();
