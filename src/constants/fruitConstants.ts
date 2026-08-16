import type { StageInfo, FruitDef } from '@/types/fruits';

export const PH_MIN = 3.0;
export const PH_MAX = 7.0;

export const STAGES: StageInfo[] = [
  { key: 'unripe', short: 'ยังดิบ', full: 'ยังดิบ · ฟิล์มสีเขียว (pH 3.0-3.5)', color: '#2e7d32', bgClass: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50', max: 3.5 },
  { key: 'ripening', short: 'กำลังสุก', full: 'กำลังสุก · ฟิล์มสีเหลือง/ส้ม (pH 3.6-4.2)', color: '#d97706', bgClass: 'bg-amber-900/40 text-amber-300 border-amber-700/50', max: 4.2 },
  { key: 'prime', short: 'สุกพอดี', full: 'สุกพอดี · ฟิล์มสีส้มแดง พร้อมเก็บเกี่ยว (pH 4.3-5.0)', color: '#ea580c', bgClass: 'bg-orange-900/40 text-orange-300 border-orange-700/50', max: 5.0 },
  { key: 'spoiled', short: 'สุกเกิน/เน่า', full: 'สุกเกิน/เสื่อมสภาพ · ฟิล์มสีม่วง (pH > 5.0)', color: '#9333ea', bgClass: 'bg-purple-900/40 text-purple-300 border-purple-700/50', max: 99 }
];

export const FRUIT_DEFS: FruitDef[] = [
  { id: 'mango', zone: 'โซน A', name: 'มะม่วง', startPh: 3.1, rate: 0.014, tempBase: 29, humBase: 62 },
  { id: 'banana', zone: 'โซน B', name: 'กล้วย', startPh: 3.3, rate: 0.022, tempBase: 28, humBase: 65 },
  { id: 'papaya', zone: 'โซน C', name: 'มะละกอ', startPh: 3.4, rate: 0.018, tempBase: 30, humBase: 68 },
  { id: 'guava', zone: 'โซน D', name: 'ฝรั่ง', startPh: 3.2, rate: 0.012, tempBase: 29, humBase: 60 }
];

// Utility Helper Function สำหรับหา Stage จากค่า pH
export function stageFor(ph: number): StageInfo {
  for (const s of STAGES) {
    if (ph <= s.max) return s;
  }
  return STAGES[STAGES.length - 1];
}