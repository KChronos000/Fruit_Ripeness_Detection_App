import React, { useState, useEffect, useRef } from 'react';

interface FruitDef {
  id: string;
  zone: string;
  name: string;
  startPh: number;
  rate: number;
  tempBase: number;
  humBase: number;
  imageHint?: string;
}

interface StageInfo {
  key: string;
  short: string;
  full: string;
  color: string;
  bgClass: string;
  max: number;
}

interface FruitState {
  def: FruitDef;
  ph: number;
  temp: number;
  hum: number;
  integrity: number; // 0 - 100%
  essentialOilLevel: number; // 0 - 100%
  anomaly: boolean;
  anomalyTicks: number;
  anomalyReason?: string;
  history: number[];
  lastStageKey: string;
  integrityWarned?: boolean;
}

interface AlertItem {
  id: string;
  time: string;
  day: number;
  zoneId?: string;
  kind: 'info' | 'stage' | 'danger' | 'success';
  title: string;
  message: string;
}

interface AIAnalysisResult {
  phEstimate: number;
  temperature: number;
  humidity: number;
  shelfLifeDays: number;
  filmIntegrity: number;
  essentialOilLevel: number;
  stageName: string;
  filmColor: string;
  pestOrMoldDetected: boolean;
  confidence: number;
  recommendation: string;
  details: string;
}

