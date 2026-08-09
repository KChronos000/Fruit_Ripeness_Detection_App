import { useState, useEffect } from 'react'
import filmImg from '@/imports/image-3.png'

// ── Types ──────────────────────────────────────────────────────────────────────
type RipenessLevel = 'unripe' | 'maturing' | 'ripe' | 'overripe'
type Page = 'home' | 'scan' | 'zones' | 'about'

interface ZoneData {
  id: string
  fruit: string
  ripeness: number
  level: RipenessLevel
  filmColor: string
  filmHex: string
  temp: number
  humidity: number
  hasTamper: boolean
  daysAgo: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<RipenessLevel, { label: string; color: string; bg: string; border: string; advice: string; icon: string }> = {
  unripe:   { label: 'ยังดิบ',      color: '#2d7a3a', bg: '#e8f5e9', border: '#a5d6a7', advice: 'รออีก 5–8 วัน',         icon: '🟢' },
  maturing: { label: 'กำลังสุก',   color: '#b45309', bg: '#fef9c3', border: '#fde68a', advice: 'อีก 2–3 วันพร้อมเก็บ', icon: '🟡' },
  ripe:     { label: 'สุกพอดี ✓',  color: '#c2410c', bg: '#fff7ed', border: '#fdba74', advice: 'เก็บเกี่ยวได้ทันที',    icon: '🟠' },
  overripe: { label: 'สุกเกิน !',  color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', advice: 'เก็บด่วน คุณภาพลดลง', icon: '🔴' },
}

function levelFromPct(p: number): RipenessLevel {
  if (p < 35) return 'unripe'
  if (p < 65) return 'maturing'
  if (p < 88) return 'ripe'
  return 'overripe'
}

const ZONES: ZoneData[] = [
  { id: 'A', fruit: 'มะม่วง',   ripeness: 78, level: 'ripe',     filmColor: 'ส้ม',       filmHex: '#fb923c', temp: 32.4, humidity: 68, hasTamper: true,  daysAgo: 0 },
  { id: 'B', fruit: 'กล้วย',    ripeness: 92, level: 'overripe', filmColor: 'แดงเข้ม',   filmHex: '#dc2626', temp: 30.1, humidity: 74, hasTamper: false, daysAgo: 0 },
  { id: 'C', fruit: 'สับปะรด', ripeness: 44, level: 'maturing', filmColor: 'เหลืองทอง', filmHex: '#eab308', temp: 28.7, humidity: 61, hasTamper: false, daysAgo: 1 },
  { id: 'D', fruit: 'มังคุด',  ripeness: 19, level: 'unripe',   filmColor: 'เขียว',     filmHex: '#22c55e', temp: 27.3, humidity: 55, hasTamper: false, daysAgo: 1 },
]

// ── Film color strip visual ───────────────────────────────────────────────────
function FilmStrip({ level }: { level: RipenessLevel }) {
  const colors: Record<RipenessLevel, string[]> = {
    unripe:   ['#86efac','#4ade80','#22c55e','#16a34a','#15803d'],
    maturing: ['#fef08a','#facc15','#eab308','#ca8a04','#a16207'],
    ripe:     ['#fdba74','#fb923c','#f97316','#ea580c','#c2410c'],
    overripe: ['#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c'],
  }
  const strips = colors[level]
  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 20, gap: 1 }}>
      {strips.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  )
}

// ── Ripeness circle gauge ─────────────────────────────────────────────────────
function RipenessCircle({ pct, level, size = 100 }: { pct: number; level: RipenessLevel; size?: number }) {
  const cfg = LEVEL_CONFIG[level]
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cfg.color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color: cfg.color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: size * 0.11, color: '#6b7280' }}>%</span>
      </div>
    </div>
  )
}

