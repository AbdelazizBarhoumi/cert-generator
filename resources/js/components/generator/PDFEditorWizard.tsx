import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, FileText, Type, Download, Plus, X, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { WizardProgress } from './WizardProgress';
import { FileUpload } from './FileUpload';
import { PDFViewer, type TextArea } from './PDFViewer';
import { FontCustomizer } from './FontCustomizer';
import { DEFAULT_FONT_SETTINGS, type FontSettings, type CustomField } from '@/types/generator';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 1, title: 'Upload PDF', description: 'Your document' },
  { id: 2, title: 'Add Text Fields', description: 'Position & style' },
  { id: 3, title: 'Export', description: 'Download' },
];

interface PDFEditorWizardProps {
  onBack: () => void;
}

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

interface TextField {
  id: string;
  label: string;
  text: string;
  area: TextArea | null;
  fontSettings: FontSettings;
}

export function PDFEditorWizard({ onBack }: PDFEditorWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  
  // Text fields for the editor
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const generatedBlobRef = useRef<Blob | null>(null);

  const handleTemplateSelect = useCallback((file: File) => {
    setTemplateFile(file);
    if (file.type.startsWith('image/')) {
      setTemplatePreview(URL.createObjectURL(file));
    } else {
      setTemplatePreview(null);
    }
    toast({
      title: "PDF uploaded",
      description: `${file.name} has been loaded successfully.`,
    });
  }, [toast]);

  const addTextField = useCallback(() => {
    const newField: TextField = {
      id: `field_${Date.now()}`,
      label: `Text ${textFields.length + 1}`,
      text: 'Sample Text',
      area: null,
      fontSettings: { ...DEFAULT_FONT_SETTINGS },
    };
    setTextFields(prev => [...prev, newField]);
    setActiveFieldId(newField.id);
  }, [textFields.length]);

  const removeTextField = useCallback((fieldId: string) => {
    setTextFields(prev => prev.filter(f => f.id !== fieldId));
    if (activeFieldId === fieldId) {
      setActiveFieldId(null);
    }
  }, [activeFieldId]);

  const updateTextField = useCallback((fieldId: string, updates: Partial<TextField>) => {
    setTextFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    ));
  }, []);

  const handleAreaSet = useCallback((area: TextArea, fieldType: string) => {
    setTextFields(prev => prev.map(f => 
      f.id === fieldType ? { ...f, area } : f
    ));
    setActiveFieldId(null);
  }, []);

  const handleAreaUpdate = useCallback((area: TextArea, fieldType: string) => {
    setTextFields(prev => prev.map(f => 
      f.id === fieldType ? { ...f, area } : f
    ));
  }, []);

  const handleClearArea = useCallback((fieldType: string) => {
    setTextFields(prev => prev.map(f => 
      f.id === fieldType ? { ...f, area: null } : f
    ));
  }, []);

  const handleFontSettingsChange = useCallback((fieldId: string, settings: FontSettings) => {
    setTextFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, fontSettings: settings } : f
    ));
  }, []);

  // Convert textFields to the format PDFViewer expects
  const textAreas = textFields.reduce((acc, field) => {
    acc[field.id] = field.area;
    return acc;
  }, {} as Record<string, TextArea | null>);

  const fontSettings = textFields.reduce((acc, field) => {
    acc[field.id] = field.fontSettings;
    return acc;
  }, {} as Record<string, FontSettings>);

  const customFields: CustomField[] = textFields.map(f => ({
    id: f.id,
    name: f.id,
    label: f.label,
  }));

  const sampleData = textFields.reduce((acc, field) => {
    acc[field.id] = field.text;
    return acc;
  }, {} as Record<string, string>);

  const handleExport = useCallback(async () => {
    if (!templateFile) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const templateBytes = await templateFile.arrayBuffer();
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
      
      setExportProgress(30);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width: pageWidth, height: pageHeight } = firstPage.getSize();
      
      // Font cache
      const fontCache = new Map<string, PDFFont>();
      
      // Draw all text fields
      for (const field of textFields) {
        if (!field.area || !field.text) continue;
        
        const settings = field.fontSettings;
        
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
        const x = (field.area.x / 100) * pageWidth;
        const y = pageHeight - ((field.area.y / 100) * pageHeight) - ((field.area.height / 100) * pageHeight);
        const areaWidth = (field.area.width / 100) * pageWidth;
        const areaHeight = (field.area.height / 100) * pageHeight;
        
        // Calculate text width for alignment
        const textWidth = font.widthOfTextAtSize(field.text, settings.size);
        
        let textX = x;
        if (settings.align === 'center') {
          textX = x + (areaWidth - textWidth) / 2;
        } else if (settings.align === 'right') {
          textX = x + areaWidth - textWidth;
        }
        
        firstPage.drawText(field.text, {
          x: textX,
          y: y + areaHeight / 2 - settings.size / 2,
          size: settings.size,
          font: font,
          color: rgb(color.r, color.g, color.b),
        });
      }
      
      setExportProgress(70);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      generatedBlobRef.current = blob;
      
      setExportProgress(100);
      
      toast({
        title: "PDF exported!",
        description: "Your edited PDF is ready for download.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [templateFile, textFields, toast]);

  const handleDownload = useCallback(() => {
    if (generatedBlobRef.current) {
      const fileName = templateFile?.name?.replace(/\.[^/.]+$/, '') || 'edited';
      saveAs(generatedBlobRef.current, `${fileName}_edited.pdf`);
    }
  }, [templateFile]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return templateFile !== null;
      case 2:
        return true; // Can proceed even without text fields
      case 3:
        return exportProgress === 100;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Upload Your PDF
              </h2>
              <p className="text-muted-foreground">
                Upload a PDF or image file to edit
              </p>
            </div>
            
            <FileUpload
              accept=".pdf,.png,.jpg,.jpeg"
              title="Drop your PDF here"
              description="PDF, PNG, or JPG format"
              icon={<FileText className="w-8 h-8 text-muted-foreground" />}
              onFileSelect={handleTemplateSelect}
              selectedFile={templateFile}
              onClear={() => {
                setTemplateFile(null);
                setTemplatePreview(null);
              }}
            />
          </div>
        );
      
      case 2:
        return (
          <div className="h-[calc(100vh-260px)] min-h-[600px] animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">
                Add & Edit Text Fields
              </h2>
              <p className="text-sm text-muted-foreground">
                Add text fields, position them, and customize their appearance
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-80px)]">
              {/* PDF Viewer - Main area */}
              <div className="lg:col-span-2 h-full">
                <PDFViewer
                  previewUrl={templatePreview}
                  templateFile={templateFile}
                  textAreas={textAreas}
                  fontSettings={fontSettings}
                  customFields={customFields}
                  activeField={activeFieldId}
                  onAreaSet={handleAreaSet}
                  onAreaUpdate={handleAreaUpdate}
                  onClearArea={handleClearArea}
                  sampleData={sampleData}
                />
              </div>
              
              {/* Text Fields Panel */}
              <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-340px)]">
                {/* Add Field Button */}
                <Button
                  variant="outline"
                  onClick={addTextField}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Text Field
                </Button>
                
                {/* Text Fields List */}
                {textFields.map((field) => (
                  <div key={field.id} className="relative border rounded-xl p-4 space-y-3">
                    {/* Delete button */}
                    <button
                      onClick={() => removeTextField(field.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {/* Label */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateTextField(field.id, { label: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Field label"
                      />
                    </div>
                    
                    {/* Text Content */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Text Content</Label>
                      <textarea
                        value={field.text}
                        onChange={(e) => updateTextField(field.id, { text: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
                        rows={2}
                        placeholder="Enter text..."
                      />
                    </div>
                    
                    {/* Font Settings */}
                    <FontCustomizer
                      title={field.label}
                      fontSettings={field.fontSettings}
                      onChange={(settings) => handleFontSettingsChange(field.id, settings)}
                      accentColor="primary"
                      isActive={activeFieldId === field.id}
                      onActivate={() => setActiveFieldId(activeFieldId === field.id ? null : field.id)}
                      hasPosition={field.area !== null}
                      editable
                      onTitleChange={(newTitle) => updateTextField(field.id, { label: newTitle })}
                      compact
                    />
                  </div>
                ))}
                
                {textFields.length === 0 && (
                  <div className="p-6 bg-secondary/50 rounded-xl text-center">
                    <Type className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No text fields added yet.<br />
                      Click "Add Text Field" to get started.
                    </p>
                  </div>
                )}
                
                <div className="p-4 bg-secondary/50 rounded-xl text-sm">
                  <p className="font-medium text-foreground mb-2">💡 Tips</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Click "Draw Area" then drag on the PDF</li>
                    <li>• Enter your text in the "Text Content" box</li>
                    <li>• Customize font, size, and color</li>
                    <li>• Preview changes live on the PDF</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Export Your PDF
              </h2>
              <p className="text-muted-foreground">
                Download your edited PDF with all the text fields
              </p>
            </div>
            
            <div className="p-8 bg-card rounded-2xl border border-border text-center space-y-6">
              {exportProgress === 0 ? (
                <>
                  <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
                    <Download className="w-10 h-10 text-primary-foreground" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Ready to Export
                    </h3>
                    <p className="text-muted-foreground">
                      {textFields.length} text field{textFields.length !== 1 ? 's' : ''} will be added to your PDF
                    </p>
                  </div>
                  
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Export PDF
                      </>
                    )}
                  </Button>
                </>
              ) : exportProgress < 100 ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Exporting...
                    </h3>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {exportProgress}% complete
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10 text-success" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Export Complete! 🎉
                    </h3>
                    <p className="text-muted-foreground">
                      Your PDF is ready for download
                    </p>
                  </div>
                  
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                PDF Editor
              </span>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </header>
      
      {/* Progress */}
      <WizardProgress steps={STEPS} currentStep={currentStep} />
      
      {/* Content */}
      <main className="container mx-auto px-4 py-4 pb-24">
        {renderStepContent()}
      </main>
      
      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </div>
            
            {currentStep < 3 ? (
              <Button
                variant="hero"
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                onClick={onBack}
                disabled={exportProgress !== 100}
                className="gap-2"
              >
                Done
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