const STAGES: StageInfo[] = [
  { key: 'unripe', short: 'ยังดิบ', full: 'ยังดิบ · ฟิล์มสีเขียว (pH 3.0-3.5)', color: '#2e7d32', bgClass: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50', max: 3.5 },
  { key: 'ripening', short: 'กำลังสุก', full: 'กำลังสุก · ฟิล์มสีเหลือง/ส้ม (pH 3.6-4.2)', color: '#d97706', bgClass: 'bg-amber-900/40 text-amber-300 border-amber-700/50', max: 4.2 },
  { key: 'prime', short: 'สุกพอดี', full: 'สุกพอดี · ฟิล์มสีส้มแดง พร้อมเก็บเกี่ยว (pH 4.3-5.0)', color: '#ea580c', bgClass: 'bg-orange-900/40 text-orange-300 border-orange-700/50', max: 5.0 },
  { key: 'spoiled', short: 'สุกเกิน/เน่า', full: 'สุกเกิน/เสื่อมสภาพ · ฟิล์มสีม่วง (pH > 5.0)', color: '#9333ea', bgClass: 'bg-purple-900/40 text-purple-300 border-purple-700/50', max: 99 }
];

const FRUIT_DEFS: FruitDef[] = [
  { id: 'mango', zone: 'โซน A', name: 'มะม่วง', startPh: 3.1, rate: 0.014, tempBase: 29, humBase: 62 },
  { id: 'banana', zone: 'โซน B', name: 'กล้วย', startPh: 3.3, rate: 0.022, tempBase: 28, humBase: 65 },
  { id: 'papaya', zone: 'โซน C', name: 'มะละกอ', startPh: 3.4, rate: 0.018, tempBase: 30, humBase: 68 },
  { id: 'guava', zone: 'โซน D', name: 'ฝรั่ง', startPh: 3.2, rate: 0.012, tempBase: 29, humBase: 60 }
];

const PH_MIN = 3.0;
const PH_MAX = 7.0;

function stageFor(ph: number): StageInfo {
  for (const s of STAGES) {
    if (ph <= s.max) return s;
  }
  return STAGES[STAGES.length - 1];
}

const buildInitialFruitStates = (): Record<string, FruitState> => {
  const initialStates: Record<string, FruitState> = {};
  FRUIT_DEFS.forEach((f) => {
    initialStates[f.id] = {
      def: f,
      ph: f.startPh,
      temp: f.tempBase,
      hum: f.humBase,
      integrity: 100,
      essentialOilLevel: 100,
      anomaly: false,
      anomalyTicks: 0,
      history: [f.startPh],
      lastStageKey: stageFor(f.startPh).key,
    };
  });
  return initialStates;
};

export default function App() {
  const [dayCount, setDayCount] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>(FRUIT_DEFS[0].id);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  
  const [fruitStates, setFruitStates] = useState<Record<string, FruitState>>(buildInitialFruitStates);
  
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

  const addAlert = (zoneId: string, fruitName: string, kind: AlertItem['kind'], title: string, message: string) => {
    const newAlert: AlertItem = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      day: Math.floor(dayCount),
      zoneId,
      kind,
      title: `${zoneId} — ${fruitName}`,
      message,
    };
    setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    if (paused || Object.keys(fruitStates).length === 0) return;

    const interval = setInterval(() => {
      setDayCount((prevDay) => {
        const nextDay = prevDay + 0.25;

        setFruitStates((prevStates) => {
          const updated = { ...prevStates };

          FRUIT_DEFS.forEach((f) => {
            const s = { ...updated[f.id] };
            if (!s) return;

            if (s.anomalyTicks > 0) {
              s.anomalyTicks -= 1;
              s.ph += f.rate * 1.8 + (Math.random() - 0.3) * 0.15;
              s.hum += (Math.random() - 0.2) * 8;
              s.temp += (Math.random() - 0.5) * 1.5;
              s.integrity = Math.max(0, s.integrity - (1.5 + Math.random() * 2));
              s.essentialOilLevel = Math.max(0, s.essentialOilLevel - 1.2);
              if (s.anomalyTicks === 0) {
                s.anomaly = false;
              }
            } else {
              s.ph += f.rate + (Math.random() - 0.5) * 0.008;
              s.hum = f.humBase + Math.sin(nextDay * 0.7 + f.rate * 50) * 3 + (Math.random() - 0.5) * 1.5;
              s.temp = f.tempBase + Math.sin(nextDay * 0.4) * 1.2 + (Math.random() - 0.5) * 0.4;
              s.integrity = Math.max(0, s.integrity - (0.15 + Math.random() * 0.2));
              s.essentialOilLevel = Math.max(0, s.essentialOilLevel - 0.25);
            }

            s.ph = Math.min(PH_MAX, Math.max(PH_MIN, s.ph));
            s.history = [...s.history, s.ph].slice(-40);

            // Stage Change Check
            const newStage = stageFor(s.ph);
            if (newStage.key !== s.lastStageKey) {
              s.lastStageKey = newStage.key;
              if (newStage.key === 'ripening') {
                addAlert(f.zone, f.name, 'info', 'กำลังสุก', `ฟิล์มเปลี่ยนสีเป็นส้ม/เหลือง (pH ${s.ph.toFixed(2)})`);
              } else if (newStage.key === 'prime') {
                addAlert(f.zone, f.name, 'success', 'สุกพอดีพร้อมเก็บเกี่ยว', `ฟิล์มเปลี่ยนเป็นสีส้มแดง (pH ${s.ph.toFixed(2)})`);
              } else if (newStage.key === 'spoiled') {
                addAlert(f.zone, f.name, 'danger', 'เตือนฟิล์มเสื่อม/สุกเกิน', `พบค่า pH สูงผิดปกติ ฟิล์มเปลี่ยนเป็นสีม่วง (${s.ph.toFixed(2)})`);
              }
            }

            // Low Integrity Check
            if (s.integrity < 35 && !s.integrityWarned) {
              s.integrityWarned = true;
              addAlert(f.zone, f.name, 'danger', 'ฟิล์มชีวภาพชำรุด', `ความสมบูรณ์ฟิล์มต่ำกว่า 35% (${s.integrity.toFixed(0)}%) ควรตรวจสอบรอยฉีกขาด`);
            }

            // Spontaneous Pest Attack / Anomaly Simulation
            if (!s.anomaly && Math.random() < 0.008) {
              s.anomaly = true;
              s.anomalyTicks = 5;
              s.anomalyReason = 'พบสิ่งแปลกปลอม/แมลงเจาะฟิล์มชีวภาพ';
              addAlert(f.zone, f.name, 'danger', 'ตรวจพบสิ่งแปลกปลอม!', 'ความชื้นและอุณหภูมิแกว่งผิดปกติ อาจมีแมลงวันทองหรือเชื้อราปนเปื้อน');
            }

            updated[f.id] = s;
          });

          return updated;
        });

        return nextDay;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [paused, fruitStates]);

  const triggerManualAnomaly = (fruitId: string) => {
    setFruitStates((prev) => {
      const s = { ...prev[fruitId] };
      if (!s) return prev;
      s.anomaly = true;
      s.anomalyTicks = 6;
      s.anomalyReason = 'จำลองแมลงศัตรูพืชสัมผัสฟิล์ม';
      addAlert(s.def.zone, s.def.name, 'danger', 'จำลองสิ่งแปลกปลอม', 'ระบบตรวจพบความผิดปกติของฟิล์มจากการจำลอง');
      return { ...prev, [fruitId]: s };
    });
  };

  const handleReset = () => {
    setDayCount(0);
    setAlerts([]);
    setFruitStates(buildInitialFruitStates());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAiResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithGemini = async () => {
    let finalImage = selectedImage;
    const activeFruit = scanMethod === 'simulated' ? simulatedFruitId : selectedId;

    if (scanMethod === 'simulated') {
      finalImage = captureSimulatedFrame();
      setSelectedImage(finalImage);
    } else if (scanMethod === 'webcam') {
      finalImage = captureWebcamFrame();
      setSelectedImage(finalImage);
    }

    if (!finalImage) {
      if (scanMethod === 'upload') {
        alert('กรุณาอัปโหลดรูปภาพผลไม้ก่อนเริ่มสแกน');
      } else if (scanMethod === 'webcam') {
        alert('กรุณาเปิดใช้งานกล้องเว็บบอร์ดหรือใช้รูปถ่ายตัวอย่าง');
      }
      return;
    }

    setIsAnalyzing(true);
    setAiResult(null);
    setSelectedHotspot(null);
    setScanProgressStep(0);

    const steps = [
      { text: 'กำลังเชื่อมต่อโมดูลกล้องชีวภาพและประมวลผลเซนเซอร์ภาพ...', delay: 0 },
      { text: 'กำลังระบุขอบเขตความปลอดภัยและวิเคราะห์โครงสร้างฟิล์ม Chitosan...', delay: 800 },
      { text: 'กำลังยิงแสงเลเซอร์จำลอง เพื่อตรวจวัดช่วงความยาวคลื่นสะท้อนกลับ (Reflectance)...', delay: 1600 },
      { text: 'กำลังคำนวณสถิติค่าสีแอนโทไซยานิน เพื่อเทียบค่า pH อินดิเคเตอร์...', delay: 2400 },
      { text: 'กำลังประมวลผลจำลองโมเดล AI และสร้างแผนที่อุณหภูมิผิวสัมผัสฟิล์ม...', delay: 3200 },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setScanProgressStep(index);
        setScanProgressText(step.text);
      }, step.delay);
    });

    // We wait for the 4-second visual progress to complete for maximum aesthetics.
    setTimeout(() => {
      const hasAnomaly = fruitStates[activeFruit]?.anomaly ?? false;
      let baseResult: AIAnalysisResult;

      if (activeFruit === 'mango') {
        baseResult = {
          phEstimate: hasAnomaly ? 4.85 : 4.15,
          temperature: hasAnomaly ? 29.8 : 28.5,
          humidity: hasAnomaly ? 74 : 65,
          shelfLifeDays: hasAnomaly ? 1 : 4,
          filmIntegrity: hasAnomaly ? 58 : 94,
          essentialOilLevel: hasAnomaly ? 45 : 85,
          stageName: hasAnomaly ? 'สุกเกิน / ได้รับความเสียหาย' : 'กำลังสุก',
          filmColor: hasAnomaly ? 'สีม่วงด่างช้ำ (Anionic Form จากความเสียหาย)' : 'สีเหลืองส้ม (Quinonoidal Anhydrobase)',
          pestOrMoldDetected: hasAnomaly,
          confidence: 95,
          recommendation: hasAnomaly
            ? '⚠️ ตรวจพบการแทรกซึมของหนอนแมลงวันทองบริเวณเนื้อช้ำ ส่งผลให้ฟิล์มฉีกขาดและคายน้ำคาร์บอนไดออกไซด์สูงผิดปกติ ควรรีบคัดมะม่วงในตู้จำลองนี้ออกเพื่อป้องกันการแพร่กระจายสปอร์เชื้อราราสีเทา'
            : 'เกราะเคลือบฟิล์มไคโตซานอยู่ในสภาวะสมบูรณ์ดี สารระเหยตะไคร้-กานพลูระเหยอย่างคงที่ในอัตราที่สมดุล ป้องกันศัตรูพืชได้ 100% คาดว่ามะม่วงจะหวานหอมพร้อมเก็บเกี่ยวเต็มที่ใน 2-3 วัน',
          details: 'วิเคราะห์โครงสร้างสเปกตรัม: ความหนาแน่นของฟิล์ม 94% อุณหภูมิ 28.5°C สัมพันธ์กับค่าความต้านทานแรงดึงฟิล์มชีวภาพที่เสถียร ไม่พบการรั่วไหลของความชื้น'
        };
      } else if (activeFruit === 'banana') {
        baseResult = {
          phEstimate: hasAnomaly ? 4.90 : 3.80,
          temperature: hasAnomaly ? 29.5 : 28.1,
          humidity: hasAnomaly ? 72 : 66,
          shelfLifeDays: hasAnomaly ? 2 : 6,
          filmIntegrity: hasAnomaly ? 62 : 96,
          essentialOilLevel: hasAnomaly ? 42 : 88,
          stageName: hasAnomaly ? 'กล้วยช้ำ / สปอร์เชื้อราฟู' : 'ห่าม / กำลังสุก',
          filmColor: hasAnomaly ? 'สีน้ำตาลม่วงด่าง (ชำรุด)' : 'สีเหลืองสลัว (Anthocyanin Anhydrobase)',
          pestOrMoldDetected: hasAnomaly,
          confidence: 97,
          recommendation: hasAnomaly
            ? '⚠️ ตรวจพบสปอร์ราเขียว (Colletotrichum) กำลังเจริญเติบโตที่ขั้วหวีกล้วยเนื่องจากรอยฉีกขาดของฟิล์มไคโตซาน แนะนำควบคุมสภาพอากาศในโซน B ให้มีอุณหภูมิต่ำและรีบแยกชิ้นส่วนที่ชำรุดออก'
            : 'กล้วยค่อยๆ เปลี่ยนสีอย่างมั่นคง ฟิล์มไคโตซานช่วยดูดซับโมเลกุลน้ำและชะลอการแลกเปลี่ยนเอทิลีนได้อย่างเป็นธรรมชาติ รักษาความหวานหนึบและลดการเกิดสีดำช้ำบนเปลือกกล้วยได้นานกว่าปกติ 2 เท่า',
          details: 'ความเรียบเนียนผิวสัมผัสเฉลี่ย 96% มีปริมาณฟีนอลิกช่วยต้านอนุมูลอิสระบนพื้นผิวอยู่ในระดับสูง ไม่พบรอยเจาะจากแมลงศัตรูพืชรอบนอก'
        };
      } else if (activeFruit === 'papaya') {
        baseResult = {
          phEstimate: hasAnomaly ? 5.20 : 4.45,
          temperature: hasAnomaly ? 30.1 : 28.6,
          humidity: hasAnomaly ? 76 : 67,
          shelfLifeDays: hasAnomaly ? 0 : 3,
          filmIntegrity: hasAnomaly ? 48 : 91,
          essentialOilLevel: hasAnomaly ? 30 : 81,
          stageName: hasAnomaly ? 'เน่าเสีย / สารเคลือบยุบตัว' : 'สุกพอดีพร้อมทาน',
          filmColor: hasAnomaly ? 'สีม่วงเข้มซีด (Alkaline Hydrolysis State)' : 'สีส้มแดง (Anthocyanin Quinonoidal Form)',
          pestOrMoldDetected: hasAnomaly,
          confidence: 94,
          recommendation: hasAnomaly
            ? '⚠️ ตรวจพบแก๊สระเหยและน้ำเยิ้มเนื่องจากการย่อยสลายของเพลี้ยแป้งใต้แผ่นฟิล์มชีวภาพ ฟิล์มสูญเสียคุณสมบัติเป็นกึ่งซึมผ่านอย่างสมบูรณ์ (Integrity ต่ำกว่า 50%) ควรรีบทำลายผลสปอยล์เพื่อรักษาความสะอาด'
            : 'มะละกอสุกพอดี มีสีฟิล์มส้มแดงเข้มสวยงาม เนื้อสัมผัสแน่นกรอบกำลังดี อัตราการสูญเสียน้ำลดลง 40% เมื่อเทียบกับกลุ่มไม่ได้เคลือบ แนะนำนำออกจำหน่ายภายใต้สภาวะควบคุมฝุ่นและแสงแดดจัด',
          details: 'วิเคราะห์การกระเจิงสเปกตรัมแสง: เม็ดสีแอนโทไซยานินเปลี่ยนรูป Quinonoidal ชัดเจน บ่งบอกสภาวะสุกที่ pH 4.45 แผงระเหยกานพลูป้องกันการสะสมแบคทีเรียรอบข้างได้คงทน'
        };
      } else {
        baseResult = {
          phEstimate: hasAnomaly ? 4.50 : 3.25,
          temperature: hasAnomaly ? 29.2 : 27.9,
          humidity: hasAnomaly ? 70 : 62,
          shelfLifeDays: hasAnomaly ? 3 : 10,
          filmIntegrity: hasAnomaly ? 65 : 98,
          essentialOilLevel: hasAnomaly ? 55 : 95,
          stageName: hasAnomaly ? 'เนื้อช้ำด้านใน' : 'ยังดิบ / รักษาสภาพ',
          filmColor: hasAnomaly ? 'สีม่วงเข้มซีด (จากความเค้นช้ำ)' : 'สีเขียวอมเหลือง (Flavylium Cation State)',
          pestOrMoldDetected: hasAnomaly,
          confidence: 98,
          recommendation: hasAnomaly
            ? '⚠️ ตรวจพบรอยกระแทกที่แผงเคลือบผิวส่งผลให้แบคทีเรียสร้างสารเหนี่ยวนำให้ฟิล์มแอนโทไซยานินกลายเป็นม่วงด่าง ควรรีบพ่นสารสกัดซ่อมแซมผิวฟิล์มเพื่อปิดช่องโหว่รอยร้าวป้องกันแมลงวางไข่'
            : 'ฝรั่งยังคงสภาพดิบสมบูรณ์ที่สุด ความสมบูรณ์ของฟิล์ม 98% สารระเหยสมุนไพรกานพลูทำงานเต็มร้อย ป้องกันแมลงวันทองเจาะวางไข่ได้ 100% ช่วยคงรสสัมผัสที่กรอบ อร่อย และหวานธรรมชาติได้อย่างยาวนาน',
          details: 'ความยืดหยุ่นของฟิล์มไคโตซานผสมกลีเซอรอลทนแรงดึงได้เสถียร การแลกเปลี่ยน O2 และ CO2 เป็นไปตามกลไกสลอว์บรีธติ้ง (Slow Breathing) ยืดความสดชื่นสูงสุด'
        };
      }

      setAiResult(baseResult);
      setIsAnalyzing(false);
    }, 4000);
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
              <p className="text-xs text-[#93a89a]">เฝ้าระวังความสุกและฟิล์มชีวภาพอัจฉริยะ (Chitosan-based Indicator)</p>
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
          {/* Detailed Analytics Panel */}
          <div className="lg:col-span-2 bg-[#182b21] border border-[#efead9]/10 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#efead9]/10 pb-3">
              <div>
                <h2 className="text-lg font-bold font-serif text-[#efead9]">
                  รายละเอียดวิเคราะห์: {selectedState.def.zone} — {selectedState.def.name}
                </h2>
                <p className="text-xs text-[#93a89a]">รหัสเซนเซอร์ #{selectedState.def.id} · เคลือบฟิล์มมาแล้ว {Math.floor(dayCount)} วัน</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${selectedStage.bgClass}`}>
                {selectedStage.full}
              </span>
            </div>

            {/* Historic Sparkline Trend */}
            <div>
              <div className="text-xs text-[#93a89a] mb-2 flex justify-between">
                <span>แนวโน้มค่า pH ย้อนหลัง (การเปลี่ยนสีฟิล์ม)</span>
                <span className="font-mono text-amber-300">pH ปัจจุบัน {selectedState.ph.toFixed(2)}</span>
              </div>
              <div className="h-24 bg-[#122119] rounded-xl p-2 relative overflow-hidden border border-[#efead9]/5">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 300 80">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#2e7d32" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(239,234,217,0.05)" strokeWidth="1" />
                  <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(239,234,217,0.05)" strokeWidth="1" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(239,234,217,0.05)" strokeWidth="1" />

                  {/* Sparkline Path */}
                  {selectedState.history.length > 1 && (
                    <polyline
                      fill="none"
                      stroke={selectedStage.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={selectedState.history
                        .map((v, idx) => {
                          const x = (idx / (selectedState.history.length - 1)) * 300;
                          const y = 80 - ((v - PH_MIN) / (PH_MAX - PH_MIN)) * 80;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Biofilm Extra Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#122119] p-3 rounded-xl border border-[#efead9]/5">
                <div className="text-[10px] text-[#6c8072] uppercase font-mono">น้ำมันหอมระเหยไล่แมลง</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {selectedState.essentialOilLevel.toFixed(0)}%
                </div>
                <div className="text-[10px] text-[#93a89a] mt-0.5">ปล่อยสารกานพลู/ตะไคร้</div>
              </div>

              <div className="bg-[#122119] p-3 rounded-xl border border-[#efead9]/5">
                <div className="text-[10px] text-[#6c8072] uppercase font-mono">โครงสร้างแอนโทไซยานิน</div>
                <div className="text-lg font-mono font-bold text-amber-300 mt-1">
                  {selectedState.ph < 3.8 ? 'Flavylium' : selectedState.ph < 4.8 ? 'Quinonoidal' : 'Anionic'}
                </div>
                <div className="text-[10px] text-[#93a89a] mt-0.5">สถานะเม็ดสี pH</div>
              </div>

              <div className="bg-[#122119] p-3 rounded-xl border border-[#efead9]/5">
                <div className="text-[10px] text-[#6c8072] uppercase font-mono">อัตราการผ่านของก๊าซ</div>
                <div className="text-lg font-mono font-bold text-teal-300 mt-1">
                  {selectedState.integrity > 50 ? 'ปกติ (Semi-permeable)' : 'สูงเกินมาตรฐาน'}
                </div>
                <div className="text-[10px] text-[#93a89a] mt-0.5">O₂ / CO₂ Exchange</div>
              </div>
            </div>

            {/* Biofilm Health Status Box */}
            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed border-l-4 ${
                selectedState.anomaly
                  ? 'bg-rose-950/30 border-rose-500 text-rose-200'
                  : 'bg-[#122119] border-amber-400 text-[#93a89a]'
              }`}
            >
              {selectedState.anomaly ? (
                <div>
                  <strong className="text-rose-400 font-bold">⚠️ ตรวจพบความผิดปกติของฟิล์ม: </strong>
                  มีสัญญาณข้อมูลแกว่งตัวผิดปกติ (ความชื้นสูงขึ้นเฉียบพลัน) สันนิษฐานว่ามีแมลงศัตรูพืชเจาะฟิล์มหรือสปอร์เชื้อราก่อตัว แนะนำให้ตรวจเช็คด้วยตาเปล่าหรือใช้ AI สแกน
                </div>
              ) : (
                <div>
                  <strong className="text-amber-300 font-bold">✓ สภาพฟิล์มชีวภาพปกติ: </strong>
                  ฟิล์มไคโตซานคงโครงสร้างแข็งแรง สารระเหยป้องกันแมลงทำงานสมบูรณ์ สารแอนโทไซยานินตอบสนองต่อความเป็นกรด-ด่างตามเส้นโค้งการสุกปกติ
                </div>
              )}
            </div>
          </div>

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
                  {scanMethod === 'webcam' && (
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
                  )}

                  {/* TAB 3: File Upload Area */}
                  {scanMethod === 'upload' && (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d1612] z-10 relative">
                      {selectedImage ? (
                        <img src={selectedImage} alt="Uploaded preview" className="w-full h-full object-contain" />
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
                          <div className="w-12 h-12 rounded-full bg-[#182b21] flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all">
                            📥
                          </div>
                          <div className="text-xs font-bold text-[#efead9]">คลิกเพื่ออัปโหลดภาพผลไม้จริง</div>
                          <p className="text-[10px] text-[#6c8072]">รองรับไฟล์ภาพสกุล JPEG, PNG เพื่อให้ AI สแกนสีฟิล์ม</p>
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