import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FontSettings, CSVRow, CustomField } from '@/types/generator';
import type { TextArea } from '@/components/generator/PDFViewer';

// Font family mapping to PDF standard fonts
const FONT_MAP: Record<string, StandardFonts> = {
  'Inter': StandardFonts.Helvetica,
  'Space Grotesk': StandardFonts.Helvetica,
  'Arial': StandardFonts.Helvetica,
  'Times New Roman': StandardFonts.TimesRoman,
  'Georgia': StandardFonts.TimesRoman,
  'Courier New': StandardFonts.Courier,
  'Verdana': StandardFonts.Helvetica,
  'Trebuchet MS': StandardFonts.Helvetica,
};

// Get the bold variant if weight is 600+
const getBoldFont = (fontFamily: string, weight: string): StandardFonts => {
  const isBold = parseInt(weight) >= 600;
  const font = FONT_MAP[fontFamily] || StandardFonts.Helvetica;
  
  if (isBold) {
    switch (font) {
      case StandardFonts.Helvetica: return StandardFonts.HelveticaBold;
      case StandardFonts.TimesRoman: return StandardFonts.TimesRomanBold;
      case StandardFonts.Courier: return StandardFonts.CourierBold;
      default: return StandardFonts.HelveticaBold;
    }
  }
  return font;
};

// Parse hex color to RGB (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

// New interface for dynamic fields generation
export interface GenerationConfigV2 {
  templateFile: File;
  textAreas: Record<string, TextArea | null>;
  fontSettings: Record<string, FontSettings>;
  customFields: CustomField[];
  csvData: CSVRow[];
  onProgress?: (current: number) => void;
}

// Legacy interface for backwards compatibility
export interface GenerationConfig {
  templateFile: File;
  nameArea: TextArea | null;
  idArea: TextArea | null;
  nameFontSettings: FontSettings;
  idFontSettings: FontSettings;
  csvData: CSVRow[];
  onProgress?: (current: number, total: number) => void;
}

// Draw text on a page with the given settings
async function drawTextField(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument['getPages']>[0],
  area: TextArea,
  text: string,
  settings: FontSettings,
  pageWidth: number,
  pageHeight: number,
  fontCache: Map<string, PDFFont>
): Promise<void> {
  // Get or create font
  let font: PDFFont;
  const fontKey = settings.customFont?.name || `${settings.family}-${settings.weight}`;
  
  if (fontCache.has(fontKey)) {
    font = fontCache.get(fontKey)!;
  } else {
    if (settings.customFont?.data) {
      font = await pdfDoc.embedFont(settings.customFont.data);
    } else {
      font = await pdfDoc.embedFont(getBoldFont(settings.family, settings.weight));
    }
    fontCache.set(fontKey, font);
  }

  const color = hexToRgb(settings.color);
  const x = (area.x / 100) * pageWidth;
  const y = pageHeight - ((area.y / 100) * pageHeight) - ((area.height / 100) * pageHeight);
  const areaWidth = (area.width / 100) * pageWidth;
  const areaHeight = (area.height / 100) * pageHeight;

  // Calculate text width for alignment
  const textWidth = font.widthOfTextAtSize(text, settings.size);

  let textX = x;
  if (settings.align === 'center') {
    textX = x + (areaWidth - textWidth) / 2;
  } else if (settings.align === 'right') {
    textX = x + areaWidth - textWidth;
  }

  page.drawText(text, {
    x: textX,
    y: y + areaHeight / 2 - settings.size / 2,
    size: settings.size,
    font: font,
    color: rgb(color.r, color.g, color.b),
  });
}

