import { useState, useEffect } from 'react';
import { FileCheck, Download, CheckCircle, Loader2, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface GenerationProgressProps {
  isGenerating: boolean;
  current: number;
  total: number;
  onStartGeneration: () => void;
  onDownload: () => void;
  isComplete: boolean;
}

export function GenerationProgress({
  isGenerating,
  current,
  total,
  onStartGeneration,
  onDownload,
  isComplete,
}: GenerationProgressProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const progress = total > 0 ? (current / total) * 100 : 0;

  useEffect(() => {
    if (isComplete) {
      setShowSuccess(true);
    }
  }, [isComplete]);

  if (isComplete && showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-8">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        
        <h2 className="font-display text-3xl font-bold text-foreground mb-4">
          Generation Complete!
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          Successfully created <span className="font-semibold text-foreground">{total}</span> personalized documents
        </p>
        
        <div className="flex items-center gap-4 p-6 bg-secondary/50 rounded-2xl mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Archive className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">certificates.zip</p>
            <p className="text-sm text-muted-foreground">{total} PDF files • Ready to download</p>
          </div>
        </div>
        
        <Button variant="hero" size="xl" onClick={onDownload} className="gap-3">
          <Download className="w-5 h-5" />
          Download ZIP File
        </Button>
        
        <p className="text-sm text-muted-foreground mt-6">
          Your files will be packaged into a single ZIP archive
        </p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-secondary" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-10 h-10 text-primary" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Generating Documents...
        </h2>
        
        <p className="text-muted-foreground mb-8">
          Processing {current} of {total} files
        </p>
        
        <div className="w-full max-w-md">
          <Progress value={progress} className="h-3 mb-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>{total - current} remaining</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-10 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                i < current 
                  ? "bg-success/10 border-success" 
                  : i === current 
                    ? "bg-primary/10 border-primary animate-pulse" 
                    : "bg-secondary border-border"
              )}
            >
              {i < current ? (
                <FileCheck className="w-5 h-5 text-success" />
              ) : i === current ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          ))}
          {total > 8 && (
            <div className="w-10 h-12 rounded-lg border-2 border-border bg-secondary flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{total - 8}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <FileText className="w-12 h-12 text-primary" />
      </div>
      
      <h2 className="font-display text-3xl font-bold text-foreground mb-4">
        Ready to Generate
      </h2>
      
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
        You're about to create <span className="font-semibold text-foreground">{total}</span> personalized 
        documents. This may take a few moments.
      </p>
      
      <Button variant="hero" size="xl" onClick={onStartGeneration} className="gap-3">
        <FileCheck className="w-5 h-5" />
        Generate {total} Documents
      </Button>
    </div>
  );
}
