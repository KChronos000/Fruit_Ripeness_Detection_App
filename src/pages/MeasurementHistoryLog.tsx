import React, { useState, useMemo } from "react";

type LogType = "simulated" | "actual" | "ai_scan";

type LogEntry = {
  id: number;
  timestamp: string; // ISO string
  zoneId: string;
  fruit: string;
  type: LogType;
  ph: number;
  temp?: number;     // อุณหภูมิ (°C)
  humidity?: number; // ความชื้นสัมพัทธ์ (%)
  recorder: string;
};

const ZONES: { id: string; fruit: string }[] = [
  { id: "A", fruit: "ฝรั่ง" },
  { id: "B", fruit: "ฝรั่ง" },
  { id: "C", fruit: "ฝรั่ง" },
  { id: "D", fruit: "ฝรั่ง" },
];

const TYPE_LABEL: Record<LogType, string> = {
  simulated: "จำลอง",
  actual: "วัดจริง",
  ai_scan: "สแกน AI",
};

const TYPE_COLOR: Record<LogType, { bg: string; color: string }> = {
  simulated: { bg: "#1e3a26", color: "#7fd99a" },
  actual: { bg: "#4d3b1a", color: "#facc15" },
  ai_scan: { bg: "#1a2f4d", color: "#7dd3fc" },
};

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, timestamp: "2026-08-05T08:00:00", zoneId: "A", fruit: "มะม่วง", type: "simulated", ph: 3.2, temp: 28.5, humidity: 65, recorder: "ระบบ" },
  { id: 2, timestamp: "2026-08-06T08:00:00", zoneId: "A", fruit: "มะม่วง", type: "simulated", ph: 3.8, temp: 29.0, humidity: 62, recorder: "ระบบ" },
  { id: 3, timestamp: "2026-08-06T09:15:00", zoneId: "A", fruit: "มะม่วง", type: "actual", ph: 3.9, temp: 29.2, humidity: 60, recorder: "ครูสมชาย" },
  { id: 4, timestamp: "2026-08-07T08:00:00", zoneId: "A", fruit: "มะม่วง", type: "simulated", ph: 4.5, temp: 30.1, humidity: 58, recorder: "ระบบ" },
  { id: 5, timestamp: "2026-08-07T10:30:00", zoneId: "A", fruit: "มะม่วง", type: "ai_scan", ph: 4.6, temp: 30.5, humidity: 55, recorder: "AI Gemini" },
  { id: 6, timestamp: "2026-08-08T08:00:00", zoneId: "A", fruit: "มะม่วง", type: "simulated", ph: 5.05, temp: 31.0, humidity: 54, recorder: "ระบบ" },
];

let nextId = 7;

