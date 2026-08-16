export async function analyzeFilmWithAI(
  base64Image: string,
  context?: { zone?: string; temperature?: string; humidity?: string }
) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const contextLines: string[] = [];
  if (context?.zone) contextLines.push(`- โซน/สถานที่เก็บ: ${context.zone}`);
  if (context?.temperature) contextLines.push(`- อุณหภูมิแวดล้อมที่วัดได้จริง: ${context.temperature} °C`);
  if (context?.humidity) contextLines.push(`- ความชื้นสัมพัทธ์แวดล้อมที่วัดได้จริง: ${context.humidity} %`);

  const contextBlock = contextLines.length
    ? `\n\nข้อมูลเสริมจากผู้ใช้ (ใช้ประกอบการประเมิน หากมีให้ใช้ค่านี้แทนการเดาในส่วน temperature/humidity):\n${contextLines.join('\n')}`
    : '';

  const prompt = `คุณคือระบบวิเคราะห์ฟิล์มชีวภาพอัจฉริยะที่มีสารสีแอนโทไซยานิน (anthocyanin indicator)
วิเคราะห์ภาพฟิล์มหรือผลไม้ในภาพนี้ตามตารางอ้างอิงสี-pH:
- สีแดง = pH 1.0-3.0 (ยังดิบ - กรดสูง)
- สีแดงอ่อน/ชมพู = pH 4.0-5.0 (กำลังสุก)
- สีม่วง = pH 7.0-8.0 (สุกพอดี)
- น้ำเงิน = pH > 8.0 (เน่าเสียมาก)

ประเมินทุกค่าจากลักษณะที่เห็นในภาพจริง (สี, ร่องรอยเชื้อรา, ความเสียหาย)${contextBlock}

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${API_KEY}`,
    {
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
  const parsed = JSON.parse(clean);

  // ค่าที่ผู้ใช้กรอกเองมีความน่าเชื่อถือกว่าค่าที่ AI เดาจากภาพ จึง override ทับ
  if (context?.temperature) parsed.temperature = parseFloat(context.temperature);
  if (context?.humidity) parsed.humidity = parseFloat(context.humidity);
  if (context?.zone) parsed.zone = context.zone;

  return parsed;
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