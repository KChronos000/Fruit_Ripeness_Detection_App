import React, { useState, useEffect, useRef } from 'react';
import { FRUIT_DEFS, STAGES, PH_MIN, PH_MAX, stageFor } from '@/constants/fruitConstants';
import { useFruitSimulation } from '@/hooks/useFruitSimulation';
import ManualMeasurement from './pages/Manual_measurement'
import ReferenceDataTable from './pages/ReferenceDataTable';
import MeasurementHistoryLog from './pages/MeasurementHistoryLog';
import AIScannerModal from './components/AIScannerModal';
import type { FruitState, AlertItem, AIAnalysisResult } from '@/types/fruits';
import { analyzeFilmWithAI, captureFrame } from "@/lib/geminiVision";
import BiofilmExtraMetrics from './components/BiofilmExtraMetrics';




export default function App() {
  const {
    dayCount,
    setDayCount,
    paused,
    setPaused,
    alerts,
    fruitStates,
    triggerManualAnomaly,
    handleReset,
  } = useFruitSimulation();

  async function handleScanClick() {
  setIsAnalyzing(true);
  setAiResult(null);

  try {
    let base64: string;

    if (scanMethod === 'upload') {
      if (!selectedImage) {
        setCameraError('กรุณาอัปโหลดรูปก่อนสแกน');
        setIsAnalyzing(false);
        return;
      }
      base64 = selectedImage.split(',')[1]; // ตัด "data:image/png;base64," ออก

    } else if (scanMethod === 'webcam') {
      if (!videoRef.current) {
        setCameraError('กล้องยังไม่พร้อม');
        setIsAnalyzing(false);
        return;
      }
      base64 = captureFrame(videoRef);

    } else {
      // simulated — ใช้รูปตัวอย่างสำหรับ demo
      setCameraError('โหมดจำลองยังไม่รองรับการสแกนจริง');
      setIsAnalyzing(false);
      return;
    }

    const result = await analyzeFilmWithAI(base64);
    setAiResult(result);

  } catch (err) {
    console.error(err);
    setCameraError('สแกนไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    setIsAnalyzing(false);
  }
}

  const [selectedId, setSelectedId] = useState<string>(FRUIT_DEFS[0].id);
  const [page, setPage] = useState<'dashboard' | 'manual' | 'ReferenceDataTable' | 'MeasurementHistoryLog'>('dashboard')
  
  // Modals & AI Scanner State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upgraded AI Scanner & Biosensor HUD States
  const [scanMethod, setScanMethod] = useState<'webcam' | 'simulated' | 'upload'>('simulated');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [simulatedFruitId, setSimulatedFruitId] = useState<string>('mango');
  const [scanProgressStep, setScanProgressStep] = useState<number>(0);
  const [scanProgressText, setScanProgressText] = useState<string>('');
  const [selectedHotspot, setSelectedHotspot] = useState<'ph' | 'integrity' | 'oil' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
  };

  // Webcam stream lifecycle
  useEffect(() => {
    if (!showAiModal || scanMethod !== 'webcam' || !isCameraActive) {
      stopWebcam();
      return;
    }

    let activeStream: MediaStream | null = null;
    setCameraError(null);

    async function startWebcam() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error('Error accessing webcam:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'ปฏิเสธการเข้าถึงกล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์ของคุณ'
            : 'ไม่พบอุปกรณ์กล้อง หรือตรวจพบข้อผิดพลาดในการเชื่อมต่อ'
        );
        setScanMethod('simulated'); // Fallback to simulated
      }
    }

    startWebcam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showAiModal, scanMethod, isCameraActive]);

  // Simulation Canvas loop
  useEffect(() => {
    if (!showAiModal || scanMethod !== 'simulated' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 380;

    let animationFrameId: number;
    let angle = 0;

    // Create floating particles representing natural essential oil vapours
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxLife: number;
      life: number;
      color: string;
    }> = [];

    const spawnParticle = (centerX: number, centerY: number) => {
      const theta = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 30;
      const px = centerX + Math.cos(theta) * r;
      const py = centerY + Math.sin(theta) * r;

      const colors = [
        'rgba(52, 211, 153, 0.7)', // emerald
        'rgba(251, 191, 36, 0.7)', // amber
        'rgba(45, 212, 191, 0.7)', // teal
      ];

      particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 0.8,
        size: 1.5 + Math.random() * 2.5,
        alpha: 1,
        maxLife: 60 + Math.random() * 60,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    const drawGrid = (w: number, h: number) => {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.fillStyle = 'rgba(15, 25, 20, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 10;

      drawGrid(canvas.width, canvas.height);

      ctx.save();
      const hoverY = Math.sin(angle * 2) * 5;
      ctx.translate(cx, cy + hoverY);

      const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
      let fruitColor = 'rgba(16, 185, 129, 0.15)';
      let outlineColor = 'rgba(16, 185, 129, 0.8)';
      if (simulatedFruitId === 'mango') {
        fruitColor = 'rgba(245, 158, 11, 0.15)';
        outlineColor = 'rgba(245, 158, 11, 0.8)';
      } else if (simulatedFruitId === 'banana') {
        fruitColor = 'rgba(234, 179, 8, 0.15)';
        outlineColor = 'rgba(234, 179, 8, 0.8)';
      } else if (simulatedFruitId === 'papaya') {
        fruitColor = 'rgba(249, 115, 22, 0.15)';
        outlineColor = 'rgba(249, 115, 22, 0.8)';
      }

      auraGrad.addColorStop(0, fruitColor);
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = outlineColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      if (simulatedFruitId === 'mango') {
        ctx.moveTo(-40, -50);
        ctx.bezierCurveTo(-10, -80, 50, -70, 60, -20);
        ctx.bezierCurveTo(70, 30, 40, 70, -10, 60);
        ctx.bezierCurveTo(-45, 55, -75, 20, -70, -20);
        ctx.bezierCurveTo(-65, -45, -55, -40, -40, -50);
      } else if (simulatedFruitId === 'banana') {
        ctx.moveTo(-60, -30);
        ctx.quadraticCurveTo(0, -60, 60, -10);
        ctx.quadraticCurveTo(20, 20, -60, -30);
        ctx.moveTo(-60, -30);
        ctx.lineTo(-70, -35);
      } else if (simulatedFruitId === 'papaya') {
        ctx.moveTo(-25, -55);
        ctx.bezierCurveTo(25, -55, 35, -20, 25, 10);
        ctx.bezierCurveTo(15, 30, 45, 60, 0, 65);
        ctx.bezierCurveTo(-45, 60, -15, 30, -25, 10);
        ctx.bezierCurveTo(-35, -20, -25, -55, -25, -55);
      } else {
        ctx.arc(0, 0, 65, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(239, 234, 217, 0.15)';
      ctx.lineWidth = 1;

      for (let i = -4; i <= 4; i++) {
        const y = i * 15;
        ctx.beginPath();
        ctx.ellipse(0, y, 55, 10, 0, 0, Math.PI, true);
        ctx.stroke();
      }

      for (let i = -4; i <= 4; i++) {
        const x = i * 15;
        ctx.beginPath();
        ctx.ellipse(x, 0, 10, 60, 0, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }

      const pulseVal = Math.sin(angle * 5) * 0.2 + 0.8;
      ctx.fillStyle = outlineColor;
      const sensorNodes = [
        { x: -20, y: -10 },
        { x: 25, y: 15 },
        { x: 5, y: -35 },
      ];
      sensorNodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10 * pulseVal, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.restore();

      if (Math.random() < 0.25) {
        spawnParticle(cx, cy + hoverY);
      }

      particles.forEach((p, idx) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y + hoverY * 0.3, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) {
          particles.splice(idx, 1);
        }
      });
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = 'rgba(239, 234, 217, 0.2)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.3);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([15, 35]);
      ctx.beginPath();
      ctx.arc(0, 0, 146, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const brLen = 20;
      ctx.strokeStyle = 'rgba(239, 234, 217, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 30 + brLen); ctx.lineTo(30, 30); ctx.lineTo(30 + brLen, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width - 30, 30 + brLen); ctx.lineTo(canvas.width - 30, 30); ctx.lineTo(canvas.width - 30 - brLen, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, canvas.height - 30 - brLen); ctx.lineTo(30, canvas.height - 30); ctx.lineTo(30 + brLen, canvas.height - 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width - 30, canvas.height - 30 - brLen); ctx.lineTo(canvas.width - 30, canvas.height - 30); ctx.lineTo(canvas.width - 30 - brLen, canvas.height - 30);
      ctx.stroke();

      ctx.fillStyle = '#93a89a';
      ctx.font = '10px monospace';
      ctx.fillText(`TARGET: [${simulatedFruitId.toUpperCase()}_NODE_A]`, 40, 45);
      ctx.fillText(`CHITOSAN_MEMBRANE: [SECURED]`, 40, 60);

      ctx.fillText(`LAT: 16.2415° N`, canvas.width - 160, 45);
      ctx.fillText(`LNG: 102.1245° E`, canvas.width - 160, 60);

      const statusCol = outlineColor;
      ctx.fillStyle = statusCol;
      ctx.fillText(`INDICATOR STATE: NATURAL ANTHOCYANIN`, 40, canvas.height - 45);
      ctx.fillText(`REF_SIGNAL: LOCK_ACTIVE (100Hz)`, canvas.width - 220, canvas.height - 45);

      angle += 0.015;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showAiModal, scanMethod, simulatedFruitId]);

  const captureSimulatedFrame = () => {
    if (canvasRef.current) {
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  };

  const captureWebcamFrame = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg');
      }
    }
    return null;
  };

function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    setSelectedImage(reader.result as string); // data URL สำหรับ preview
    setAiResult(null); // ล้างผลเก่าทุกครั้งที่เปลี่ยนรูป
  };
  reader.readAsDataURL(file);
}

  const analyzeImageWithGemini = async () => {
  setIsAnalyzing(true);
  setAiResult(null);
  setCameraError(null);

  try {
    let base64: string;

    if (scanMethod === 'upload') {
      if (!selectedImage) {
        setCameraError('กรุณาอัปโหลดรูปก่อนสแกน');
        setIsAnalyzing(false);
        return;
      }
      base64 = selectedImage.split(',')[1];

    } else if (scanMethod === 'webcam') {
      base64 = captureFrame(videoRef);

    } else {
      setCameraError('โหมดจำลองยังไม่รองรับการสแกนจริง กรุณาเลือกกล้องเว็บแคมหรืออัปโหลดภาพ');
      setIsAnalyzing(false);
      return;
    }

    const result = await analyzeFilmWithAI(base64);
    setAiResult(result);

  } catch (err) {
  console.error(err);
  setCameraError('สแกนไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
  } finally {
    setIsAnalyzing(false);
  }
};

  const fallbackState: FruitState = {
    def: FRUIT_DEFS[0],
    ph: FRUIT_DEFS[0].startPh,
    temp: FRUIT_DEFS[0].tempBase,
    hum: FRUIT_DEFS[0].humBase,
    integrity: 100,
    essentialOilLevel: 100,
    anomaly: false,
    anomalyTicks: 0,
    history: [FRUIT_DEFS[0].startPh],
    lastStageKey: stageFor(FRUIT_DEFS[0].startPh).key,
  };

  const selectedState = fruitStates[selectedId] || fruitStates[FRUIT_DEFS[0].id] || fallbackState;
  const selectedStage = selectedState ? stageFor(selectedState.ph) : STAGES[0];
  const anomalyZones = Object.values(fruitStates).filter((s) => s?.anomaly);

  return (
    <div className="min-h-screen bg-[#0f1914] text-[#efead9] font-sans antialiased pb-20 selection:bg-emerald-800 selection:text-emerald-100">
      {/* Top Header */}
      <header className="border-b border-[#efead9]/10 bg-[#16251e]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-emerald-500 via-amber-500 to-purple-600 p-0.5 shadow-lg shadow-emerald-900/30">
              <div className="w-full h-full bg-[#101d18] rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-lg">🌿</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#efead9] font-serif">FreshGuard</h1>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Smart Biofilm</span>
              </div>
              <p className="text-xs text-[#93a89a]">เฝ้าระวังความสุกและฟิล์มชีวภาพอัจฉริยะ</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowKnowledgeModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs bg-[#23392c] hover:bg-[#2e4a3a] text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg transition"
            >
              <span>🧪 องค์ประกอบฟิล์ม</span>
            </button>

            <div className="text-right border-l border-[#efead9]/10 pl-6">
              <div className="text-[10px] uppercase tracking-widest text-amber-400 font-mono">เวลาในสวน (จำลอง)</div>
              <div className="text-xl font-mono font-bold text-[#efead9]">วันที่ {Math.floor(dayCount)}</div>
              <div className="text-[11px] text-[#6c8072]">2.5 วิ ≈ 6 ชม.</div>
            </div>
          </div>
        </div>
      </header>
      <div style={{ padding: 12 }}>
        <div
  style={{
    display: 'flex',
    gap: 10,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }}
>
  <button
    onClick={() => setPage('dashboard')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 8,
      border: page === 'dashboard' ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.12)',
      background: page === 'dashboard' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
      color: page === 'dashboard' ? '#6ee7b7' : '#cbd5c9',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    🏠 หน้าหลัก
  </button>

  <button
    onClick={() => setPage('manual')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 8,
      border: page === 'manual' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.12)',
      background: page === 'manual' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
      color: page === 'manual' ? '#fde68a' : '#cbd5c9',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    📝 บันทึกค่าที่วัดจริง
  </button>

  <button
    onClick={() => setPage('ReferenceDataTable')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 8,
      border: page === 'ReferenceDataTable' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.12)',
      background: page === 'ReferenceDataTable' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
      color: page === 'ReferenceDataTable' ? '#fde68a' : '#cbd5c9',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    ตารางอ้างอิงค่า pH มาตรฐาน
  </button>

  <button
    onClick={() => setPage('MeasurementHistoryLog')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      borderRadius: 8,
      border: page === 'MeasurementHistoryLog' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.12)',
      background: page === 'MeasurementHistoryLog' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
      color: page === 'MeasurementHistoryLog' ? '#fde68a' : '#cbd5c9',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    ประวัติการวัดค่า
  </button>
</div>
      </div>

      {page === 'manual' ? (
        <ManualMeasurement />
        ) : page === 'ReferenceDataTable' ? (
          <ReferenceDataTable />
        ) : page === 'MeasurementHistoryLog' ? (
          <MeasurementHistoryLog />
        ) : (


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Controls & Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#182b21] p-3 rounded-xl border border-[#efead9]/10">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDayCount((d) => d + 1)}
              className="bg-[#23392c] hover:bg-[#2d4a39] text-[#efead9] px-3 py-1.5 rounded-lg text-xs font-medium border border-[#efead9]/15 transition flex items-center gap-1"
            >
              ⏩ เร่งเวลา (+1 วัน)
            </button>
            <button
              onClick={() => setPaused(!paused)}
              className="bg-[#23392c] hover:bg-[#2d4a39] text-[#efead9] px-3 py-1.5 rounded-lg text-xs font-medium border border-[#efead9]/15 transition"
            >
              {paused ? '▶ เล่นต่อ' : '⏸ หยุดชั่วคราว'}
            </button>
            <button
              onClick={handleReset}
              className="bg-[#23392c] hover:bg-[#2d4a39] text-rose-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/20 transition"
            >
              ↺ เริ่มใหม่
            </button>
          </div>

          <div className="text-xs text-[#93a89a] flex items-center gap-2">
            <span>สถานะระบบ:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              กำลังเฝ้าระวัง 4 โซน
            </span>
          </div>
        </div>

        {/* AI Camera Hero Card */}
        <div
          onClick={() => setShowAiModal(true)}
          className="relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 shadow-xl cursor-pointer hover:opacity-95 transition group border border-emerald-500/30"
        >
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-125 transition"></div>
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl border border-white/20 group-hover:scale-105 transition">
                📸
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                  ถ่ายภาพฟิล์มชีวภาพ
                  <span className="text-xs bg-amber-400 text-slate-900 font-sans font-bold px-2 py-0.5 rounded-full">AI Gemini Inside</span>
                </h2>
                <p className="text-emerald-100/80 text-xs mt-1">
                  ถ่ายรูปสีฟิล์มเพื่อวิเคราะห์ค่า pH ความสุก และรอยแมลงศัตรูพืชด้วย AI ประมวลผลภาพทันที
                </p>
              </div>
            </div>
            <button className="bg-white text-emerald-900 hover:bg-emerald-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition group-hover:translate-x-1">
              <span>เริ่มสแกนด้วย AI</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Film Color Legend Scale Bar */}
        <div className="bg-[#182b21] rounded-xl p-4 border border-[#efead9]/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#93a89a]">
            <span className="font-semibold text-[#efead9] font-serif">🎨 สเกลสีฟิล์มชีวภาพ (Anthocyanin Indicator)</span>
            <span>ปฏิกิริยา pH ต่อสีอินดิเคเตอร์ธรรมชาติ</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {STAGES.map((stg) => (
              <div key={stg.key} className="bg-[#122119] p-2.5 rounded-lg border border-[#efead9]/5 text-center space-y-1">
                <div className="h-2 rounded-full" style={{ backgroundColor: stg.color }}></div>
                <div className="text-xs font-semibold text-[#efead9]">{stg.short}</div>
                <div className="text-[10px] text-[#6c8072]">{stg.full.split('·')[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly Global Alert Banner */}
        {anomalyZones.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-bold text-sm">ตรวจพบสิ่งแปลกปลอม/ความผิดปกติ {anomalyZones.length} โซน!</div>
                <div className="text-xs text-rose-300/80">
                  {anomalyZones.map((z) => `${z.def.zone} (${z.def.name})`).join(', ')} — กรุณาตรวจสอบรอยฉีกขาดของฟิล์มหรือศัตรูพืช
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAiModal(true)}
              className="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-rose-600 transition flex-none"
            >
              สแกนตรวจสอบ
            </button>
          </div>
        )}

        {/* Fruit Zone Grid Cards */}
        <div>
          <h2 className="text-lg font-bold font-serif mb-3 text-[#efead9]">สถานะโซนผลไม้ (4 โซน)</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FRUIT_DEFS.map((f) => {
              const s = fruitStates[f.id];
              if (!s) return null;
              const stage = stageFor(s.ph);
              const isSelected = f.id === selectedId;

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`relative bg-[#182b21] rounded-2xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                    isSelected ? 'border-amber-400 shadow-lg shadow-amber-900/20 ring-1 ring-amber-400/50' : 'border-[#efead9]/10 hover:border-[#efead9]/30'
                  } ${s.anomaly ? 'border-rose-500/80 bg-rose-950/20' : ''}`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-xs text-[#6c8072] font-mono">{f.zone}</div>
                        <h3 className="text-base font-bold font-serif text-[#efead9]">{f.name}</h3>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${stage.bgClass}`}>
                        {stage.short}
                      </span>
                    </div>

                    {/* Ring pH Center Meter */}
                    <div className="relative w-28 h-28 mx-auto my-2 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="46" stroke="rgba(239,234,217,0.1)" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="56"
                          cy="56"
                          r="46"
                          stroke={stage.color}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={289}
                          strokeDashoffset={289 - (289 * Math.min(100, Math.max(0, ((s.ph - PH_MIN) / (PH_MAX - PH_MIN)) * 100))) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-xl font-mono font-bold text-[#efead9]">{s.ph.toFixed(2)}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#6c8072]">ค่า pH</div>
                      </div>
                    </div>

                    {/* Sensor Data Rows */}
                    <div className="space-y-1.5 text-xs text-[#93a89a] my-3 bg-[#122119] p-2.5 rounded-xl">
                      <div className="flex justify-between">
                        <span>อุณหภูมิ:</span>
                        <span className="font-mono text-[#efead9]">{s.temp.toFixed(1)} °C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ความชื้นสัมพัทธ์:</span>
                        <span className="font-mono text-[#efead9]">{s.hum.toFixed(0)} %</span>
                      </div>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span>ความสมบูรณ์ฟิล์ม:</span>
                          <span className={`font-mono font-semibold ${s.integrity < 35 ? 'text-rose-400' : 'text-amber-300'}`}>
                            {s.integrity.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#182b21] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${s.integrity < 35 ? 'bg-rose-500' : 'bg-amber-400'}`}
                            style={{ width: `${s.integrity}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#efead9]/5 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerManualAnomaly(f.id);
                      }}
                      className="w-full text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 py-1.5 rounded-lg transition text-center font-medium"
                    >
                      🧪 จำลองศัตรูพืช
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lower Analytics & Alert Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BiofilmExtraMetrics 
            selectedState={selectedState} 
            dayCount={dayCount}
          
          />

            {/* Alert Log Feed */}
          <div className="bg-[#182b21] border border-[#efead9]/10 rounded-2xl p-5 flex flex-col h-[420]">
            <div className="border-b border-[#efead9]/10 pb-3 mb-3">
              <h2 className="text-lg font-bold font-serif text-[#efead9]">บันทึกการแจ้งเตือน</h2>
              <p className="text-xs text-[#93a89a]">ความสุก · สุขภาพฟิล์ม · ศัตรูพืชรบกวน</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {alerts.length === 0 ? (
                <div className="text-center text-[#6c8072] py-16">ยังไม่มีการแจ้งเตือน — ระบบอยู่ในสภาวะปกติ</div>
              ) : (
                alerts.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border-l-4 space-y-1 transition ${
                      item.kind === 'danger'
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                        : item.kind === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                        : item.kind === 'info'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                        : 'bg-[#122119] border-slate-500 text-[#efead9]'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-[11px]">
                      <span>{item.title}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {item.time} (วันที่ {item.day})
                      </span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed opacity-90">{item.message}</p>
                  </div>
                ))
              )}
            </div>            
        </div>
          </div>
        </main>
      )}

      {/* Footer Knowledge Note */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-[#6c8072] space-y-2">
        <p>
          FreshGuard Smart Biofilm — โครงงานฟิล์มชีวภาพอัจฉริยะเพื่อยืดอายุและปกป้องผลไม้จากไคโตซาน แป้งธรรมชาติ และ Natural pH Indicator
        </p>
        <p className="text-[10px] font-mono">โรงเรียนภูเขียว — Environmental Sustainability via Technology</p>
      </footer>

      {/* AI Scanner Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-all animate-fade-in">
          {/* Custom Scanner Animations Style Tag */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scan-laser {
              0% { top: 0%; opacity: 0.6; }
              50% { top: 100%; opacity: 1; }
              100% { top: 0%; opacity: 0.6; }
            }
            @keyframes pulse-ring-glow {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); transform: scale(0.95); }
              70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); transform: scale(1.05); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); transform: scale(0.95); }
            }
            @keyframes pulse-ring-amber {
              0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); transform: scale(0.95); }
              70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); transform: scale(1.05); }
              100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); transform: scale(0.95); }
            }
            @keyframes pulse-ring-rose {
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: scale(0.95); }
              70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); transform: scale(1.05); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(0.95); }
            }
            .laser-scan-line {
              animation: scan-laser 2.8s infinite ease-in-out;
            }
            .sensor-node-ph {
              animation: pulse-ring-amber 2s infinite ease-in-out;
            }
            .sensor-node-cyan {
              animation: pulse-ring-glow 2s infinite ease-in-out;
            }
            .sensor-node-rose {
              animation: pulse-ring-rose 1.8s infinite ease-in-out;
            }
            .grid-overlay-bg {
              background-image: 
                linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
              background-size: 20px 20px;
            }
          `}} />

          <div className="bg-[#121f19] border border-emerald-500/30 rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto shadow-2xl shadow-emerald-950/50">
            {/* Modal Title Banner */}
            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <span className="text-xl">📸</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#efead9] flex items-center gap-2">
                    AI Smart Biofilm Scanner
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">v2.0 HUD</span>
                  </h3>
                  <p className="text-xs text-[#93a89a]">ระบบวิเคราะห์ตรวจสอบสารเคมีอินดิเคเตอร์และสภาพฟิล์มชีวภาพอัจฉริยะ</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopWebcam();
                  setShowAiModal(false);
                }}
                className="text-[#93a89a] hover:text-rose-400 text-sm font-bold w-9 h-9 rounded-full bg-[#182b21] hover:bg-rose-500/10 border border-[#efead9]/15 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Main Side-by-Side Panels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Camera/HUD Viewport Control Panel */}
              <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                {/* Mode Selector Tabs */}
                <div className="bg-[#182b21] p-1 rounded-xl border border-emerald-500/10 grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setScanMethod('simulated');
                      setAiResult(null);
                      setSelectedImage(null);

                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      scanMethod === 'simulated'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-[#93a89a] hover:text-[#efead9] hover:bg-[#122119]'
                    }`}
                  >
                    <span>💻</span> กล้องจำลอง HUD
                  </button>
                  <button
                    onClick={() => {
                          setScanMethod('webcam');
                          setAiResult(null);
                          setSelectedImage(null);
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      scanMethod === 'webcam'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-[#93a89a] hover:text-[#efead9] hover:bg-[#122119]'
                    }`}
                  >
                    <span>📷</span> กล้องเว็บแคม
                  </button>
                  <button
                    onClick={() => {
                      setScanMethod('upload');
                      setAiResult(null);
                      setSelectedImage(null);
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      scanMethod === 'upload'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-[#93a89a] hover:text-[#efead9] hover:bg-[#122119]'
                    }`}
                  >
                    <span>📁</span> อัปโหลดภาพ
                  </button>
                </div>

                {/* VIEWPORT BOX */}
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
                  {/* TAB 3: File Upload Area */}
                  {scanMethod === 'upload' && (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d1612] z-30 relative">
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
                            className="absolute top-3 right-3 z-50 text-xs bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg transition-all pointer-events-auto"
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

                  {/* VIEWPORT OVERLAYS: SCANNING ANIMATION */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* Laser Line */}
                      <div className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] laser-scan-line"></div>
                      {/* Green Scan Tint */}
                      <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[0.5px]"></div>
                    </div>
                  )}

                  {/* VIEWPORT OVERLAYS: INTERACTIVE HOTSPOTS (Once Scanned!) */}
                  {aiResult && !isAnalyzing && (
                    <div className="absolute inset-0 z-20">
                      {/* Hotspot 1: pH Anthocyanin Node */}
                      <button
                        onClick={() => setSelectedHotspot('ph')}
                        className={`absolute w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center cursor-pointer hover:scale-125 transition-all focus:outline-none sensor-node-ph ${
                          selectedHotspot === 'ph' ? 'ring-2 ring-white scale-125 bg-amber-500/40' : ''
                        }`}
                        style={{ top: '42%', left: '33%' }}
                        title="pH Anthocyanin Node"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      </button>

                      {/* Hotspot 2: Chitosan Barrier Node */}
                      <button
                        onClick={() => setSelectedHotspot('integrity')}
                        className={`absolute w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center cursor-pointer hover:scale-125 transition-all focus:outline-none sensor-node-cyan ${
                          selectedHotspot === 'integrity' ? 'ring-2 ring-white scale-125 bg-emerald-500/40' : ''
                        }`}
                        style={{ top: '24%', left: '62%' }}
                        title="Chitosan Barrier Node"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      </button>

                      {/* Hotspot 3: Essential Oil Node */}
                      <button
                        onClick={() => setSelectedHotspot('oil')}
                        className={`absolute w-6 h-6 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center cursor-pointer hover:scale-125 transition-all focus:outline-none sensor-node-rose ${
                          selectedHotspot === 'oil' ? 'ring-2 ring-white scale-125 bg-rose-500/40' : ''
                        }`}
                        style={{ top: '65%', left: '48%' }}
                        title="Essential Oil Node"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      </button>
                    </div>
                  )}

                  {/* VIEWPORT OVERLAYS: CORNER HUD TEXTS */}
                  <div className="absolute top-3 left-3 bg-[#0d1612]/80 backdrop-blur border border-emerald-500/20 rounded-md px-2 py-0.5 pointer-events-none z-10 text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                    HUD MODE: {scanMethod}
                  </div>

                  {/* VIEWPORT OVERLAYS: SCANNING PROGRESS BAR TERMINAL */}
                  {isAnalyzing && (
                    <div className="absolute bottom-3 left-3 right-3 bg-[#0c120f]/90 backdrop-blur border border-emerald-500/30 rounded-xl p-3 z-30 space-y-2 text-[10px] font-mono text-emerald-300 animate-slide-up shadow-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          LIVE SPECTRAL SCAN IN PROGRESS...
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {((scanProgressStep + 1) * 20)}%
                        </span>
                      </div>
                      <p className="text-[#93a89a] leading-relaxed italic">{scanProgressText}</p>
                      <div className="w-full h-1 bg-[#182b21] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${(scanProgressStep + 1) * 20}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP CONTROLLERS BELOW VIEWPORT */}
                <div className="space-y-3">
                  {/* Fruit Matrix Selection (Only in Simulation mode) */}
                  {scanMethod === 'simulated' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider uppercase text-[#93a89a]">สารตั้งต้นแบบจำลอง (Target Biomaterial Matrix):</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'mango', label: '🥭 มะม่วง', color: 'border-amber-500/30 text-amber-300' },
                          { id: 'banana', label: '🍌 กล้วย', color: 'border-yellow-500/30 text-yellow-300' },
                          { id: 'papaya', label: '🍈 มะละกอ', color: 'border-orange-500/30 text-orange-400' },
                          { id: 'guava', label: '🥝 ฝรั่ง', color: 'border-emerald-500/30 text-emerald-300' },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            disabled={isAnalyzing}
                            onClick={() => {
                              setSimulatedFruitId(btn.id);
                              setAiResult(null);
                            }}
                            className={`py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                              simulatedFruitId === btn.id
                                ? 'bg-emerald-950 border-emerald-400 text-[#efead9] shadow'
                                : `bg-[#122119] ${btn.color} hover:bg-[#182b21] opacity-65`
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Presets for Upload mode (Quick testing) */}
                  {scanMethod === 'upload' && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono tracking-wider uppercase text-[#93a89a]">หรือดึงฐานข้อมูลรูปภาพตัวอย่างทดสอบ:</div>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { label: '🥭 มะม่วงสีฟิล์มเหลือง', img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80' },
                          { label: '🍌 กล้วยสีฟิล์มส้มเหลือง', img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80' },
                          { label: '🍈 ฝรั่งสีฟิล์มเขียวสด', img: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&q=80' },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            disabled={isAnalyzing}
                            onClick={() => {
                              setSelectedImage(preset.img);
                              setAiResult(null);
                            }}
                            className="text-[10px] bg-[#122119] hover:bg-[#182b21] text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trigger SCAN Action Button */}
                  <button
                    onClick={analyzeImageWithGemini}
                    disabled={isAnalyzing}
                    className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>กำลังยิงเลเซอร์เสมือนวิเคราะห์...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ เริ่มเหนี่ยวนำเลเซอร์และสแกนโครงข่ายฟิล์มชีวภาพ AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Scan Analytics Report Panel */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                {/* 1. PLACEHOLDER / UNANALYZED STATE */}
                {(!aiResult && !isAnalyzing) && (
                  <div className="bg-[#182b21]/40 border border-emerald-500/10 rounded-2xl p-8 text-center space-y-4 flex flex-col items-center justify-center h-full min-h-[300]">
                    {/* Animated Sonar / Radar effect */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute w-20 h-20 rounded-full border border-emerald-500/20 animate-ping"></div>
                      <div className="absolute w-14 h-14 rounded-full border border-emerald-500/30 animate-pulse"></div>
                      <div className="w-8 h-8 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-300">
                        📡
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold font-serif text-[#efead9]">เฝ้ารอข้อมูลตรวจสเปกตรัมชีวภาพ...</h4>
                      <p className="text-xs text-[#93a89a] max-w-sm leading-relaxed mx-auto">
                        กรุณากดปุ่ม <strong className="text-emerald-400 font-semibold">"เริ่มเหนี่ยวนำเลเซอร์และสแกน"</strong> ที่แถบควบคุมด้านซ้าย ระบบจะทำการบันทึกภาพ นำวิเคราะห์ทางชีวเคมี และคืนแผนที่ความชื้น/ค่า pH อัจฉริยะแบบเรียลไทม์
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. LOADING STATE PLACEHOLDER */}
                {isAnalyzing && (
                  <div className="bg-[#182b21]/40 border border-emerald-500/10 rounded-2xl p-8 text-center space-y-4 flex flex-col items-center justify-center h-full min-h-[300] animate-pulse">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
                      <span className="text-lg">🌿</span>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold font-serif text-emerald-400">ระบบ AI กำลังถอดรหัสพันธะเคมี...</h4>
                      <p className="text-xs text-[#93a89a] max-w-sm">
                        กำลังดึงค่าเฉดสีแอนโทไซยานิน วิเคราะห์ปริมาณน้ำมันหอมระเหยกานพลู-ตะไคร้ และเชื่อมต่อกับโครงงานระบบ FreshGuard Biosensor
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. REPORT READY STATE */}
                {aiResult && !isAnalyzing && (
                  <div className="space-y-4 animate-fade-in h-full flex flex-col justify-between">
                    {/* Header Score/Metadata Badge */}
                    <div className="bg-[#182b21] border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center gap-2 shadow-inner">
                      <div>
                        <div className="text-[10px] font-mono tracking-widest text-[#93a89a] uppercase">วิเคราะห์ผลเรียบร้อย</div>
                        <h4 className="text-sm font-bold font-serif text-[#efead9] flex items-center gap-1.5">
                          <span>📊</span> ไฮไลต์รายงานความปลอดภัยชีวภาพ
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Confidence</div>
                        <span className="font-mono text-base font-extrabold text-emerald-300">{aiResult.confidence}%</span>
                      </div>
                    </div>

                    {/* Main 4 Parameter Grid Tiles */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Grid 1: Evaluated pH */}
                      <div className="bg-[#122119] p-3 rounded-xl border border-emerald-500/10 space-y-1">
                        <div className="text-[9px] font-mono text-[#6c8072] uppercase tracking-wider">ค่า pH อินดิเคเตอร์ประเมิน</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-mono font-black text-amber-300">{aiResult.phEstimate.toFixed(2)}</span>
                          <span className="text-[9px] text-[#93a89a]">ระดับกรด-ด่าง</span>
                        </div>
                        {/* Interactive mini pH slider */}
                        <div className="w-full h-1.5 bg-[#182b21] rounded-full relative overflow-hidden">
                          <div
                            className="absolute h-full bg-linear-to-r from-emerald-500 via-amber-500 to-purple-600 transition-all duration-700"
                            style={{ width: '100%' }}
                          ></div>
                          <div
                            className="absolute w-2.5 h-2.5 bg-white border border-black rounded-full top-1/2 -translate-y-1/2 transition-all duration-700"
                            style={{ left: `${((aiResult.phEstimate - PH_MIN) / (PH_MAX - PH_MIN)) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Grid 2: Biofilm Temp */}
                      <div className="bg-[#122119] p-3 rounded-xl border border-emerald-500/10 space-y-1">
                        <div className="text-[9px] font-mono text-[#6c8072] uppercase tracking-wider">อุณหภูมิที่ผิวสัมผัส (Temp)</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-mono font-black text-emerald-400">{aiResult.temperature.toFixed(1)}°C</span>
                          <span className="text-[9px] text-[#93a89a]">องศาเซลเซียส</span>
                        </div>
                        <div className="w-full h-1 bg-[#182b21] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${(aiResult.temperature / 45) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Grid 3: Moisture Rel */}
                      <div className="bg-[#122119] p-3 rounded-xl border border-emerald-500/10 space-y-1">
                        <div className="text-[9px] font-mono text-[#6c8072] uppercase tracking-wider">ความชื้นสัมพัทธ์สะสม (Humid)</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-mono font-black text-teal-300">{aiResult.humidity.toFixed(0)}%</span>
                          <span className="text-[9px] text-[#93a89a]">สัมพัทธ์ในเนื้อฟิล์ม</span>
                        </div>
                        <div className="w-full h-1 bg-[#182b21] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-400 transition-all duration-500"
                            style={{ width: `${aiResult.humidity}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Grid 4: Shelf Life */}
                      <div className="bg-[#122119] p-3 rounded-xl border border-emerald-500/10 space-y-1">
                        <div className="text-[9px] font-mono text-[#6c8072] uppercase tracking-wider">อายุการวางจำหน่ายที่ประเมิน</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-mono font-black text-amber-400">{aiResult.shelfLifeDays} วัน</span>
                          <span className="text-[9px] text-[#93a89a]">คงเหลือเป้าหมาย</span>
                        </div>
                        <div className="w-full h-1 bg-[#182b21] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${(aiResult.shelfLifeDays / 12) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Dual Biofilm Progress Bars with Neon Glow */}
                    <div className="bg-[#182b21]/70 p-3.5 rounded-xl border border-emerald-500/10 space-y-3 shadow-inner">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-[#efead9]">
                          <span>ความหนาแน่นและโครงสร้างฟิล์มไคโตซาน (Integrity):</span>
                          <span className={`font-mono font-bold ${aiResult.filmIntegrity < 65 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {aiResult.filmIntegrity}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#122119] rounded-full overflow-hidden p-0.5 border border-emerald-500/5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              aiResult.filmIntegrity < 65 ? 'bg-linear-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_#ef4444]' : 'bg-linear-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_#10b981]'
                            }`}
                            style={{ width: `${aiResult.filmIntegrity}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-medium text-[#efead9]">
                          <span>สารไล่แมลงและน้ำมันหอมระเหยตะไคร้-กานพลู (Essential Oils):</span>
                          <span className="font-mono text-amber-300 font-bold">{aiResult.essentialOilLevel}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#122119] rounded-full overflow-hidden p-0.5 border border-emerald-500/5">
                          <div
                            className="h-full bg-linear-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700 shadow-[0_0_8px_#f59e0b]"
                            style={{ width: `${aiResult.essentialOilLevel}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Status Highlights & Indicator color panel */}
                    <div className="bg-[#122119] p-3 rounded-xl border border-emerald-500/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                      <div>
                        <div className="text-[10px] text-[#6c8072] font-mono uppercase tracking-wider">สถานะความสุกและแบคทีเรีย:</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${aiResult.phEstimate > 5.0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <strong className="text-[#efead9]">{aiResult.stageName}</strong>
                        </div>
                        <p className="text-[10.5px] text-[#93a89a] mt-0.5">
                          {aiResult.pestOrMoldDetected ? '⚠️ ตรวจพบสปอร์ราหรือเพลี้ย' : '✓ ไม่พบสัญญาณแมลงกวนผิวฟิล์ม'}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] text-[#6c8072] font-mono uppercase tracking-wider">สีอินดิเคเตอร์เม็ดสีแอนโทไซยานิน:</div>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Colored sample block */}
                          <div
                            className="w-4 h-4 rounded-md border border-[#efead9]/20 shadow-sm flex-none transition-all duration-500"
                            style={{
                              backgroundColor:
                                aiResult.phEstimate < 3.6
                                  ? '#2e7d32' // unripe green
                                  : aiResult.phEstimate < 4.3
                                  ? '#d97706' // ripening yellow-orange
                                  : aiResult.phEstimate < 5.0
                                  ? '#ea580c' // prime orange-red
                                  : '#9333ea', // spoiled purple
                            }}
                          ></div>
                          <span className="font-semibold text-[#efead9]">{aiResult.filmColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* In-Depth Recommendations block */}
                    <div className="bg-amber-500/10 border-l-4 border-amber-400 p-3.5 rounded-xl text-xs space-y-1.5 shadow-sm">
                      <div className="font-bold text-amber-300 font-serif flex items-center gap-1">
                        <span>💡</span> คำแนะนำและการเก็บเกี่ยว (FreshGuard Smart Advice)
                      </div>
                      <p className="text-amber-100/90 leading-relaxed text-[11.5px]">
                        {aiResult.recommendation}
                      </p>
                    </div>

                    {/* INTERACTIVE HOTSPOTS DETAILS PANEL (Pulsing trigger feedback) */}
                    {selectedHotspot ? (
                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs leading-relaxed space-y-1 animate-slide-up">
                        <div className="flex justify-between items-center text-[11.5px] font-bold text-emerald-300">
                          <span className="flex items-center gap-1">
                            <span>📍</span> 
                            {selectedHotspot === 'ph' && 'จุดเซนเซอร์วัดค่า pH (แอนโทไซยานิน)'}
                            {selectedHotspot === 'integrity' && 'จุดโครงสร้างความหนาแน่นโมเลกุลฟิล์ม Chitosan'}
                            {selectedHotspot === 'oil' && 'แหล่งวิเคราะห์การระเหยของสารไล่แมลงสมุนไพร'}
                          </span>
                          <button
                            onClick={() => setSelectedHotspot(null)}
                            className="text-[#6c8072] hover:text-white"
                          >
                            ปิดคาร์ด
                          </button>
                        </div>
                        <p className="text-[11px] text-[#93a89a]">
                          {selectedHotspot === 'ph' && `การเหนี่ยวนำด้วยลำแสงเลเซอร์ ตรวจวัดปฏิกิริยาเคมีของเฉดสีแอนโทไซยานินธรรมชาติที่สกัดจากกะหล่ำปลีม่วงหรืออัญชัน ผลลัพธ์บ่งบอกความเป็นกรด-ด่างที่ค่า pH ${aiResult.phEstimate.toFixed(2)} (${aiResult.stageName}) ปฏิกิริยามีเฉดสีสะท้อนที่ยอดเยี่ยม`}
                          {selectedHotspot === 'integrity' && `Chitosan-Starch Biofilm โครงสร้างระดับจุลภาคของฟิล์มชั้นกลาง ช่วยปกป้องเปลือกผลไม้ไม่ให้คายน้ำ ยับยั้งการเจริญเติบโตของเชื้อจุลินทรีย์ ตรวจวิเคราะห์ความสมบูรณ์ได้ ${aiResult.filmIntegrity}% ป้องกันการคายน้ำได้ดีเยี่ยม`}
                          {selectedHotspot === 'oil' && `จุดล็อคการระเหยของ Volatile Essential Oil (สารกานพลูและตะไคร้หอม) มีความเข้มข้นสัมบูรณ์ ${aiResult.essentialOilLevel}% ช่วยส่งกลิ่นไล่เพลี้ยแป้ง หนอนกวน และแมลงวันทองได้อย่างเสถียร โดยไม่ต้องใช้สารเคมีฆ่าแมลงอันตราย`}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-center text-[#6c8072] italic pointer-events-none">
                        💡 คำแนะนำพิเศษ: ลองคลิกจุดพิกัดเซนเซอร์กลมๆ บนภาพจำลองด้านซ้าย เพื่อดึงข้อมูลสารเคมีเชิงลึก
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Knowledge Modal */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182b21] border border-[#efead9]/20 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#efead9]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧬</span>
                <h3 className="text-lg font-bold font-serif text-[#efead9]">ข้อมูลนวัตกรรม FreshGuard Smart Biofilm</h3>
              </div>
              <button
                onClick={() => setShowKnowledgeModal(false)}
                className="text-[#93a89a] hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-[#122119] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-[#efead9]/90">
              <div className="bg-[#122119] p-4 rounded-xl border border-amber-500/20 space-y-2">
                <h4 className="font-bold text-amber-300 font-serif text-sm">โครงสร้างฟิล์มชีวภาพ 3 ชั้น (Triple Action Biofilm)</h4>
                <ul className="list-disc list-inside space-y-1 text-[#93a89a]">
                  <li><strong className="text-[#efead9]">ชั้นนอก (ป้องกันแมลง):</strong> ผสมน้ำมันหอมระเหยไล่แมลงวันทองและศัตรูพืช</li>
                  <li><strong className="text-[#efead9]">ชั้นกลาง (เกราะป้องกัน):</strong> โครงสร้างไคโตซาน + แป้ง + กลีเซอรอล ยับยั้งเชื้อรา ยืดหยุ่น ไม่แตกร้าว</li>
                  <li><strong className="text-[#efead9]">ชั้นใน (บ่งชี้ความสุก):</strong> สารสกัดแอนโทไซยานิน เปลี่ยนสีตามค่า pH และความสุก</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#122119] p-3 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400">1. ไคโตซาน (Chitosan)</div>
                  <p className="text-[#6c8072]">ยับยั้งเชื้อแบคทีเรียและเชื้อรา ย่อยสลายได้ทางชีวภาพ ยืดอายุการเก็บรักษา</p>
                </div>
                <div className="bg-[#122119] p-3 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400">2. แป้ง (Starch)</div>
                  <p className="text-[#6c8072]">เพิ่มความแข็งแรง โครงสร้างฟิล์มแน่นหนา ลดต้นทุนการผลิต</p>
                </div>
                <div className="bg-[#122119] p-3 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400">3. กลีเซอรอล (Glycerol)</div>
                  <p className="text-[#6c8072]">เพิ่มความยืดหยุ่น รองรับการขยายตัวของผลไม้ระหว่างเจริญเติบโต</p>
                </div>
                <div className="bg-[#122119] p-3 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-400">4. แอนโทไซยานิน (Anthocyanin)</div>
                  <p className="text-[#6c8072]">สารสีธรรมชาติ เปลี่ยนสีตามระดับกรด-ด่าง เพื่อแจ้งเตือนความสุก/เน่าเสีย</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}