export default function MeasurementHistoryLog() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [zoneFilter, setZoneFilter] = useState<string>("A");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [form, setForm] = useState<{
    zoneId: string;
    type: LogType;
    ph: string;
    temp: string;
    humidity: string;
    recorder: string;
    timestamp: string;
  }>({
    zoneId: "A",
    type: "actual",
    ph: "",
    temp: "",
    humidity: "",
    recorder: "",
    timestamp: "",
  });

  const addLog = (): void => {
    if (!form.ph || !form.timestamp || !form.recorder) return;
    const zone = ZONES.find((z) => z.id === form.zoneId);
    const entry: LogEntry = {
      id: nextId++,
      timestamp: form.timestamp,
      zoneId: form.zoneId,
      fruit: zone ? zone.fruit : form.zoneId,
      type: form.type,
      ph: parseFloat(form.ph),
      temp: form.temp ? parseFloat(form.temp) : undefined,
      humidity: form.humidity ? parseFloat(form.humidity) : undefined,
      recorder: form.recorder,
    };
    setLogs((prev) => [...prev, entry]);
    setForm({ zoneId: form.zoneId, type: "actual", ph: "", temp: "", humidity: "", recorder: "", timestamp: "" });
    setShowForm(false);
  };

  const filteredLogs = useMemo<LogEntry[]>(() => {
    return logs
      .filter((l) => l.zoneId === zoneFilter)
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [logs, zoneFilter]);

  const chart = useMemo(() => {
    const width = 640;
    const height = 220;
    const padding = 36;

    if (filteredLogs.length === 0) {
      return {
        width,
        height,
        padding,
        simPath: "",
        actualPath: "",
        points: [] as { x: number; y: number; entry: LogEntry }[],
        yTicks: [] as number[],
        minPh: 2,
        maxPh: 6,
      };
    }

    const times = filteredLogs.map((l) => new Date(l.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times) || minTime + 1;
    const phs = filteredLogs.map((l) => l.ph);
    const minPh = Math.min(2, Math.floor(Math.min(...phs) - 0.5));
    const maxPh = Math.max(6, Math.ceil(Math.max(...phs) + 0.5));

    const xFor = (t: number): number =>
      padding + ((t - minTime) / (maxTime - minTime || 1)) * (width - padding * 2);
    const yFor = (ph: number): number =>
      height - padding - ((ph - minPh) / (maxPh - minPh || 1)) * (height - padding * 2);

    const simPoints = filteredLogs.filter((l) => l.type === "simulated");
    const actualPoints = filteredLogs.filter((l) => l.type !== "simulated");

    const toPath = (arr: LogEntry[]): string =>
      arr
        .map((l, i) => `${i === 0 ? "M" : "L"} ${xFor(new Date(l.timestamp).getTime())} ${yFor(l.ph)}`)
        .join(" ");

    const allPoints = filteredLogs.map((l) => ({
      x: xFor(new Date(l.timestamp).getTime()),
      y: yFor(l.ph),
      entry: l,
    }));

    const yTicks: number[] = [];
    for (let v = minPh; v <= maxPh; v += 1) yTicks.push(v);

    return {
      width,
      height,
      padding,
      simPath: toPath(simPoints),
      actualPath: toPath(actualPoints),
      points: allPoints,
      yTicks,
      minPh,
      maxPh,
    };
  }, [filteredLogs]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1a12",
        color: "#e8f0ea",
        fontFamily: "'IBM Plex Sans Thai', 'Noto Sans Thai', sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ประวัติการวัดค่า pH และสภาวะแวดล้อม</h1>
            <p style={{ fontSize: 13, color: "#8fae9b", margin: "4px 0 0" }}>
              บันทึกค่า pH, อุณหภูมิ และความชื้นสัมพัทธ์ พร้อม timestamp
            </p>
          </div>
          <button onClick={() => setShowForm(true)} style={addBtnStyle}>
            + เพิ่มบันทึก
          </button>
        </div>

        {/* Zone filter */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 18 }}>
          {ZONES.map((z) => (
            <button
              key={z.id}
              onClick={() => setZoneFilter(z.id)}
              style={{
                ...zoneBtnStyle,
                border: zoneFilter === z.id ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.12)",
                background: zoneFilter === z.id ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                color: zoneFilter === z.id ? "#6ee7b7" : "#cbd5c9",
              }}
            >
              โซน {z.id} · {z.fruit}
            </button>
          ))}
        </div>

        {/* Trend chart */}
        <div style={{ border: "1px solid #1e3a26", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>กราฟแนวโน้ม pH: จำลอง vs วัดจริง/AI</span>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ color: "#7fd99a" }}>● จำลอง</span>
              <span style={{ color: "#facc15" }}>● วัดจริง/AI</span>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ fontSize: 13, color: "#5c7566", padding: "30px 0", textAlign: "center" }}>
              ยังไม่มีข้อมูลสำหรับโซนนี้
            </div>
          ) : (
            <svg width="100%" viewBox={`0 0 ${chart.width} ${chart.height}`} style={{ overflow: "visible" }}>
              {/* Y axis grid */}
              {chart.yTicks.map((tick) => {
                const y =
                  chart.height -
                  chart.padding -
                  ((tick - chart.minPh) / (chart.maxPh - chart.minPh || 1)) *
                    (chart.height - chart.padding * 2);
                return (
                  <g key={tick}>
                    <line
                      x1={chart.padding}
                      x2={chart.width - chart.padding}
                      y1={y}
                      y2={y}
                      stroke="#1e3a26"
                      strokeWidth={1}
                    />
                    <text x={4} y={y + 4} fontSize={10} fill="#5c7566">
                      {tick}
                    </text>
                  </g>
                );
              })}

              <path d={chart.simPath} fill="none" stroke="#22c55e" strokeWidth={2} />
              <path d={chart.actualPath} fill="none" stroke="#facc15" strokeWidth={2} strokeDasharray="4 3" />

              {chart.points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={p.entry.type === "simulated" ? "#22c55e" : "#facc15"}
                    stroke="#0d1a12"
                    strokeWidth={1}
                  />
                  <title>{`pH: ${p.entry.ph}\nอุณหภูมิ: ${p.entry.temp ?? "-"} °C\nความชื้น: ${p.entry.humidity ?? "-"} %`}</title>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* Log table */}
        <div style={{ border: "1px solid #1e3a26", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#132a1c", textAlign: "left" }}>
                <th style={thStyle}>วันที่/เวลา</th>
                <th style={thStyle}>ประเภท</th>
                <th style={thStyle}>ค่า pH</th>
                <th style={thStyle}>อุณหภูมิ (°C)</th>
                <th style={thStyle}>ความชื้น (%RH)</th>
                <th style={thStyle}>ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs
                .slice()
                .reverse()
                .map((log) => {
                  const c = TYPE_COLOR[log.type];
                  return (
                    <tr key={log.id} style={{ borderTop: "1px solid #1e3a26" }}>
                      <td style={tdStyle}>{new Date(log.timestamp).toLocaleString("th-TH")}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: c.bg,
                            color: c.color,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {TYPE_LABEL[log.type]}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{log.ph.toFixed(2)}</td>
                      <td style={{ ...tdStyle, color: log.temp !== undefined ? "#38bdf8" : "#5c7566" }}>
                        {log.temp !== undefined ? `${log.temp.toFixed(1)} °C` : "-"}
                      </td>
                      <td style={{ ...tdStyle, color: log.humidity !== undefined ? "#a7f3d0" : "#5c7566" }}>
                        {log.humidity !== undefined ? `${log.humidity.toFixed(0)} %` : "-"}
                      </td>
                      <td style={tdStyle}>{log.recorder}</td>
                    </tr>
                  );
                })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#5c7566" }} colSpan={6}>
                    ยังไม่มีประวัติการวัดสำหรับโซนนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add log modal */}
        {showForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
            onClick={() => setShowForm(false)}
          >
            <div
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{
                background: "#122419",
                border: "1px solid #1e3a26",
                borderRadius: 14,
                padding: 24,
                width: 360,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>เพิ่มบันทึกการวัด</h2>

              <label style={labelStyle}>โซนผลไม้</label>
              <select
                value={form.zoneId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, zoneId: e.target.value })}
                style={inputStyle}
              >
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    โซน {z.id} — {z.fruit}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>ประเภท</label>
              <select
                value={form.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, type: e.target.value as LogType })
                }
                style={inputStyle}
              >
                <option value="actual">วัดจริง</option>
                <option value="ai_scan">สแกน AI</option>
                <option value="simulated">จำลอง</option>
              </select>

              <label style={labelStyle}>ค่า pH *</label>
              <input
                type="number"
                step="0.01"
                placeholder="เช่น 4.20"
                value={form.ph}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, ph: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>อุณหภูมิ (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เช่น 28.5"
                    value={form.temp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, temp: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ความชื้น (%RH)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="เช่น 65"
                    value={form.humidity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, humidity: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <label style={labelStyle}>วันที่/เวลา *</label>
              <input
                type="datetime-local"
                value={form.timestamp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, timestamp: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ผู้บันทึก *</label>
              <input
                type="text"
                placeholder="ชื่อผู้วัด"
                value={form.recorder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, recorder: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowForm(false)} style={{ ...btnStyle, background: "#1e3a26", color: "#e8f0ea" }}>
                  ยกเลิก
                </button>
                <button onClick={addLog} style={{ ...btnStyle, background: "#22c55e", color: "#08150c" }}>
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#8fae9b", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "10px 14px" };
const addBtnStyle: React.CSSProperties = {
  background: "#22c55e",
  color: "#08150c",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const zoneBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "#8fae9b", margin: "10px 0 4px" };
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0d1a12",
  border: "1px solid #2a4c34",
  borderRadius: 8,
  padding: "9px 10px",
  color: "#e8f0ea",
  fontSize: 14,
};
const btnStyle: React.CSSProperties = {
  flex: 1,
  border: "none",
  borderRadius: 8,
  padding: "10px 0",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};