import React, { useState } from "react";

type FruitRow = {
  id: number;
  fruit: string;
  stage: string;
  phMin: number;
  phMax: number;
  source: string;
  link: string;
};



const INITIAL_DATA = [
  {
    id: 1,
    fruit: "ฝรั่ง",
    stage: "ดิบ",
    phMin: 3.8,
    phMax: 4.2,
    source: "Physico-chemical properties of guava fruit at different ripening stages",
    link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6033817/"
  },
  {
    id: 2,
    fruit: "ฝรั่ง",
    stage: "สุกพอดี",
    phMin: 4.5,
    phMax: 5.5,
    source: "Production and characterization of mixed fruit juice from papaya, mango, guava",
    link: "https://www.interesjournals.org/articles/production-and-characterization-of-mixed-fruit-juice-from-papaya-mango-and-guava-fruit-94134.html"
  },
  {
    id: 3,
    fruit: "ฝรั่ง",
    stage: "สุกงอม",
    phMin: 5.5,
    phMax: 6.0,
    source: "Postharvest quality and biochemical changes of guava fruit during ripening",
    link: "https://www.sciencedirect.com/science/article/pii/S030881461931234X"
  },
  {
    id: 5,
    fruit: "ฝรั่ง",
    stage: "สุกพอดี",
    phMin: 3.5,
    phMax: 4.0,
    source: "ยังไม่มีแหล่งอ้างอิง — โปรดเพิ่ม",
    link: "",
  },
];

let nextId = 6;

export default function ReferenceDataTable() {

const [rows, setRows] = useState<FruitRow[]>(INITIAL_DATA);
const [editingId, setEditingId] = useState<number | null>(null);
const [draft, setDraft] = useState<FruitRow | null>(null);

    const startEdit = (row: FruitRow) => {
        setEditingId(row.id);
        setDraft({ ...row });
    };
    const saveEdit = () => {
        setRows((prev) => prev.map((r) => (r.id === editingId && draft ? draft : r)));    setEditingId(null);
        setDraft(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft(null);
    };

    const deleteRow = (id: number) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

  const addRow = () => {
    const newRow = {
      id: nextId++,
      fruit: "ผลไม้ใหม่",
      stage: "ดิบ",
      phMin: 0,
      phMax: 0,
      source: "",
      link: "",
    };
    setRows((prev) => [...prev, newRow]);
    startEdit(newRow);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ตารางอ้างอิงค่า pH มาตรฐาน</h1>
            <p style={{ fontSize: 13, color: "#8fae9b", margin: "4px 0 0" }}>
              ค่า pH ของผลไม้แต่ละชนิดตามระยะสุก อ้างอิงจากงานวิจัย — แก้ไข/เพิ่มข้อมูลได้
            </p>
          </div>
          <button onClick={addRow} style={addBtnStyle}>
            + เพิ่มแถว
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid #1e3a26",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#132a1c", textAlign: "left" }}>
                <th style={thStyle}>ผลไม้</th>
                <th style={thStyle}>ระยะสุก</th>
                <th style={thStyle}>ช่วง pH</th>
                <th style={thStyle}>แหล่งอ้างอิง</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid #1e3a26" }}>
                    {isEditing ? (
                      <>
                        <td style={tdStyle}>
                          <input
                            value={draft!.fruit}
                            onChange={(e) => setDraft({ ...draft!, phMin: parseFloat(e.target.value) })}
                            style={cellInputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={draft!.stage}
                            onChange={(e) => setDraft({ ...draft!, phMax: parseFloat(e.target.value) })}
                            style={cellInputStyle}
                          >
                            <option>ดิบ</option>
                            <option>กำลังสุก</option>
                            <option>สุกพอดี</option>
                            <option>สุกเกิน/เน่า</option>
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={draft!.phMin}
                              onChange={(e) => setDraft({ ...draft!, source: e.target.value })}
                              style={{ ...cellInputStyle, width: 60 }}
                            />
                            <span style={{ color: "#8fae9b" }}>–</span>
                            <input
                              type="number"
                              step="0.01"
                              value={draft!.phMax}
                              onChange={(e) => setDraft({ ...draft!, link: e.target.value })}
                              style={{ ...cellInputStyle, width: 60 }}
                            />
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <input
                            placeholder="ชื่องานวิจัย"
                            value={draft!.source}
                            onChange={(e) => setDraft({ ...draft!, fruit: e.target.value })}
                            style={{ ...cellInputStyle, marginBottom: 4 }}
                          />
                          <input
                            placeholder="ลิงก์ / DOI"
                            value={draft!.link}
                            onChange={(e) => setDraft({ ...draft!, stage: e.target.value })}
                            style={cellInputStyle}
                          />
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <button onClick={saveEdit} style={saveBtnStyle}>
                            บันทึก
                          </button>
                          <button onClick={cancelEdit} style={cancelBtnStyle}>
                            ยกเลิก
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.fruit}</td>
                        <td style={tdStyle}>
                          <span style={stageBadgeStyle(row.stage)}>{row.stage}</span>
                        </td>
                        <td style={tdStyle}>
                          {row.phMin.toFixed(2)} – {row.phMax.toFixed(2)}
                        </td>
                        <td style={tdStyle}>
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#7fd99a", textDecoration: "none" }}
                            >
                              {row.source}
                            </a>
                          ) : (
                            <span style={{ color: row.source ? "#e8f0ea" : "#c05656" }}>
                              {row.source || "ยังไม่มีแหล่งอ้างอิง"}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <button onClick={() => startEdit(row)} style={editBtnStyle}>
                            แก้ไข
                          </button>
                          <button onClick={() => deleteRow(row.id)} style={deleteBtnStyle}>
                            ลบ
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 11, color: "#5c7566", marginTop: 12 }}>
          หมายเหตุ: ข้อมูลเริ่มต้นบางส่วนเป็นค่าประมาณจากงานวิจัยที่เกี่ยวข้อง ควรตรวจสอบและอัปเดตให้ตรงกับงานวิจัยที่ใช้อ้างอิงจริงในรายงาน
        </p>
      </div>
    </div>
  );
}

function stageBadgeStyle(stage: string) {
  const map: Record<string, { bg: string; color: string }> = {
    "ดิบ": { bg: "#1e3a26", color: "#7fd99a" },
    "กำลังสุก": { bg: "#4d3b1a", color: "#facc15" },
    "สุกพอดี": { bg: "#4d2f14", color: "#fb923c" },
    "สุกเกิน/เน่า": { bg: "#3b1a4d", color: "#d8b4fe" },
  };
  const c = map[stage] || { bg: "#1e3a26", color: "#e8f0ea" };
  return {
    background: c.bg,
    color: c.color,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
  };
}

const thStyle = { padding: "10px 14px", fontSize: 12, color: "#8fae9b", fontWeight: 600 };
const tdStyle = { padding: "10px 14px", verticalAlign: "top" };
const cellInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0d1a12",
  border: "1px solid #2a4c34",
  borderRadius: 6,
  padding: "6px 8px",
  color: "#e8f0ea",
  fontSize: 12,
};
const addBtnStyle = {
  background: "#22c55e",
  color: "#08150c",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const editBtnStyle = {
  background: "#1e3a26",
  color: "#7fd99a",
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  marginRight: 6,
};
const deleteBtnStyle = {
  background: "#3b1a1a",
  color: "#f87171",
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const saveBtnStyle = {
  background: "#22c55e",
  color: "#08150c",
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  marginRight: 6,
};
const cancelBtnStyle = {
  background: "#1e3a26",
  color: "#e8f0ea",
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};