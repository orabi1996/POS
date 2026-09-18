import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Camera, X, AlertCircle, RefreshCw, Barcode } from 'lucide-react';

interface CameraScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ onScan, onClose }) => {
  const { language } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          localStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('Camera access not permitted or unavailable in current frame:', err);
          setCameraError(
            language === 'ar'
              ? 'تعذر تشغيل الكاميرا (قد يتطلب تشغيل التطبيق في نافذة مستقلة للسماح بالكاميرا).'
              : 'Camera access unavailable in current frame.'
          );
        });
    } else {
      setCameraError(
        language === 'ar' ? 'المتصفح لا يدعم الوصول للكاميرا' : 'Camera API not supported by browser'
      );
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [language]);

  const testCodes = [
    { name: 'جهينة حليب', code: '6221155012345' },
    { name: 'جبنة دومتي', code: '6223001234567' },
    { name: 'مياه نستله', code: '6221008123456' },
    { name: 'كوكاكولا', code: '5449000000996' },
    { name: 'شاي العروسة', code: '6221004123456' },
    { name: 'أرز الضحى', code: '6221054123456' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">
              {language === 'ar' ? 'قارئ الباركود بالكاميرا (Camera Scanner)' : 'Camera Barcode Scanner'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video stream container */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-4 text-center text-rose-300 text-xs flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <span>{cameraError}</span>
              <span className="text-[11px] text-slate-400 mt-1">
                {language === 'ar'
                  ? 'يمكنك استخدام الباركود السريع أدناه أو استخدام قارئ الباركود اليدوي USB / لوحة المفاتيح'
                  : 'You can test with barcodes below or use USB Barcode scanner'}
              </span>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target Aim Box overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-emerald-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500 animate-pulse" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Barcode Quick Simulators */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-emerald-600" />
            <span>{language === 'ar' ? 'محاكاة قراءة باركود سريعاً (Scan Test):' : 'Instant Scan Test:'}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {testCodes.map((tc) => (
              <button
                key={tc.code}
                type="button"
                onClick={() => {
                  onScan(tc.code);
                  onClose();
                }}
                className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-start transition-all cursor-pointer"
              >
                <div className="font-bold text-xs text-slate-800 truncate">{tc.name}</div>
                <div className="font-mono text-[10px] text-slate-500">{tc.code}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
