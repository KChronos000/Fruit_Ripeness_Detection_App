import { useState, useEffect } from 'react';
import type { FruitState, AlertItem } from '@/types/fruits';
import { FRUIT_DEFS, PH_MIN, PH_MAX, stageFor } from '@/constants/fruitConstants';
import { buildInitialFruitStates } from '@/utils/fruitUtils';

export function useFruitSimulation() {
  const [dayCount, setDayCount] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [fruitStates, setFruitStates] = useState<Record<string, FruitState>>(buildInitialFruitStates);

  const addAlert = (
    zoneId: string,
    fruitName: string,
    kind: AlertItem['kind'],
    title: string,
    message: string
  ) => {
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
              if (s.anomalyTicks === 0) s.anomaly = false;
            } else {
              s.ph += f.rate + (Math.random() - 0.5) * 0.008;
              s.hum = f.humBase + Math.sin(nextDay * 0.7 + f.rate * 50) * 3 + (Math.random() - 0.5) * 1.5;
              s.temp = f.tempBase + Math.sin(nextDay * 0.4) * 1.2 + (Math.random() - 0.5) * 0.4;
              s.integrity = Math.max(0, s.integrity - (0.15 + Math.random() * 0.2));
              s.essentialOilLevel = Math.max(0, s.essentialOilLevel - 0.25);
            }

            s.ph = Math.min(PH_MAX, Math.max(PH_MIN, s.ph));
            s.history = [...s.history, s.ph].slice(-40);

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

            if (s.integrity < 35 && !s.integrityWarned) {
              s.integrityWarned = true;
              addAlert(f.zone, f.name, 'danger', 'ฟิล์มชีวภาพชำรุด', `ความสมบูรณ์ฟิล์มต่ำกว่า 35% (${s.integrity.toFixed(0)}%) ควรตรวจสอบรอยฉีกขาด`);
            }

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

  return {
    dayCount,
    setDayCount,
    paused,
    setPaused,
    alerts,
    fruitStates,
    triggerManualAnomaly,
    handleReset,
  };
}