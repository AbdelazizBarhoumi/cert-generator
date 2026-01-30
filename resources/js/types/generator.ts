export interface TextPosition {
  x: number;
  y: number;
  id: string;
  type: 'name' | 'id' | 'custom';
}

export interface CustomFont {
  name: string;
  file: File;
  data?: ArrayBuffer;
  dataUrl?: string;
}

export interface FontSettings {
  family: string;
  size: number;
  color: string;
  weight: string;
  style: 'normal' | 'italic';
  align: 'left' | 'center' | 'right';
  customFont?: CustomFont;
}

export interface TextFieldConfig {
  position: TextPosition | null;
  fontSettings: FontSettings;
}

// Custom field definition
export interface CustomField {
  id: string;
  name: string; // Column name in CSV (e.g., "department", "title")
  label: string; // Display label (e.g., "Department", "Job Title")
}

export interface CSVRow {
  name: string;
  id?: string;
  [key: string]: string | undefined;
}

export interface GeneratorState {
  currentStep: number;
  templateFile: File | null;
  templatePreview: string | null;
  nameField: TextFieldConfig;
  idField: TextFieldConfig;
  csvData: CSVRow[];
  isGenerating: boolean;
  generatedCount: number;
  totalCount: number;
}

export interface CardDimensions {
  width: number;
  height: number;
  preset: string | null;
}

export interface CardOutputOption {
  type: 'individual' | 'single-per-page' | 'grid';
  cardsPerRow?: number;
  cardsPerColumn?: number;
}

export const FONT_FAMILIES = [
  'Inter',
  'Space Grotesk',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
];

export const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

export const CARD_PRESETS = [
  { name: 'Credit Card', width: 85.6, height: 53.98, unit: 'mm' },
  { name: 'ID Card (CR80)', width: 85.6, height: 54, unit: 'mm' },
  { name: 'Business Card', width: 89, height: 51, unit: 'mm' },
  { name: 'A7', width: 74, height: 105, unit: 'mm' },
];

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  family: 'Inter',
  size: 24,
  color: '#1a1a2e',
  weight: '600',
  style: 'normal',
  align: 'center',
};
