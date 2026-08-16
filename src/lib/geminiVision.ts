export async function analyzeFilmWithAI(base64Image: string) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const prompt = `คุณคือระบบวิเคราะห์ฟิล์มชีวภาพอัจฉริยะที่มีสารสีแอนโทไซยานิน (anthocyanin indicator)
วิเคราะห์ภาพฟิล์มหรือผลไม้ในภาพนี้ตามตารางอ้างอิงสี-pH:
- สีเขียว = pH 3.0-3.5 (ยังดิบ)
- สีเหลือง/ส้ม = pH 3.6-4.2 (กำลังสุก)
- สีส้มแดง = pH 4.3-5.0 (สุกพอดี)
- สีม่วง = pH > 5.0 (สุกเกิน/เน่า)

ประเมินทุกค่าจากลักษณะที่เห็นในภาพจริง (สี, ร่องรอยเชื้อรา, ความเสียหาย)

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นใดๆ ตามรูปแบบนี้เป๊ะๆ:
{
  "phEstimate": 4.2,
  "temperature": 28.5,
  "humidity": 65,
  "shelfLifeDays": 4,
  "filmIntegrity": 94,
  "essentialOilLevel": 85,
  "stageName": "กำลังสุก",
  "filmColor": "สีเหลืองส้ม (Quinonoidal Anhydrobase)",
  "pestOrMoldDetected": false,
  "confidence": 92,
  "recommendation": "คำแนะนำสั้นๆ ตามสภาพที่เห็นจริง",
  "details": "รายละเอียดการวิเคราะห์ตามสภาพจริงในภาพ"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${API_KEY}`,    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      })
    }
  );

const data = await response.json();

if (!response.ok || !data.candidates) {
  console.error("Gemini API error:", data);
  throw new Error(data.error?.message || `API error: ${response.status}`);
}

const text = data.candidates[0].content.parts[0].text;
const clean = text.replace(/```json|```/g, "").trim();
return JSON.parse(clean);
}

export function captureFrame(videoRef: React.RefObject<HTMLVideoElement | null>) {
  if (!videoRef.current) {
    throw new Error("Video element not ready");
  }
  const canvas = document.createElement("canvas");
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;
  canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
  return canvas.toDataURL("image/jpeg").split(",")[1];
}