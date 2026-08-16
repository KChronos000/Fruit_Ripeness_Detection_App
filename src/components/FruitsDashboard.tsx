import { useState } from 'react';

import type { FruitState } from '@/types/fruits';

import { STAGES, PH_MIN, PH_MAX, stageFor } from '@/constants/fruitConstants';
import { buildInitialFruitStates } from '@/utils/fruitUtils';

export const FruitDashboard = () => {
  const [fruits, setFruits] = useState<Record<string, FruitState>>(buildInitialFruitStates);

  return (
    <div>
      <h2>ช่วง pH ที่กำหนด: {PH_MIN} - {PH_MAX}</h2>
      {/* วนลูปแสดงผล Stages */}
      {STAGES.map((s) => (
        <span key={s.key} className={s.bgClass}>{s.short}</span>
      ))}
    </div>
  );
};