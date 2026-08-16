import React from 'react'
import { PH_MIN, PH_MAX } from '../constants/fruitConstants';

const BiofilmExtraMetrics = ({ selectedState, dayCount }: { selectedState: any; dayCount: number }) => {
  return (
          <div className="lg:col-span-2 bg-[#182b21] border border-[#efead9]/10 rounded-2xl p-5 space-y-4">
                {/* Detailed Analytics Panel */}
            <div className="flex justify-between items-start border-b border-[#efead9]/10 pb-3">
              <div>
                <h2 className="text-lg font-bold font-serif text-[#efead9]">
                  รายละเอียดวิเคราะห์: {selectedState.def.zone} — {selectedState.def.name}
                </h2>
                <p className="text-xs text-[#93a89a]">รหัสเซนเซอร์ #{selectedState.def.id} · เคลือบฟิล์มมาแล้ว {Math.floor(dayCount)} วัน</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${selectedState.bgClass}`}>
                {selectedState.full}
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
                      stroke={selectedState.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={selectedState.history
                        .map((v: number, idx: number) => {
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
                <div className="text-[10px] text-[#93a89a] mt-0.5">ปล่อยสารตะไคร้</div>
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

          

  )
}

export default BiofilmExtraMetrics