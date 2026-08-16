import React from 'react';
import AIScannerModal from './AIScannerModal';

interface ScanViewportProps {
  scanMethod: 'simulated' | 'webcam' | 'upload';
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  simulatedFruitId: string;
}

export default function ScanViewport({
  scanMethod,
  cameraError,
  videoRef,
  canvasRef,
  selectedImage,
  setSelectedImage,
  fileInputRef,
  handleImageUpload,
  simulatedFruitId,
}: ScanViewportProps) {
  return (
    <div className="relative w-full aspect-video rounded-2xl bg-black border border-emerald-500/20 overflow-hidden shadow-inner group">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 grid-overlay-bg z-0 pointer-events-none"></div>

      {/* TAB 1: Simulated Canvas Camera */}
      {scanMethod === 'simulated' && (
        <div className="w-full h-full flex items-center justify-center bg-[#07100b] z-10 relative">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>
      )}

      {/* TAB 2: Webcam Direct Feed */}
      <AIScannerModal
        videoRef={videoRef}
        cameraError={cameraError}
        scanMethod={scanMethod}
      />

      {/* TAB 3: File Upload Area */}
      {scanMethod === 'upload' && (
        <div className="w-full h-full flex items-center justify-center bg-[#0d1612] z-10 relative">
          {selectedImage ? (
            <>
              <img src={selectedImage} alt="Uploaded preview" className="w-full h-full object-contain" />

              {/* HUD Overlay เหมือน TAB 2 */}
              <div className="absolute inset-0 grid-overlay-bg pointer-events-none z-10"></div>

              <div className="absolute inset-4 border border-[#efead9]/15 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="w-10 h-10 border-t-2 border-l-2 border-emerald-500 absolute top-0 left-0"></div>
                <div className="w-10 h-10 border-t-2 border-r-2 border-emerald-500 absolute top-0 right-0"></div>
                <div className="w-10 h-10 border-b-2 border-l-2 border-emerald-500 absolute bottom-0 left-0"></div>
                <div className="w-10 h-10 border-b-2 border-r-2 border-emerald-500 absolute bottom-0 right-0"></div>
                <div className="w-12 h-12 rounded-full border border-dashed border-emerald-500/40 animate-spin-slow"></div>
              </div>

              {/* ปุ่มเปลี่ยนรูปมุมบนขวา */}
              <button
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-3 right-3 z-20 text-xs bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg transition-all"
              >
                ✕ เปลี่ยนรูป
              </button>
            </>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-emerald-500/5 transition text-center space-y-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-[#182b21] flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                📁
              </div>
              <div className="text-xs font-bold text-[#efead9]">คลิกเพื่ออัปโหลดภาพผลไม้</div>
              <p className="text-[10px] text-[#6c8072]">รองรับไฟล์ภาพสกุล JPEG, PNG เพื่อให้ AI สแกนฟิล์ม</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
