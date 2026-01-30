import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  accept: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear?: () => void;
}

export function FileUpload({
  accept,
  title,
  description,
  icon,
  onFileSelect,
  selectedFile,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (selectedFile) {
    return (
      <div className="relative p-6 bg-success/5 border-2 border-success/30 rounded-2xl animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-secondary/50"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
        isDragging ? "bg-primary/10 scale-110" : "bg-secondary"
      )}>
        {icon || <Upload className={cn(
          "w-8 h-8 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />}
      </div>
      
      <p className="text-lg font-semibold text-foreground mb-2">{title}</p>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {description}
      </p>
      
      <div className="mt-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg">
          <Upload className="w-4 h-4" />
          Choose File
        </span>
      </div>
    </label>
  );
}
