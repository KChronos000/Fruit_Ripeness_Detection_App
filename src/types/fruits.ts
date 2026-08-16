export interface FruitDef {
  id: string;
  zone: string;
  name: string;
  startPh: number;
  rate: number;
  tempBase: number;
  humBase: number;
  imageHint?: string;
}

export interface StageInfo {
  key: string;
  short: string;
  full: string;
  color: string;
  bgClass: string;
  max: number;
}

export interface FruitState {
  def: FruitDef;
  ph: number;
  temp: number;
  hum: number;
  integrity: number; // 0 - 100%
  essentialOilLevel: number; // 0 - 100%
  anomaly: boolean;
  anomalyTicks: number;
  anomalyReason?: string;
  history: number[];
  lastStageKey: string;
  integrityWarned?: boolean;
}

export type AlertKind = 'info' | 'stage' | 'danger' | 'success';

export interface AlertItem {
  id: string;
  time: string;
  day: number;
  zoneId?: string;
  kind: AlertKind;
  title: string;
  message: string;
}

export interface AIAnalysisResult {
  phEstimate: number;
  temperature: number;
  humidity: number;
  shelfLifeDays: number;
  filmIntegrity: number;
  essentialOilLevel: number;
  stageName: string;
  filmColor: string;
  pestOrMoldDetected: boolean;
  confidence: number;
  recommendation: string;
  details: string;
}