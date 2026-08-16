import type { StageInfo, FruitDef } from '@/types/fruits';

export const PH_MIN = 1.0;
export const PH_MAX = 8.0;

export const STAGES: StageInfo[] = [
  {
    key: 'unripe',
    short: 'ยังดิบ',
    full: 'ยังดิบ · ฟิล์มสีแดง (pH 1.0-3.0)',
    color: '#dc2626',
    bgClass: 'bg-red-900/40 text-red-300 border-red-700/50',
    max: 3.0,
  },
  {
    key: 'ripening',
    short: 'กำลังสุก',
    full: 'กำลังสุก · ฟิล์มสีแดงอ่อน/ชมพู (pH 3.1-4.0)',
    color: '#ff6262',
    bgClass: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
    max: 4.0,
  },
  {
    key: 'prime',
    short: 'สุกพอดี',
    full: 'สุกพอดี พร้อมเก็บเกี่ยว · ฟิล์มสีส้ม (pH 4.1-5.0)',
    color: '#ea580c',
    bgClass: 'bg-orange-900/50 text-orange-200 border-orange-600/50',
    max: 5.0,
  },
  {
    key: 'spoiled',
    short: 'เริ่มเน่าเสีย',
    full: 'เริ่มเน่าเสีย รีบเก็บด่วน · ฟิล์มสีฟ้าม่วง (pH > 5.0)',
    color: '#8b5cf6',
    bgClass: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
    max: 99,
  },
];

export const FRUIT_DEFS: FruitDef[] = [
  { id: 'mango',  zone: 'โซน A', name: 'ฝรั่ง', startPh: 1.5, rate: 0.014, tempBase: 29, humBase: 62 },
  { id: 'banana', zone: 'โซน B', name: 'ฝรั่ง',  startPh: 2.0, rate: 0.022, tempBase: 28, humBase: 65 },
  { id: 'papaya', zone: 'โซน C', name: 'ฝรั่ง', startPh: 2.2, rate: 0.018, tempBase: 30, humBase: 68 },
  { id: 'guava',  zone: 'โซน D', name: 'ฝรั่ง',   startPh: 1.8, rate: 0.012, tempBase: 29, humBase: 60 },
];

// Utility Helper Function สำหรับหา Stage จากค่า pH
export function stageFor(ph: number): StageInfo {
  for (const s of STAGES) {
    if (ph <= s.max) return s;
  }
  return STAGES[STAGES.length - 1];
}