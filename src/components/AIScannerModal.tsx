import React from 'react';
import { analyzeFilmWithAI, captureFrame } from "../lib/geminiVision";

// ...

// @ts-ignore
async function handleScanClick() {
  // @ts-ignore
  setLoading(true);
  // @ts-ignore
  const base64 = captureFrame(videoRef);
  try {
    // @ts-ignore
    const result = await analyzeFilmWithAI(base64);
    // @ts-ignore
    setScanResult(result); // ไป update state ที่ใช้แสดงผลใน UI (ค่า pH, confidence ฯลฯ)
  } catch (err) {
    console.error(err);
    // @ts-ignore
    setError("สแกนไม่สำเร็จ ลองใหม่อีกครั้ง");
  } finally {
    // @ts-ignore
    setLoading(false);
  }
}

interface AIScannerModalProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraError: string | null;
  scanMethod: string;
}

export default function AIScannerModal({ videoRef, cameraError, scanMethod }: AIScannerModalProps) {
  if (scanMethod !== 'webcam') return null;

  return (
    <div className="w-full h-full flex items-center justify-center bg-black z-10 relative">
      {cameraError ? (
        <div className="text-center p-6 space-y-2">
          <span className="text-3xl">⚠️</span>
          <div className="text-xs font-bold text-rose-400">{cameraError}</div>
          <p className="text-[10px] text-[#6c8072] max-w-xs">ระบบสแกนได้สลับเปิดใช้งานกล้องจำลองอัตโนมัติเพื่อให้คุณสามารถทำการสแกนผลไม้เสมือนจริงได้อย่างสมบูรณ์แบบ</p>
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
          {/* Webcam Viewfinder Bracket Overlays */}
          <div className="absolute inset-4 border border-[#efead9]/15 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-10 h-10 border-t-2 border-l-2 border-emerald-500 absolute top-0 left-0"></div>
            <div className="w-10 h-10 border-t-2 border-r-2 border-emerald-500 absolute top-0 right-0"></div>
            <div className="w-10 h-10 border-b-2 border-l-2 border-emerald-500 absolute bottom-0 left-0"></div>
            <div className="w-10 h-10 border-b-2 border-r-2 border-emerald-500 absolute bottom-0 right-0"></div>
            <div className="w-12 h-12 rounded-full border border-dashed border-emerald-500/40 animate-spin-slow"></div>
          </div>
        </>
      )}
    </div>
  );
}
