// src/utils/fruitUtils.ts
import type { FruitState } from '@/types/fruits';
import { FRUIT_DEFS, stageFor } from '@/constants/fruitConstants';

export const buildInitialFruitStates = (): Record<string, FruitState> => {
  const initialStates: Record<string, FruitState> = {};
  
  FRUIT_DEFS.forEach((f) => {
    initialStates[f.id] = {
      def: f,
      ph: f.startPh,
      temp: f.tempBase,
      hum: f.humBase,
      integrity: 100,
      essentialOilLevel: 100,
      anomaly: false,
      anomalyTicks: 0,
      history: [f.startPh],
      lastStageKey: stageFor(f.startPh).key,
    };
  });
  
  return initialStates;
};