// ── Zone card ─────────────────────────────────────────────────────────────────
function ZoneCard({ zone, onClick }: { zone: ZoneData; onClick: () => void }) {
  const cfg = LEVEL_CONFIG[zone.level]
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: '#fff', border: `1.5px solid ${cfg.border}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e2d1f' }}>โซน {zone.id} — {zone.fruit}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{zone.daysAgo === 0 ? 'วันนี้' : `${zone.daysAgo} วันที่แล้ว`}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ padding: '4px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, border: `1px solid ${cfg.border}` }}>{cfg.icon} {cfg.label}</div>
          {zone.hasTamper && <div style={{ padding: '3px 8px', borderRadius: 99, background: '#faf5ff', color: '#7c3aed', fontSize: 11, border: '1px solid #ddd6fe' }}>⚠ ตรวจพบสิ่งแปลกปลอม</div>}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 10, background: '#f3f4f6', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${zone.ripeness}%`, background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: zone.filmHex }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>ฟิล์ม: {zone.filmColor}</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color, fontFamily: 'Outfit, sans-serif' }}>{zone.ripeness}%</span>
      </div>
      <div style={{ marginTop: 10, padding: '8px 12px', background: cfg.bg, borderRadius: 8, fontSize: 13, color: cfg.color, fontWeight: 500 }}>
        💡 {cfg.advice}
      </div>
    </button>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function ZoneDetail({ zone, onClose }: { zone: ZoneData; onClose: () => void }) {
  const cfg = LEVEL_CONFIG[zone.level]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div className="fade-in" style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 500 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 99, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>โซน {zone.id} — {zone.fruit}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>สถานะฟิล์ม: <span style={{ color: zone.filmHex, fontWeight: 600 }}>● {zone.filmColor}</span></div>
          </div>
          <RipenessCircle pct={zone.ripeness} level={zone.level} size={80} />
        </div>

        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>{cfg.icon} {cfg.label}</div>
          <div style={{ fontSize: 14, color: cfg.color }}>คำแนะนำ: {cfg.advice}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: '🌡 อุณหภูมิ', value: `${zone.temp} °C` },
            { label: '💧 ความชื้น', value: `${zone.humidity}%` },
          ].map(s => (
            <div key={s.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Film color strip */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>แถบสีฟิล์มปัจจุบัน</div>
          <FilmStrip level={zone.level} />
        </div>

        {zone.hasTamper && (
          <div style={{ padding: '12px 14px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>⚠ ตรวจพบสิ่งแปลกปลอม</div>
            <div style={{ fontSize: 13, color: '#6b21a8' }}>พบวัตถุต่างถิ่นบนฟิล์ม กรุณาตรวจสอบด้วยตาเปล่า</div>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2d7a3a', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}>
          ปิด
        </button>
      </div>
    </div>
  )
}

// ── Camera / AI scan page ─────────────────────────────────────────────────────
function ScanPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'ready' | 'analyzing' | 'result'>('ready')
  const [result, setResult] = useState<{ pct: number; level: RipenessLevel; confidence: number } | null>(null)
  const [progress, setProgress] = useState(0)

  function analyze() {
    setStep('analyzing')
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 5
      })
    }, 100)
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      const pct = Math.round(30 + Math.random() * 60)
      setResult({ pct, level: levelFromPct(pct), confidence: Math.round(87 + Math.random() * 11) })
      setStep('result')
    }, 2200)
  }

  function reset() { setStep('ready'); setResult(null); setProgress(0) }

  const cfg = result ? LEVEL_CONFIG[result.level] : null

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 99, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>สแกนฟิล์ม AI</div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
        {step === 'ready' && (
          <div className="fade-in">
            {/* Viewfinder */}
            <div style={{ background: '#1e2d1f', borderRadius: 20, overflow: 'hidden', marginBottom: 24, position: 'relative', aspectRatio: '4/3' }}>
              <img
                src="https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=500&h=375&fit=crop&auto=format"
                alt="กล้องสำหรับถ่ายฟิล์ม"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
              />
              {/* Crosshair */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 150, height: 100, border: '2px solid #4ade80', borderRadius: 8 }} />
              </div>
              <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '4px 10px', color: '#4ade80', fontSize: 12, fontFamily: 'Outfit, sans-serif' }}>
                📷 จัดฟิล์มให้อยู่ในกรอบ
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>วิธีถ่ายภาพให้ได้ผลดี</div>
              {['แสงสว่างเพียงพอ ไม่มีเงา', 'ฟิล์มอยู่ห่างจากกล้อง 15–20 ซม.', 'ถือนิ่ง ไม่เขย่า', 'ถ่ายฝั่งที่มีสีเปลี่ยนชัดเจน'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 99, background: '#e8f5e9', color: '#2d7a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                  <span style={{ fontSize: 14, color: '#374151' }}>{tip}</span>
                </div>
              ))}
            </div>

            <button onClick={analyze} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#2d7a3a', color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📷</span> วิเคราะห์ฟิล์ม
            </button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }} className="spin">🔍</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>AI กำลังวิเคราะห์...</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>ประมวลผลสีฟิล์ม · ตรวจสอบสิ่งแปลกปลอม</div>
            {/* Progress bar */}
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#2d7a3a', borderRadius: 99, transition: 'width 0.1s linear' }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280', fontFamily: 'Outfit, sans-serif' }}>{progress}%</div>
          </div>
        )}

        {step === 'result' && result && cfg && (
          <div className="fade-in">
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', marginBottom: 16, border: `2px solid ${cfg.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{cfg.icon}</div>
                <RipenessCircle pct={result.pct} level={result.level} size={120} />
                <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>ความมั่นใจ AI: <strong style={{ color: '#2d7a3a' }}>{result.confidence}%</strong></div>
              </div>

              <div style={{ background: cfg.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: cfg.color, marginBottom: 4 }}>คำแนะนำ</div>
                <div style={{ fontSize: 15, color: cfg.color }}>{cfg.advice}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>ช่วงสีฟิล์ม</div>
                <FilmStrip level={result.level} />
              </div>

              <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                ระดับความสุกอ้างอิงจากค่า pH ของฟิล์มไคโตซาน
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={reset} style={{ padding: '14px', borderRadius: 12, border: '1.5px solid #2d7a3a', background: '#fff', color: '#2d7a3a', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}>
                สแกนอีกครั้ง
              </button>
              <button onClick={onBack} style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#2d7a3a', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}>
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── About page ────────────────────────────────────────────────────────────────
function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 99, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>เกี่ยวกับโครงงาน</div>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
        {/* Film image */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '1px solid #e5e7eb' }}>
          <img src={filmImg} alt="ฟิล์มชีวภาพจากไคโตซานและแป้งธรรมชาติ" style={{ width: '100%', display: 'block' }} />
        </div>

        {/* Title */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e2d1f', marginBottom: 8 }}>ฟิล์มชีวภาพจากไคโตซานและแป้งธรรมชาติ</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            ฟิล์มย่อยสลายได้ที่ช่วยชะลอการเน่าเสียของผลไม้ โดยเปลี่ยนสีเมื่อผลไม้เริ่มสุกหรือเน่าเสีย ปลอดภัย เป็นมิตรต่อสิ่งแวดล้อม
          </div>
        </div>

        {/* Ingredients */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>ส่วนประกอบหลัก</div>
          {[
            { name: 'ไคโตซาน (Chitosan)', role: 'ยับยั้งแบคทีเรียและเชื้อรา', emoji: '🦐' },
            { name: 'แป้งธรรมชาติ (Starch)', role: 'เพิ่มความแข็งแรง ลดต้นทุน', emoji: '🥔' },
            { name: 'กลีเซอรอล (Glycerol)', role: 'ทำให้ฟิล์มยืดหยุ่น ไม่แตกง่าย', emoji: '💧' },
            { name: 'Natural pH Indicator', role: 'เปลี่ยนสีตามระดับความสุก', emoji: '🌸' },
            { name: 'สารสกัดธรรมชาติ', role: 'ช่วยไล่แมลง', emoji: '🌿' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ fontSize: 28, width: 40, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e2d1f' }}>{item.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{item.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>หลักการทำงาน</div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
            {['เขียว\n(ดิบ)', 'เหลือง\n(สุก)', 'ส้ม\n(พร้อมเก็บ)', 'แดง\n(สุกเกิน)'].map((label, i) => {
              const colors = ['#22c55e', '#eab308', '#f97316', '#dc2626']
              return (
                <div key={i} style={{ flex: 1, background: colors[i], padding: '10px 4px', textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.4, borderRadius: i === 0 ? '8px 0 0 8px' : i === 3 ? '0 8px 8px 0' : 0 }}>
                  {label}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
            ฟิล์มมีสาร <strong>Natural pH Indicator</strong> ที่เปลี่ยนสีตาม pH ผิวผลไม้ เมื่อผลไม้สุก pH จะเปลี่ยน ทำให้ฟิล์มเปลี่ยนสีจากเขียว → เหลือง → ส้ม → แดง ระบบ AI จะอ่านค่าสีและแปลงเป็นเปอร์เซ็นต์ความสุกพร้อมคำแนะนำ
          </div>
        </div>

        {/* Benefits */}
        <div style={{ background: '#e8f5e9', borderRadius: 16, padding: '20px', border: '1px solid #a5d6a7' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d7a3a', marginBottom: 14 }}>ประโยชน์ที่ได้รับ</div>
          {[
            'ลดการสูญเสียผลผลิตจากการเก็บเกี่ยวผิดเวลา',
            'ช่วยป้องกันจุลินทรีย์และแมลงรบกวน',
            'ย่อยสลายได้ตามธรรมชาติ ไม่ทิ้งขยะ',
            'เกษตรกรตรวจสอบด้วยแอปมือถือได้ทันที',
            'ลดการใช้สารเคมี ยืดอายุผลไม้ได้นานขึ้น',
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 4 ? 10 : 0 }}>
              <span style={{ color: '#2d7a3a', fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 14, color: '#1e4620', lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [zones, setZones] = useState<ZoneData[]>(ZONES)
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setZones(prev => prev.map(z => {
        const newPct = Math.min(100, Math.max(0, z.ripeness + (Math.random() - 0.35) * 0.5))
        return { ...z, ripeness: parseFloat(newPct.toFixed(1)), level: levelFromPct(newPct) }
      }))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  if (page === 'scan') return <ScanPage onBack={() => setPage('home')} />
  if (page === 'about') return <AboutPage onBack={() => setPage('home')} />

  const urgentCount = zones.filter(z => z.level === 'overripe').length
  const tamperCount = zones.filter(z => z.hasTamper).length

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee', fontFamily: 'Sarabun, sans-serif' }}>
      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2d7a3a,#4ade80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍃</div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: '#1e2d1f', lineHeight: 1 }}>FreshSense</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>ระบบติดตามความสุกผลไม้</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {urgentCount > 0 && (
            <div className="pulse" style={{ padding: '4px 10px', borderRadius: 99, background: '#fef2f2', color: '#991b1b', fontSize: 12, fontWeight: 600, border: '1px solid #fca5a5' }}>
              🔴 {urgentCount} โซนด่วน
            </div>
          )}
          <div style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'Outfit, sans-serif' }}>
            {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 100px', maxWidth: 600, margin: '0 auto' }}>

        {/* ── Scan button (hero action) ── */}
        <button onClick={() => setPage('scan')} style={{ width: '100%', padding: '20px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#2d7a3a,#16a34a)', color: '#fff', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 6px 24px rgba(45,122,58,0.3)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📷</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>ถ่ายภาพฟิล์ม</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>วิเคราะห์ความสุกด้วย AI ได้ทันที</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 24, opacity: 0.7 }}>→</div>
        </button>

        {/* ── Film color guide ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>สีฟิล์มบอกอะไร?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['unripe', 'maturing', 'ripe', 'overripe'] as RipenessLevel[]).map(lvl => {
              const c = LEVEL_CONFIG[lvl]
              return (
                <div key={lvl} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ width: '100%', height: 10, borderRadius: 99, background: c.color, marginBottom: 5 }} />
                  <div style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.3, marginTop: 2 }}>{c.label.replace(' ✓','').replace(' !','')}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Alert banner ── */}
        {tamperCount > 0 && (
          <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>⚠</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>ตรวจพบสิ่งแปลกปลอม {tamperCount} โซน</div>
              <div style={{ fontSize: 13, color: '#6b21a8' }}>กรุณาตรวจสอบฟิล์มด้วยตาเปล่า</div>
            </div>
          </div>
        )}

        {/* ── Zone list ── */}
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#1e2d1f' }}>
          สถานะโซนผลไม้ ({zones.length} โซน)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {zones.map(z => (
            <ZoneCard key={z.id} zone={z} onClick={() => setSelectedZone(z)} />
          ))}
        </div>

        {/* ── How to use summary ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>วิธีใช้งาน</div>
          {[
            { step: '1', text: 'ห่อฟิล์มรอบผลไม้ให้แนบสนิท', icon: '🎁' },
            { step: '2', text: 'รอสังเกตการเปลี่ยนสีของฟิล์ม', icon: '⏱' },
            { step: '3', text: 'เปิดแอปถ่ายภาพฟิล์ม ระบบ AI วิเคราะห์ทันที', icon: '📱' },
            { step: '4', text: 'ดูผลเปอร์เซ็นต์ความสุกและคำแนะนำ', icon: '📊' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 99, background: '#e8f5e9', color: '#2d7a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
              <span style={{ fontSize: 14 }}>{s.icon} {s.text}</span>
            </div>
          ))}
        </div>

        {/* ── About button ── */}
        <button onClick={() => setPage('about')} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #a5d6a7', background: '#f0fdf4', color: '#2d7a3a', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif' }}>
          🌿 รายละเอียดโครงงาน
        </button>
      </div>

      {/* ── Zone detail modal ── */}
      {selectedZone && <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </div>
  )
}