// Generate a single PDF with dynamic fields
export async function generateSinglePDFV2(
  templateBytes: ArrayBuffer,
  rowData: CSVRow,
  textAreas: Record<string, TextArea | null>,
  fontSettings: Record<string, FontSettings>,
  customFields: CustomField[]
): Promise<Uint8Array> {
  // Load the template PDF
  let pdfDoc: PDFDocument;
  
  try {
    pdfDoc = await PDFDocument.load(templateBytes);
  } catch {
    pdfDoc = await PDFDocument.create();
    const imageBytes = new Uint8Array(templateBytes);
    
    let image;
    try {
      image = await pdfDoc.embedPng(imageBytes);
    } catch {
      try {
        image = await pdfDoc.embedJpg(imageBytes);
      } catch {
        throw new Error('Unsupported image format. Please use PNG or JPEG.');
      }
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // Font cache to avoid re-embedding the same font
  const fontCache = new Map<string, PDFFont>();
  
  // Default font settings fallback
  const defaultSettings: FontSettings = {
    family: 'Inter',
    size: 24,
    color: '#000000',
    weight: '400',
    style: 'normal',
    align: 'center',
  };
  
  // Draw name field
  if (textAreas.name && rowData.name) {
    const settings = fontSettings.name || defaultSettings;
    await drawTextField(
      pdfDoc, firstPage, textAreas.name, rowData.name,
      settings, width, height, fontCache
    );
  }
  
  // Draw ID field
  if (textAreas.id && rowData.id) {
    const settings = fontSettings.id || defaultSettings;
    await drawTextField(
      pdfDoc, firstPage, textAreas.id, rowData.id,
      settings, width, height, fontCache
    );
  }
  
  // Draw custom fields
  for (const field of customFields) {
    const area = textAreas[field.id];
    const settings = fontSettings[field.id] || defaultSettings;
    // Get value from CSV row - try field.name as key (column name)
    const value = rowData[field.name] || rowData[field.label] || rowData[field.id];
    
    if (area && value) {
      await drawTextField(
        pdfDoc, firstPage, area, String(value),
        settings, width, height, fontCache
      );
    }
  }
  
  return pdfDoc.save();
}

// Generate certificates with dynamic fields
export async function generateCertificates(config: GenerationConfigV2 | GenerationConfig): Promise<Blob> {
  // Check if it's the new config format
  if ('textAreas' in config) {
    return generateCertificatesV2(config);
  }
  
  // Legacy format - convert to new format
  const legacyConfig = config as GenerationConfig;
  const newConfig: GenerationConfigV2 = {
    templateFile: legacyConfig.templateFile,
    textAreas: {
      name: legacyConfig.nameArea,
      id: legacyConfig.idArea,
    },
    fontSettings: {
      name: legacyConfig.nameFontSettings,
      id: legacyConfig.idFontSettings,
    },
    customFields: [],
    csvData: legacyConfig.csvData,
    onProgress: legacyConfig.onProgress ? (current) => legacyConfig.onProgress!(current, legacyConfig.csvData.length) : undefined,
  };
  
  return generateCertificatesV2(newConfig);
}

async function generateCertificatesV2(config: GenerationConfigV2): Promise<Blob> {
  const {
    templateFile,
    textAreas,
    fontSettings,
    customFields,
    csvData,
    onProgress,
  } = config;
  
  const templateBytes = await templateFile.arrayBuffer();
  const zip = new JSZip();
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    
    try {
      const pdfBytes = await generateSinglePDFV2(
        templateBytes,
        row,
        textAreas,
        fontSettings,
        customFields
      );
      
      const safeName = row.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `${String(i + 1).padStart(4, '0')}_${safeName}.pdf`;
      
      zip.file(fileName, pdfBytes);
    } catch (error) {
      console.error(`Error generating PDF for ${row.name}:`, error);
    }
    
    onProgress?.(i + 1);
  }
  
  return zip.generateAsync({ type: 'blob' });
}

// Download the ZIP file
export function downloadZip(blob: Blob, filename: string = 'certificates.zip'): void {
  saveAs(blob, filename);
}

// Generate ID cards with different output options
export type IDCardOutputType = 'individual' | 'single-per-page' | 'grid';

export interface IDCardGenerationConfig {
  templateFile: File;
  textAreas: Record<string, TextArea | null>;
  fontSettings: Record<string, FontSettings>;
  customFields: CustomField[];
  csvData: CSVRow[];
  outputType: IDCardOutputType;
  cardWidth: number; // in mm
  cardHeight: number; // in mm
  cardsPerRow?: number;
  cardsPerColumn?: number;
  onProgress?: (current: number) => void;
}

// Legacy interface
export interface IDCardGenerationConfigLegacy {
  templateFile: File;
  nameArea: TextArea | null;
  idArea: TextArea | null;
  nameFontSettings: FontSettings;
  idFontSettings: FontSettings;
  csvData: CSVRow[];
  outputType: IDCardOutputType;
  cardWidth: number;
  cardHeight: number;
  cardsPerRow?: number;
  cardsPerColumn?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function generateIDCards(config: IDCardGenerationConfig | IDCardGenerationConfigLegacy): Promise<Blob> {
  // Convert legacy config if needed
  let normalizedConfig: IDCardGenerationConfig;
  
  if ('textAreas' in config) {
    normalizedConfig = config;
  } else {
    const legacy = config as IDCardGenerationConfigLegacy;
    normalizedConfig = {
      templateFile: legacy.templateFile,
      textAreas: { name: legacy.nameArea, id: legacy.idArea },
      fontSettings: { name: legacy.nameFontSettings, id: legacy.idFontSettings },
      customFields: [],
      csvData: legacy.csvData,
      outputType: legacy.outputType,
      cardWidth: legacy.cardWidth,
      cardHeight: legacy.cardHeight,
      cardsPerRow: legacy.cardsPerRow,
      cardsPerColumn: legacy.cardsPerColumn,
      onProgress: legacy.onProgress ? (current) => legacy.onProgress!(current, legacy.csvData.length) : undefined,
    };
  }
  
  const {
    templateFile,
    textAreas,
    fontSettings,
    customFields,
    csvData,
    outputType,
    onProgress,
  } = normalizedConfig;
  
  const templateBytes = await templateFile.arrayBuffer();
  
  if (outputType === 'individual') {
    // Individual files in a ZIP
    const zip = new JSZip();
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        const pdfBytes = await generateSinglePDFV2(
          templateBytes,
          row,
          textAreas,
          fontSettings,
          customFields
        );
        
        const safeName = row.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const fileName = `${String(i + 1).padStart(4, '0')}_${safeName}.pdf`;
        
        zip.file(fileName, pdfBytes);
      } catch (error) {
        console.error(`Error generating PDF for ${row.name}:`, error);
      }
      
      onProgress?.(i + 1);
    }
    
    return zip.generateAsync({ type: 'blob' });
  }
  
  if (outputType === 'single-per-page') {
    // Single PDF with one card per page
    const masterPdf = await PDFDocument.create();
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const pdfBytes = await generateSinglePDFV2(
        templateBytes,
        row,
        textAreas,
        fontSettings,
        customFields
      );
      
      const cardPdf = await PDFDocument.load(pdfBytes);
      const [cardPage] = await masterPdf.copyPages(cardPdf, [0]);
      masterPdf.addPage(cardPage);
      
      onProgress?.(i + 1);
    }
    
    const pdfBytes = await masterPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
  
  if (outputType === 'grid') {
    // Grid layout - multiple cards per page
    const masterPdf = await PDFDocument.create();
    const cardsPerRow = normalizedConfig.cardsPerRow || 2;
    const cardsPerColumn = normalizedConfig.cardsPerColumn || 4;
    const cardsPerPage = cardsPerRow * cardsPerColumn;
    
    // A4 size in points (72 points per inch)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 20;
    
    const cardWidth = (pageWidth - margin * 2) / cardsPerRow;
    const cardHeight = (pageHeight - margin * 2) / cardsPerColumn;
    
    let currentPage = masterPdf.addPage([pageWidth, pageHeight]);
    let cardIndex = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      // Create the card PDF
      const pdfBytes = await generateSinglePDFV2(
        templateBytes,
        row,
        textAreas,
        fontSettings,
        customFields
      );
      
      const cardPdf = await PDFDocument.load(pdfBytes);
      const [embeddedPage] = await masterPdf.embedPdf(cardPdf, [0]);
      
      // Calculate position
      const col = cardIndex % cardsPerRow;
      const rowNum = Math.floor(cardIndex / cardsPerRow) % cardsPerColumn;
      
      const x = margin + col * cardWidth;
      const y = pageHeight - margin - (rowNum + 1) * cardHeight;
      
      // Draw the card
      currentPage.drawPage(embeddedPage, {
        x,
        y,
        width: cardWidth - 5,
        height: cardHeight - 5,
      });
      
      cardIndex++;
      
      // New page if needed
      if (cardIndex >= cardsPerPage && i < csvData.length - 1) {
        currentPage = masterPdf.addPage([pageWidth, pageHeight]);
        cardIndex = 0;
      }
      
      onProgress?.(i + 1);
    }
    
    const pdfBytes = await masterPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
  
  // Default fallback
  return generateIDCards({ ...normalizedConfig, outputType: 'individual' });
}
