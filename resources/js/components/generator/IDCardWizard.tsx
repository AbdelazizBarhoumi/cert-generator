import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, CreditCard, Grid3X3, Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { WizardProgress } from './WizardProgress';
import { FileUpload } from './FileUpload';
import { PDFViewer, type TextArea } from './PDFViewer';
import { FontCustomizer } from './FontCustomizer';
import { CSVUploader } from './CSVUploader';
import { GenerationProgress } from './GenerationProgress';
import { DEFAULT_FONT_SETTINGS, CARD_PRESETS, type CSVRow, type FontSettings, type CardOutputOption, type CustomField } from '@/types/generator';
import { generateIDCards, downloadZip } from '@/services/pdfGenerator';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 1, title: 'Card Size', description: 'Dimensions' },
  { id: 2, title: 'Upload Template', description: 'Card design' },
  { id: 3, title: 'Position & Style', description: 'Place & customize' },
  { id: 4, title: 'Import Data', description: 'CSV/Excel' },
  { id: 5, title: 'Output Options', description: 'Format' },
  { id: 6, title: 'Generate', description: 'Download' },
];

interface IDCardWizardProps {
  onBack: () => void;
}

export function IDCardWizard({ onBack }: IDCardWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<string>('Credit Card');
  const [customWidth, setCustomWidth] = useState(85.6);
  const [customHeight, setCustomHeight] = useState(53.98);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  
  // Dynamic text areas and font settings
  const [textAreas, setTextAreas] = useState<Record<string, TextArea | null>>({
    name: null,
    id: null,
  });
  const [fontSettings, setFontSettings] = useState<Record<string, FontSettings>>({
    name: { ...DEFAULT_FONT_SETTINGS, size: 14 },
    id: { ...DEFAULT_FONT_SETTINGS, size: 10 },
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeField, setActiveField] = useState<string | null>('name');
  
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [outputOption, setOutputOption] = useState<CardOutputOption['type']>('individual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const generatedBlobRef = useRef<Blob | null>(null);

  const handleTemplateSelect = useCallback((file: File) => {
    setTemplateFile(file);
    if (file.type.startsWith('image/')) {
      setTemplatePreview(URL.createObjectURL(file));
    } else {
      setTemplatePreview(null);
    }
    toast({
      title: "Template uploaded",
      description: `${file.name} has been loaded successfully.`,
    });
  }, [toast]);

  const handleAreaSet = useCallback((area: TextArea, fieldType: string) => {
    setTextAreas(prev => ({ ...prev, [fieldType]: area }));
    setActiveField(null);
  }, []);

  const handleAreaUpdate = useCallback((area: TextArea, fieldType: string) => {
    setTextAreas(prev => ({ ...prev, [fieldType]: area }));
  }, []);

  const handleClearArea = useCallback((fieldType: string) => {
    setTextAreas(prev => ({ ...prev, [fieldType]: null }));
  }, []);

  const handleFontSettingsChange = useCallback((fieldType: string, settings: FontSettings) => {
    setFontSettings(prev => ({ ...prev, [fieldType]: settings }));
  }, []);

  const addCustomField = useCallback(() => {
    const fieldId = `custom_${Date.now()}`;
    const newField: CustomField = {
      id: fieldId,
      name: `field${customFields.length + 1}`,
      label: `Custom Field ${customFields.length + 1}`,
    };
    setCustomFields(prev => [...prev, newField]);
    setTextAreas(prev => ({ ...prev, [fieldId]: null }));
    setFontSettings(prev => ({ ...prev, [fieldId]: { ...DEFAULT_FONT_SETTINGS, size: 10 } }));
  }, [customFields.length]);

  const removeCustomField = useCallback((fieldId: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== fieldId));
    setTextAreas(prev => {
      const { [fieldId]: _, ...rest } = prev;
      return rest;
    });
    setFontSettings(prev => {
      const { [fieldId]: _, ...rest } = prev;
      return rest;
    });
    if (activeField === fieldId) {
      setActiveField(null);
    }
  }, [activeField]);

  const updateCustomFieldLabel = useCallback((fieldId: string, label: string) => {
    setCustomFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, label, name: label.toLowerCase().replace(/\s+/g, '_') } : f
    ));
  }, []);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetData = CARD_PRESETS.find(p => p.name === preset);
    if (presetData) {
      setCustomWidth(presetData.width);
      setCustomHeight(presetData.height);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!templateFile) return;
    
    setIsGenerating(true);
    setGeneratedCount(0);
    
    try {
      const blob = await generateIDCards({
        templateFile,
        textAreas,
        fontSettings,
        customFields,
        csvData,
        outputType: outputOption,
        cardWidth: customWidth,
        cardHeight: customHeight,
        onProgress: (current) => {
          setGeneratedCount(current);
        },
      });
      
      generatedBlobRef.current = blob;
      setIsComplete(true);
      toast({
        title: "Generation complete!",
        description: `Successfully created ${csvData.length} ID cards.`,
      });
    } catch (error) {
      console.error('Error generating ID cards:', error);
      toast({
        title: "Generation failed",
        description: "An error occurred while generating ID cards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [templateFile, textAreas, fontSettings, customFields, csvData, outputOption, customWidth, customHeight, toast]);

  const handleDownload = useCallback(() => {
    if (generatedBlobRef.current) {
      if (outputOption === 'individual') {
        downloadZip(generatedBlobRef.current, 'id-cards.zip');
      } else {
        saveAs(generatedBlobRef.current, 'id-cards.pdf');
      }
    }
  }, [outputOption]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return customWidth > 0 && customHeight > 0;
      case 2:
        return templateFile !== null;
      case 3:
        return textAreas.name !== null;
      case 4:
        return csvData.length > 0;
      case 5:
        return true;
      case 6:
        return isComplete;
      default:
        return false;
    }
  };

  // Build sample data from first CSV row or defaults
  const sampleData: Record<string, string> = {
    name: csvData.length > 0 ? csvData[0].name : 'John Doe',
    id: csvData.length > 0 && csvData[0].id ? csvData[0].id : 'ID-12345',
  };
  // Add custom field values from CSV extra fields
  customFields.forEach((field, index) => {
    const csvRow = csvData[0];
    if (csvRow && csvRow.extraFields && csvRow.extraFields[field.name]) {
      sampleData[field.id] = csvRow.extraFields[field.name];
    } else {
      sampleData[field.id] = `Sample ${field.label}`;
    }
  });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Choose Card Dimensions
              </h2>
              <p className="text-muted-foreground">
                Select a standard card size or enter custom dimensions
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CARD_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetChange(preset.name)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedPreset === preset.name
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div 
                      className="w-full aspect-[1.6/1] bg-secondary rounded-lg mb-3 flex items-center justify-center"
                    >
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm text-foreground">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.width} × {preset.height} {preset.unit}</p>
                  </button>
                ))}
              </div>
              
              <div className="p-6 bg-secondary/50 rounded-2xl">
                <Label className="text-sm font-medium text-foreground mb-4 block">Custom Dimensions (mm)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Width</Label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => {
                        setCustomWidth(Number(e.target.value));
                        setSelectedPreset('');
                      }}
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">×</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Height</Label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => {
                        setCustomHeight(Number(e.target.value));
                        setSelectedPreset('');
                      }}
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Upload Your ID Card Template
              </h2>
              <p className="text-muted-foreground">
                Upload an image of your ID card design
              </p>
            </div>
            
            <FileUpload
              accept=".pdf,.png,.jpg,.jpeg"
              title="Drop your card template here"
              description="PDF, PNG, or JPG format"
              icon={<CreditCard className="w-8 h-8 text-muted-foreground" />}
              onFileSelect={handleTemplateSelect}
              selectedFile={templateFile}
              onClear={() => {
                setTemplateFile(null);
                setTemplatePreview(null);
              }}
            />
          </div>
        );
      
      case 3:
        return (
          <div className="h-[calc(100vh-260px)] min-h-[600px] animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">
                Position & Customize Text Fields
              </h2>
              <p className="text-sm text-muted-foreground">
                Draw text areas on the card and customize their appearance
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
                  activeField={activeField}
                  onAreaSet={handleAreaSet}
                  onAreaUpdate={handleAreaUpdate}
                  onClearArea={handleClearArea}
                  sampleData={sampleData}
                />
              </div>
              
              {/* Font Customizers - Side panel */}
              <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-340px)]">
                <FontCustomizer
                  title="Name Field"
                  fontSettings={fontSettings.name}
                  onChange={(settings) => handleFontSettingsChange('name', settings)}
                  accentColor="primary"
                  isActive={activeField === 'name'}
                  onActivate={() => setActiveField(activeField === 'name' ? null : 'name')}
                  hasPosition={textAreas.name !== null}
                  compact
                />
                
                <FontCustomizer
                  title="ID Field"
                  fontSettings={fontSettings.id}
                  onChange={(settings) => handleFontSettingsChange('id', settings)}
                  accentColor="accent"
                  isActive={activeField === 'id'}
                  onActivate={() => setActiveField(activeField === 'id' ? null : 'id')}
                  hasPosition={textAreas.id !== null}
                  compact
                />
                
                {/* Custom Fields */}
                {customFields.map((field, index) => (
                  <div key={field.id} className="relative">
                    <button
                      onClick={() => removeCustomField(field.id)}
                      className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <FontCustomizer
                      title={field.label}
                      fontSettings={fontSettings[field.id]}
                      onChange={(settings) => handleFontSettingsChange(field.id, settings)}
                      accentColor="secondary"
                      isActive={activeField === field.id}
                      onActivate={() => setActiveField(activeField === field.id ? null : field.id)}
                      hasPosition={textAreas[field.id] !== null}
                      editable
                      onTitleChange={(newTitle) => updateCustomFieldLabel(field.id, newTitle)}
                      compact
                    />
                  </div>
                ))}
                
                {/* Add Custom Field Button */}
                <Button
                  variant="outline"
                  onClick={addCustomField}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </Button>
                
                <div className="p-4 bg-secondary/50 rounded-xl text-sm">
                  <p className="font-medium text-foreground mb-2">💡 Tips</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Click "Draw Area" then drag</li>
                    <li>• Font changes appear live</li>
                    <li>• Use zoom for precision</li>
                    <li>• Add custom fields for extra data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Import Card Data
              </h2>
              <p className="text-muted-foreground">
                Upload a CSV or Excel file with names and IDs
              </p>
            </div>
            
            <CSVUploader onDataLoaded={setCsvData} data={csvData} />
            
            {csvData.length > 0 && (
              <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-foreground">
                      Ready to generate {csvData.length} ID cards
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Preview: "{csvData[0].name}" {csvData[0].id ? `(${csvData[0].id})` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 5:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Choose Output Format
              </h2>
              <p className="text-muted-foreground">
                How would you like your ID cards organized?
              </p>
            </div>
            
            <RadioGroup
              value={outputOption}
              onValueChange={(value) => setOutputOption(value as CardOutputOption['type'])}
              className="space-y-4"
            >
              <label className={`flex items-start gap-4 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                outputOption === 'individual' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              }`}>
                <RadioGroupItem value="individual" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-accent" />
                    <p className="font-semibold text-foreground">Individual PDFs</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each card is saved as a separate PDF file, all bundled in a ZIP
                  </p>
                </div>
              </label>
              
              <label className={`flex items-start gap-4 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                outputOption === 'single-per-page' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              }`}>
                <RadioGroupItem value="single-per-page" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-accent" />
                    <p className="font-semibold text-foreground">Single PDF (One Card Per Page)</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All cards in one PDF document, each card on its own page
                  </p>
                </div>
              </label>
              
              <label className={`flex items-start gap-4 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                outputOption === 'grid' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              }`}>
                <RadioGroupItem value="grid" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Grid3X3 className="w-5 h-5 text-accent" />
                    <p className="font-semibold text-foreground">Grid Layout</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Multiple cards per page in a grid arrangement for easy printing
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        );
      
      case 6:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <GenerationProgress
              isGenerating={isGenerating}
              current={generatedCount}
              total={csvData.length}
              onStartGeneration={handleGenerate}
              onDownload={handleDownload}
              isComplete={isComplete}
            />
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
              <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                ID Card Maker
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
            
            {currentStep < 6 ? (
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
                disabled={!isComplete}
                className="gap-2"
              >
                Create More
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
