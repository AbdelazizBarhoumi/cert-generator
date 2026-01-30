import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, FileText, Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress } from './WizardProgress';
import { FileUpload } from './FileUpload';
import { PDFViewer, type TextArea } from './PDFViewer';
import { FontCustomizer } from './FontCustomizer';
import { CSVUploader } from './CSVUploader';
import { GenerationProgress } from './GenerationProgress';
import { DEFAULT_FONT_SETTINGS, type CSVRow, type FontSettings, type CustomField } from '@/types/generator';
import { generateCertificates, downloadZip } from '@/services/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

const STEPS = [
  { id: 1, title: 'Upload Template', description: 'PDF certificate template' },
  { id: 2, title: 'Position & Style', description: 'Place text & customize' },
  { id: 3, title: 'Import Data', description: 'CSV/Excel file' },
  { id: 4, title: 'Generate', description: 'Download ZIP' },
];

interface CertificateWizardProps {
  onBack: () => void;
}

export function CertificateWizard({ onBack }: CertificateWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  
  // Dynamic text areas and font settings
  const [textAreas, setTextAreas] = useState<Record<string, TextArea | null>>({
    name: null,
    id: null,
  });
  const [fontSettings, setFontSettings] = useState<Record<string, FontSettings>>({
    name: DEFAULT_FONT_SETTINGS,
    id: { ...DEFAULT_FONT_SETTINGS, size: 16 },
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeField, setActiveField] = useState<string | null>('name');
  
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const generatedZipRef = useRef<Blob | null>(null);

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
    setFontSettings(prev => ({ ...prev, [fieldId]: { ...DEFAULT_FONT_SETTINGS, size: 14 } }));
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

  const handleGenerate = useCallback(async () => {
    if (!templateFile) return;
    
    setIsGenerating(true);
    setGeneratedCount(0);
    
    try {
      const zipBlob = await generateCertificates({
        templateFile,
        textAreas,
        fontSettings,
        customFields,
        csvData,
        onProgress: (current) => {
          setGeneratedCount(current);
        },
      });
      
      generatedZipRef.current = zipBlob;
      setIsComplete(true);
      toast({
        title: "Generation complete!",
        description: `Successfully created ${csvData.length} certificates.`,
      });
    } catch (error) {
      console.error('Error generating certificates:', error);
      toast({
        title: "Generation failed",
        description: "An error occurred while generating certificates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [templateFile, textAreas, fontSettings, customFields, csvData, toast]);

  const handleDownload = useCallback(() => {
    if (generatedZipRef.current) {
      downloadZip(generatedZipRef.current, 'certificates.zip');
    }
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return templateFile !== null;
      case 2:
        return textAreas.name !== null;
      case 3:
        return csvData.length > 0;
      case 4:
        return isComplete;
      default:
        return false;
    }
  };

  // Get sample data for preview
  const sampleData: Record<string, string> = {
    name: csvData.length > 0 ? csvData[0].name : 'John Doe',
    id: csvData.length > 0 && csvData[0].id ? csvData[0].id : 'ID-12345',
  };
  
  // Add custom field sample data
  customFields.forEach(field => {
    sampleData[field.id] = csvData.length > 0 && csvData[0][field.name] 
      ? csvData[0][field.name]! 
      : field.label;
  });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                Upload Your Certificate Template
              </h2>
              <p className="text-muted-foreground">
                Upload a PDF or image of your certificate design. This will be used as the base for all generated certificates.
              </p>
            </div>
            
            <FileUpload
              accept=".pdf,.png,.jpg,.jpeg"
              title="Drop your template here"
              description="PDF, PNG, or JPG format • Max 50MB"
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
                Position & Customize Text Fields
              </h2>
              <p className="text-sm text-muted-foreground">
                Draw text areas on the template and customize their appearance. Changes appear live!
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
                  activeField={activeField}
                  customFields={customFields}
                  onAreaSet={handleAreaSet}
                  onAreaUpdate={handleAreaUpdate}
                  onClearArea={handleClearArea}
                  sampleData={sampleData}
                />
              </div>
              
              {/* Font Customizers - Side panel */}
              <div className="space-y-4 overflow-y-auto max-h-full pr-2">
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
                  title="ID Field (Optional)"
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
                    <FontCustomizer
                      title={field.label}
                      fontSettings={fontSettings[field.id] || DEFAULT_FONT_SETTINGS}
                      onChange={(settings) => handleFontSettingsChange(field.id, settings)}
                      accentColor={index % 2 === 0 ? "primary" : "accent"}
                      isActive={activeField === field.id}
                      onActivate={() => setActiveField(activeField === field.id ? null : field.id)}
                      hasPosition={textAreas[field.id] !== null}
                      compact
                      onTitleChange={(newLabel) => updateCustomFieldLabel(field.id, newLabel)}
                      editable
                    />
                    <button
                      onClick={() => removeCustomField(field.id)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add Custom Field Button */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={addCustomField}
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </Button>
                
                {/* Quick tip */}
                <div className="p-4 bg-secondary/50 rounded-xl text-sm">
                  <p className="font-medium text-foreground mb-2">💡 Quick Tips</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Click "Draw Area" then drag on template</li>
                    <li>• Add custom fields for extra columns</li>
                    <li>• Font changes appear instantly</li>
                    <li>• Use zoom for precise placement</li>
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
                Import Your Data
              </h2>
              <p className="text-muted-foreground">
                Upload a CSV or Excel file with recipient names and optional IDs
              </p>
            </div>
            
            <CSVUploader onDataLoaded={setCsvData} data={csvData} />
            
            {csvData.length > 0 && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      Ready to generate {csvData.length} certificates
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
      
      case 4:
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
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                Certificate Generator
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
            
            {currentStep < 4 ? (
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
