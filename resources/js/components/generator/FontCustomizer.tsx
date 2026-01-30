import { useRef, useState } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, MousePointer, Upload, X, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FONT_FAMILIES, FONT_WEIGHTS, type FontSettings } from '@/types/generator';

interface FontCustomizerProps {
  title: string;
  fontSettings: FontSettings;
  onChange: (settings: FontSettings) => void;
  accentColor?: 'primary' | 'accent';
  isActive: boolean;
  onActivate: () => void;
  hasPosition: boolean;
  compact?: boolean;
  editable?: boolean;
  onTitleChange?: (newTitle: string) => void;
}

export function FontCustomizer({
  title,
  fontSettings,
  onChange,
  accentColor = 'primary',
  isActive,
  onActivate,
  hasPosition,
  compact = false,
  editable = false,
  onTitleChange,
}: FontCustomizerProps) {
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  
  const updateSetting = <K extends keyof FontSettings>(key: K, value: FontSettings[K]) => {
    onChange({ ...fontSettings, [key]: value });
  };

  const handleFontUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
      
      // Create a FontFace and load it for preview
      const fontUrl = URL.createObjectURL(file);
      const fontFace = new FontFace(fontName, `url(${fontUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      
      onChange({
        ...fontSettings,
        customFont: {
          name: fontName,
          data: arrayBuffer,
          file: file,
        },
      });
    } catch (error) {
      console.error('Error loading custom font:', error);
    }
  };

  const handleSaveTitle = () => {
    if (onTitleChange && editTitle.trim()) {
      onTitleChange(editTitle.trim());
    }
    setIsEditing(false);
  };

  const clearCustomFont = () => {
    onChange({
      ...fontSettings,
      customFont: undefined,
    });
  };

  const colorClasses = accentColor === 'primary' 
    ? { border: 'border-primary', bg: 'bg-primary/5', iconBg: 'bg-primary/10', icon: 'text-primary', button: 'default' as const }
    : { border: 'border-accent', bg: 'bg-accent/5', iconBg: 'bg-accent/10', icon: 'text-accent', button: 'accent' as const };

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all duration-300",
      isActive ? `${colorClasses.border} ${colorClasses.bg}` : "border-border bg-card hover:border-border/80"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClasses.iconBg)}>
            <Type className={cn("w-4 h-4", colorClasses.icon)} />
          </div>
          <div>
            {editable && isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="font-semibold text-sm text-foreground bg-transparent border-b border-primary outline-none w-24"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <button onClick={handleSaveTitle} className="p-0.5 hover:bg-secondary rounded">
                  <Check className="w-3 h-3 text-primary" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                {editable && (
                  <button onClick={() => { setEditTitle(title); setIsEditing(true); }} className="p-0.5 hover:bg-secondary rounded">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {hasPosition ? '✓ Area set' : 'Drag on template'}
            </p>
          </div>
        </div>
        
        <Button
          variant={isActive ? colorClasses.button : "outline"}
          size="sm"
          onClick={onActivate}
          className="gap-1"
        >
          <MousePointer className="w-3 h-3" />
          {isActive ? 'Drawing...' : 'Draw Area'}
        </Button>
      </div>
      
      <div className={cn("space-y-4", compact ? "grid grid-cols-2 gap-3 space-y-0" : "")}>
        {/* Font Family */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Font</Label>
          {fontSettings.customFont ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background">
              <span className="text-sm truncate flex-1" style={{ fontFamily: fontSettings.customFont.name }}>
                {fontSettings.customFont.name}
              </span>
              <button
                onClick={clearCustomFont}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Select
              value={fontSettings.family}
              onValueChange={(value) => {
                if (value === '__upload__') {
                  fontInputRef.current?.click();
                } else {
                  updateSetting('family', value);
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__upload__">
                  <span className="flex items-center gap-2">
                    <Upload className="w-3 h-3" />
                    Upload Custom Font
                  </span>
                </SelectItem>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input
            ref={fontInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFontUpload(file);
              e.target.value = '';
            }}
          />
        </div>
        
        {/* Font Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <span className="text-xs font-medium text-foreground">{fontSettings.size}px</span>
          </div>
          <Slider
            value={[fontSettings.size]}
            onValueChange={([value]) => updateSetting('size', value)}
            min={8}
            max={72}
            step={1}
            className="py-1"
          />
        </div>
        
        {/* Font Weight */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <Select
            value={fontSettings.weight}
            onValueChange={(value) => updateSetting('weight', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  <span style={{ fontWeight: weight.value }}>{weight.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Font Color */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fontSettings.color}
              onChange={(e) => updateSetting('color', e.target.value)}
              className="w-9 h-9 rounded-lg border border-border cursor-pointer"
            />
            <input
              type="text"
              value={fontSettings.color}
              onChange={(e) => updateSetting('color', e.target.value)}
              className="flex-1 h-9 px-2 rounded-lg border border-border bg-background text-xs font-mono"
            />
          </div>
        </div>
      </div>
      
      {/* Style & Alignment - always full width */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-border">
        {/* Style buttons */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <div className="flex gap-1">
            <Button
              variant={fontSettings.weight >= '600' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => updateSetting('weight', fontSettings.weight >= '600' ? '400' : '700')}
            >
              <Bold className="w-3 h-3" />
            </Button>
            <Button
              variant={fontSettings.style === 'italic' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => updateSetting('style', fontSettings.style === 'italic' ? 'normal' : 'italic')}
            >
              <Italic className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Alignment */}
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground">Align</Label>
          <div className="flex gap-1">
            <Button
              variant={fontSettings.align === 'left' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => updateSetting('align', 'left')}
            >
              <AlignLeft className="w-3 h-3" />
            </Button>
            <Button
              variant={fontSettings.align === 'center' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => updateSetting('align', 'center')}
            >
              <AlignCenter className="w-3 h-3" />
            </Button>
            <Button
              variant={fontSettings.align === 'right' ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => updateSetting('align', 'right')}
            >
              <AlignRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Live Preview */}
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div 
            className="h-8 px-2 bg-white rounded-lg border border-border flex items-center overflow-hidden"
            style={{ justifyContent: fontSettings.align === 'left' ? 'flex-start' : fontSettings.align === 'right' ? 'flex-end' : 'center' }}
          >
            <span
              className="truncate"
              style={{
                fontFamily: fontSettings.customFont ? fontSettings.customFont.name : fontSettings.family,
                fontSize: `${Math.min(fontSettings.size, 18)}px`,
                fontWeight: fontSettings.weight,
                fontStyle: fontSettings.style,
                color: fontSettings.color,
              }}
            >
              {title === 'Name Field' ? 'John Doe' : 'ID-12345'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
