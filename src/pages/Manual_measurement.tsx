import React, { useState } from "react";

const INITIAL_ZONES = [
  { id: "A", name: "ฝรั่ง", simPh: 5.05, status: "สุก", color: "#a855f7", temp: 28.9, humidity: 62, filmIntegrity: 100 },
  { id: "B", name: "ฝรั่ง", simPh: 6.16, status: "สุก", color: "#7e55f7", temp: 27.2, humidity: 65, filmIntegrity: 100 },
  { id: "C", name: "ฝรั่ง", simPh: 6.18, status: "สุก", color: "#7e55f7", temp: 28.0, humidity: 60, filmIntegrity: 100 },
  { id: "D", name: "ฝรั่ง", simPh: 4.81, status: "ยังดิบ", color: "#f97316", temp: 26.5, humidity: 58, filmIntegrity: 100 },
];

type Zone = {
  id: string;
  name: string;
  simPh: number;
  status: string;
  color: string;
  temp: number;
  humidity: number;
  filmIntegrity: number;
};

type MeasurementRecord = {
  ph: string;
  date: string;
  recorder: string;
  temp?: number;
  humidity?: number;
  filmIntegrity?: number;
};

export default function ManualMeasurementDemo() {
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [actuals, setActuals] = useState<Record<string, MeasurementRecord>>({});

  // State สำหรับ Modal บันทึก/แก้ไข ค่าที่วัดจริง
  const [form, setForm] = useState({
    zone: "A",
    ph: "",
    temp: "28.0",
    humidity: "60",
    filmIntegrity: 100,
    date: "",
    recorder: "",
  });
  const [showForm, setShowForm] = useState(false);

  // State สำหรับ Modal เพิ่ม/แก้ไข โซน
  const [showAddZoneForm, setShowAddZoneForm] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [newZone, setNewZone] = useState({
    id: "",
    name: "",
    simPh: "",
    status: "สุกพอดี",
    temp: "28.0",
    humidity: "60",
    filmIntegrity: 100,
  });

  // บันทึก/แก้ไข ค่าการวัดจริง
  const handleSubmit = () => {
    if (!form.ph || !form.date || !form.recorder) return;

    const parsedTemp = parseFloat(form.temp) || 0;
    const parsedHum = parseFloat(form.humidity) || 0;

    setActuals((prev) => ({
      ...prev,
      [form.zone]: {
        ph: form.ph,
        date: form.date,
        recorder: form.recorder,
        temp: parsedTemp,
        humidity: parsedHum,
        filmIntegrity: form.filmIntegrity,
      },
    }));

    setZones((prev) =>
      prev.map((z) =>
        z.id === form.zone
          ? {
              ...z,
              temp: parsedTemp,
              humidity: parsedHum,
              filmIntegrity: form.filmIntegrity,
            }
          : z
      )
    );

    setForm({
      zone: form.zone,
      ph: "",
      temp: "28.0",
      humidity: "60",
      filmIntegrity: 100,
      date: "",
      recorder: "",
    });
    setShowForm(false);
  };

  // ลบค่าการวัดจริงของโซน
  const handleDeleteActual = (zoneId: string) => {
    if (confirm(`คุณต้องการลบข้อมูลค่าการวัดจริงของ โซน ${zoneId} ใช่หรือไม่?`)) {
      setActuals((prev) => {
        const updated = { ...prev };
        delete updated[zoneId];
        return updated;
      });
    }
  };

  // เปิด Modal แก้ไขค่าที่วัดจริง
  const handleEditActual = (zoneId: string) => {
    const actual = actuals[zoneId];
    const targetZone = zones.find((z) => z.id === zoneId);

    if (actual && targetZone) {
      setForm({
        zone: zoneId,
        ph: actual.ph,
        temp: actual.temp !== undefined ? String(actual.temp) : String(targetZone.temp),
        humidity: actual.humidity !== undefined ? String(actual.humidity) : String(targetZone.humidity),
        filmIntegrity: actual.filmIntegrity !== undefined ? actual.filmIntegrity : targetZone.filmIntegrity,
        date: actual.date,
        recorder: actual.recorder,
      });
      setShowForm(true);
    }
  };

  // บันทึกการ เพิ่ม/แก้ไข โซน
  const handleSaveZone = () => {
    if (!newZone.id || !newZone.name || !newZone.simPh) return;

    if (editingZoneId) {
      // แก้ไขโซนเดิม
      setZones((prev) =>
        prev.map((z) =>
          z.id === editingZoneId
            ? {
                ...z,
                name: newZone.name,
                simPh: parseFloat(newZone.simPh) || 0,
                status: newZone.status,
                color: newZone.status === "สุกพอดี" ? "#f97316" : "#a855f7",
                temp: parseFloat(newZone.temp) || 28.0,
                humidity: parseFloat(newZone.humidity) || 60,
                filmIntegrity: newZone.filmIntegrity,
              }
            : z
        )
      );
    } else {
      // เพิ่มโซนใหม่
      if (zones.some((z) => z.id.toUpperCase() === newZone.id.toUpperCase())) {
        alert("รหัสโซนนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น");
        return;
      }

      const createdZone: Zone = {
        id: newZone.id.toUpperCase(),
        name: newZone.name,
        simPh: parseFloat(newZone.simPh) || 0,
        status: newZone.status,
        color: newZone.status === "สุกพอดี" ? "#f97316" : "#a855f7",
        temp: parseFloat(newZone.temp) || 28.0,
        humidity: parseFloat(newZone.humidity) || 60,
        filmIntegrity: newZone.filmIntegrity,
      };

      setZones((prev) => [...prev, createdZone]);
    }

    setEditingZoneId(null);
    setNewZone({ id: "", name: "", simPh: "", status: "สุกพอดี", temp: "28.0", humidity: "60", filmIntegrity: 100 });
    setShowAddZoneForm(false);
  };

  // เปิด Modal แก้ไขข้อมูลโซน
  const handleEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setNewZone({
      id: zone.id,
      name: zone.name,
      simPh: String(zone.simPh),
      status: zone.status,
      temp: String(zone.temp),
      humidity: String(zone.humidity),
      filmIntegrity: zone.filmIntegrity,
    });
    setShowAddZoneForm(true);
  };

  // ลบโซน
  const handleDeleteZone = (zoneId: string) => {
    if (confirm(`คุณต้องการลบ โซน ${zoneId} ใช่หรือไม่?`)) {
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      setActuals((prev) => {
        const updated = { ...prev };
        delete updated[zoneId];
        return updated;
      });
    }
  };

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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            สถานะโซนผลไม้ ({zones.length} โซน)
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setEditingZoneId(null);
                setNewZone({ id: "", name: "", simPh: "", status: "สุกพอดี", temp: "28.0", humidity: "60", filmIntegrity: 100 });
                setShowAddZoneForm(true);
              }}
              style={{
                background: "#1e3a26",
                color: "#7fd99a",
                border: "1px solid #2a4c34",
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + เพิ่มโซนใหม่
            </button>
            <button
              onClick={() => {
                if (zones.length > 0 && !form.zone) {
                  const targetZone = zones[0];
                  setForm((prev) => ({
                    ...prev,
                    zone: targetZone.id,
                    temp: String(targetZone.temp),
                    humidity: String(targetZone.humidity),
                    filmIntegrity: targetZone.filmIntegrity,
                  }));
                }
                setShowForm(true);
              }}
              style={{
                background: "#22c55e",
                color: "#08150c",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + บันทึกค่าที่วัดจริง
            </button>
          </div>
        </div>

        {/* Zone cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {zones.map((z) => {
            const actual = actuals[z.id];
            return (
              <div
                key={z.id}
                style={{
                  background: "#0f2016",
                  border: "1px solid #1e3a26",
                  borderRadius: 14,
                  padding: 18,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#8fae9b" }}>โซน {z.id}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{z.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        background: z.status === "สุกพอดี" ? "#4d2a1a" : "#3b1a4d",
                        color: z.status === "สุกพอดี" ? "#ffedd5" : "#d8b4fe",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {z.status}
                    </span>
                    {/* ปุ่มแก้ไข & ลบโซน */}
                    <button
                      onClick={() => handleEditZone(z)}
                      title="แก้ไขโซน"
                      style={iconBtnStyle}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteZone(z.id)}
                      title="ลบโซน"
                      style={{ ...iconBtnStyle, color: "#ef4444" }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                {/* แสดงผล อุณหภูมิ, ความชื้น, ความสมบูรณ์ฟิล์ม */}
                <div style={{ marginTop: 14, background: "#0a140e", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#8fae9b" }}>อุณหภูมิ:</span>
                    <span style={{ fontWeight: 600 }}>{z.temp} °C</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#8fae9b" }}>ความชื้นสัมพัทธ์:</span>
                    <span style={{ fontWeight: 600 }}>{z.humidity} %</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8fae9b" }}>ความสมบูรณ์ฟิล์ม:</span>
                    <span style={{ fontWeight: 700, color: z.filmIntegrity < 50 ? "#ef4444" : "#4ade80" }}>
                      {z.filmIntegrity}%
                    </span>
                  </div>
                </div>

                {/* Simulated value */}
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      border: `4px solid ${z.color}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{z.simPh}</div>
                    <div style={{ fontSize: 8, color: "#8fae9b" }}>PH</div>
                  </div>
                  <div>
                    <span
                      style={{
                        background: "#1e3a26",
                        color: "#7fd99a",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 999,
                      }}
                    >
                      จำลอง
                    </span>
                    <div style={{ fontSize: 11, color: "#8fae9b", marginTop: 4 }}>ค่าคำนวณจากระบบ</div>
                  </div>
                </div>

                {/* Actual value */}
                <div style={{ marginTop: 14, borderTop: "1px dashed #1e3a26", paddingTop: 12 }}>
                  {actual ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: "4px solid #facc15",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{actual.ph}</div>
                          <div style={{ fontSize: 8, color: "#8fae9b" }}>PH</div>
                        </div>
                        <div>
                          <span
                            style={{
                              background: "#4d3b1a",
                              color: "#facc15",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 999,
                            }}
                          >
                            วัดจริง
                          </span>
                          <div style={{ fontSize: 11, color: "#8fae9b", marginTop: 4 }}>
                            {actual.date} · {actual.recorder}
                          </div>
                        </div>
                      </div>
                      {/* ปุ่มแก้ไข & ลบ ค่าที่วัดจริง */}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleEditActual(z.id)}
                          title="แก้ไขค่าที่วัดจริง"
                          style={iconBtnStyle}
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteActual(z.id)}
                          title="ลบค่าที่วัดจริง"
                          style={{ ...iconBtnStyle, color: "#ef4444" }}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#5c7566" }}>ยังไม่มีค่าที่วัดจริงสำหรับโซนนี้</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal เพิ่ม/แก้ไข โซน */}
        {showAddZoneForm && (
          <div style={modalOverlayStyle} onClick={() => setShowAddZoneForm(false)}>
            <div onClick={(e) => e.stopPropagation()} style={modalContentStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>
                {editingZoneId ? `แก้ไขโซน ${editingZoneId}` : "เพิ่มโซนผลไม้ใหม่"}
              </h2>

              <label style={labelStyle}>รหัสโซน</label>
              <input
                type="text"
                placeholder="เช่น E"
                disabled={!!editingZoneId}
                value={newZone.id}
                onChange={(e) => setNewZone({ ...newZone, id: e.target.value })}
                style={{ ...inputStyle, opacity: editingZoneId ? 0.6 : 1 }}
              />

              <label style={labelStyle}>ชื่อผลไม้</label>
              <input
                type="text"
                placeholder="เช่น ทุเรียน"
                value={newZone.name}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ค่า pH จำลองเริ่มต้น</label>
              <input
                type="number"
                step="0.01"
                placeholder="เช่น 5.50"
                value={newZone.simPh}
                onChange={(e) => setNewZone({ ...newZone, simPh: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>อุณหภูมิ (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="เช่น 28.5"
                value={newZone.temp}
                onChange={(e) => setNewZone({ ...newZone, temp: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ความชื้นสัมพัทธ์ (%)</label>
              <input
                type="number"
                step="1"
                placeholder="เช่น 60"
                value={newZone.humidity}
                onChange={(e) => setNewZone({ ...newZone, humidity: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ความสมบูรณ์ฟิล์ม (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newZone.filmIntegrity}
                onChange={(e) => setNewZone({ ...newZone, filmIntegrity: Number(e.target.value) })}
                style={inputStyle}
              />

              <label style={labelStyle}>สถานะ</label>
              <select
                value={newZone.status}
                onChange={(e) => setNewZone({ ...newZone, status: e.target.value })}
                style={inputStyle}
              >
                <option value="สุกพอดี">สุกพอดี</option>
                <option value="สุกเกิน/เน่า">สุกเกิน/เน่า</option>
                <option value="ยังไม่สุก">ยังไม่สุก</option>
              </select>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setShowAddZoneForm(false)}
                  style={{ ...btnStyle, background: "#1e3a26", color: "#e8f0ea" }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveZone}
                  style={{ ...btnStyle, background: "#22c55e", color: "#08150c" }}
                >
                  {editingZoneId ? "บันทึกการแก้ไข" : "เพิ่มโซน"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal บันทึก/แก้ไข ค่าที่วัดจริง */}
        {showForm && (
          <div style={modalOverlayStyle} onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} style={modalContentStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>บันทึกค่าที่วัดจริง</h2>

              <label style={labelStyle}>โซนผลไม้</label>
              <select
                value={form.zone}
                onChange={(e) => {
                  const selectedZone = zones.find((z) => z.id === e.target.value);
                  setForm({
                    ...form,
                    zone: e.target.value,
                    temp: selectedZone ? String(selectedZone.temp) : "28.0",
                    humidity: selectedZone ? String(selectedZone.humidity) : "60",
                    filmIntegrity: selectedZone ? selectedZone.filmIntegrity : 100,
                  });
                }}
                style={inputStyle}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    โซน {z.id} — {z.name}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>ค่า pH ที่วัดได้</label>
              <input
                type="number"
                step="0.01"
                placeholder="เช่น 4.20"
                value={form.ph}
                onChange={(e) => setForm({ ...form, ph: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>อุณหภูมิ (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="เช่น 28.5"
                value={form.temp}
                onChange={(e) => setForm({ ...form, temp: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ความชื้นสัมพัทธ์ (%)</label>
              <input
                type="number"
                step="1"
                placeholder="เช่น 60"
                value={form.humidity}
                onChange={(e) => setForm({ ...form, humidity: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ความสมบูรณ์ฟิล์ม (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.filmIntegrity}
                onChange={(e) => setForm({ ...form, filmIntegrity: Number(e.target.value) })}
                style={inputStyle}
              />

              <label style={labelStyle}>วันที่/เวลา</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>ผู้บันทึก</label>
              <input
                type="text"
                placeholder="ชื่อผู้วัด"
                value={form.recorder}
                onChange={(e) => setForm({ ...form, recorder: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ ...btnStyle, background: "#1e3a26", color: "#e8f0ea" }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  style={{ ...btnStyle, background: "#22c55e", color: "#08150c" }}
                >
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

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modalContentStyle: React.CSSProperties = {
  background: "#122419",
  border: "1px solid #1e3a26",
  borderRadius: 14,
  padding: 24,
  width: 340,
  maxHeight: "90vh",
  overflowY: "auto",
};

const labelStyle = { display: "block", fontSize: 12, color: "#8fae9b", margin: "10px 0 4px" };
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0d1a12",
  border: "1px solid #2a4c34",
  borderRadius: 8,
  padding: "9px 10px",
  color: "#e8f0ea",
  fontSize: 14,
} as const;
const btnStyle = {
  flex: 1,
  border: "none",
  borderRadius: 8,
  padding: "10px 0",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  padding: "2px 4px",
  borderRadius: 4,
  opacity: 0.8,
};