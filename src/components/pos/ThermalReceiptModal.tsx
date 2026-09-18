import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { SaleInvoice } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { apiClient } from '../../services/apiClient.ts';
import { Printer, X, Check, RefreshCw } from 'lucide-react';

interface ThermalReceiptModalProps {
  invoice: SaleInvoice;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  onClose,
  onNewSale,
}) => {
  const { settings, language, showToast, user } = useApp();
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(
    settings?.receiptPaperWidth || '80mm'
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [reprinting, setReprinting] = useState<boolean>(false);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // Generate QR code and Barcode
  useEffect(() => {
    // Generate QR Code containing structured invoice info
    const qrPayload = JSON.stringify({
      seller: settings?.storeNameAr || 'Smart Market',
      taxId: settings?.taxNumber || '300-456-789',
      invoice: invoice.invoiceNumber,
      date: `${invoice.date} ${invoice.time}`,
      total: invoice.total,
      tax: invoice.tax,
    });

    QRCode.toDataURL(qrPayload, { width: 120, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));

    // Generate barcode
    if (barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, invoice.invoiceNumber, {
          format: 'CODE128',
          width: 1.2,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 0,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [invoice, settings]);

  const handlePrint = () => {
    window.print();
  };

  const handleReprint = async () => {
    setReprinting(true);
    try {
      await apiClient.post(`/sales/${invoice.id}/reprint`, {
        userId: user?.id,
        userName: user?.nameAr,
      });
      showToast(
        language === 'ar' ? 'تم تسجيل إعادة الطباعة في سجل العمليات' : 'Reprint recorded in audit log',
        'success'
      );
      window.print();
    } catch (err) {
      console.error(err);
    } finally {
      setReprinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {language === 'ar' ? 'إيصال الفاتورة الحراري (Receipt)' : 'Thermal Sales Receipt'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm Switcher */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '58mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '80mm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
          {/* Printable Receipt Paper */}
          <div
            id="printable-receipt"
            className={`bg-white shadow-md border border-slate-300 p-4 text-black font-mono transition-all duration-200 ${
              paperWidth === '58mm' ? 'w-[280px] text-[11px]' : 'w-[360px] text-xs'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="font-black text-base">{settings?.storeNameAr || 'سوبر ماركت سمارت'}</h2>
              <p className="text-[10px] text-gray-700">{settings?.storeNameEn || 'Smart Market POS'}</p>
              <p className="text-[10px] mt-0.5 font-sans">{invoice.branchNameAr}</p>
              <p className="text-[10px]">هاتف: {settings?.phone || '01001234567'}</p>
              {settings?.taxNumber && (
                <p className="text-[10px] font-bold mt-0.5">
                  الرقم الضريبي: <span className="font-mono">{settings.taxNumber}</span>
                </p>
              )}
            </div>

            {/* Invoice Info */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>رقم الفاتورة:</span>
                <span className="font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{invoice.date} {invoice.time}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{invoice.cashierName}</span>
              </div>
              {invoice.customerName && (
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span>{invoice.customerName}</span>
                </div>
              )}
              {invoice.reprintCount > 0 && (
                <div className="text-center font-bold text-red-600 border border-black py-0.5 mt-1">
                  *** نسخة معاد طباعتها ({invoice.reprintCount}) ***
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full my-2 border-b border-dashed border-black">
              <thead>
                <tr className="border-b border-black text-[10px] text-start font-bold">
                  <th className="py-1 text-start">الصنف</th>
                  <th className="py-1 text-center">الكمية</th>
                  <th className="py-1 text-end">السعر</th>
                  <th className="py-1 text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="text-[10px]">
                    <td className="py-1 pe-1 font-sans">
                      <div className="font-bold truncate max-w-[130px]">{item.productNameAr}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{item.barcode}</div>
                    </td>
                    <td className="py-1 text-center font-bold">{item.quantity}</td>
                    <td className="py-1 text-end font-mono">{item.price.toFixed(2)}</td>
                    <td className="py-1 text-end font-bold font-mono">{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-black">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{invoice.subtotal.toFixed(2)} ج.م</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between text-red-700 font-bold">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono">-{invoice.discount.toFixed(2)} ج.م</span>
                </div>
              )}

              {settings?.taxEnabled && (
                <div className="flex justify-between text-gray-700">
                  <span>ضريبة القيمة المضافة ({settings.defaultTaxRate}%):</span>
                  <span className="font-mono">{invoice.tax.toFixed(2)} ج.م</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-base">{invoice.total.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* Payments & Change */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>طرق الدفع:</span>
                <span className="font-bold">
                  {invoice.payments
                    .map((p) => (p.method === 'cash' ? 'نقدي' : p.method === 'card' ? 'بطاقة' : p.method))
                    .join(' + ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ المدفوع:</span>
                <span className="font-mono font-bold">{invoice.amountPaid.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>المتبقي (الفكة):</span>
                <span className="font-mono text-emerald-700">{invoice.change.toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* QR & Barcode Section for Returns & e-Invoice */}
            <div className="pt-3 flex flex-col items-center justify-center gap-2">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Invoice QR Code"
                  className="w-24 h-24 border border-gray-300 p-1"
                />
              )}
              <svg ref={barcodeSvgRef} className="max-w-full" />
              <p className="text-[9px] text-gray-600 text-center">
                {settings?.receiptFooterMessageAr || 'شكراً لزيارتكم ونسعد بخدمتكم دائماً'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          {onNewSale && (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'عملية بيع جديدة (F1)' : 'New Sale (F1)'}
            </button>
          )}

          <div className="flex items-center gap-2 ms-auto">
            <button
              onClick={handleReprint}
              disabled={reprinting}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${reprinting ? 'animate-spin' : ''}`} />
              <span>{language === 'ar' ? 'إعادة طباعة (Audit)' : 'Reprint'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'ar' ? 'طباعة الإيصال (Print)' : 'Print Receipt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
