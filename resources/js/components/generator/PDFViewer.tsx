import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, MousePointer, Type, Trash2, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FontSettings, CustomField } from '@/types/generator';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for PDF.js using the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface TextArea {
  id: string;
  type: 'name' | 'id' | string; // string for custom field IDs
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;
type InteractionMode = 'none' | 'draw' | 'move' | 'resize';

interface PDFViewerProps {
  previewUrl: string | null;
  templateFile?: File | null;
  textAreas: Record<string, TextArea | null>;
  fontSettings: Record<string, FontSettings>;
  activeField: string | null;
  customFields?: CustomField[];
  onAreaSet: (area: TextArea, fieldType: string) => void;
  onAreaUpdate?: (area: TextArea, fieldType: string) => void;
  onClearArea: (fieldType: string) => void;
  sampleData?: Record<string, string>;
}

export function PDFViewer({
  previewUrl,
  templateFile,
  textAreas,
  fontSettings,
  activeField,
  customFields = [],
  onAreaSet,
  onAreaUpdate,
  onClearArea,
  sampleData = { name: 'John Doe', id: 'ID-12345' },
}: PDFViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pdfRenderedUrl, setPdfRenderedUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number>(8.5 / 11);
  
  // Interaction state
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [movingArea, setMovingArea] = useState<{ type: string; startX: number; startY: number; areaStartX: number; areaStartY: number } | null>(null);
  const [resizingArea, setResizingArea] = useState<{ type: string; handle: ResizeHandle; startX: number; startY: number; area: TextArea } | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  // Get all field types including custom fields
  const allFieldTypes = ['name', 'id', ...customFields.map(f => f.id)];

  // Render PDF to canvas when templateFile changes
  useEffect(() => {
    if (!templateFile) {
      setPdfRenderedUrl(null);
      return;
    }

    if (templateFile.type.startsWith('image/')) {
      setPdfRenderedUrl(previewUrl);
      if (previewUrl) {
        const img = new Image();
        img.onload = () => {
          setPdfAspectRatio(img.width / img.height);
        };
        img.src = previewUrl;
      }
      return;
    }

    if (templateFile.type === 'application/pdf') {
      setIsLoadingPdf(true);
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const typedArray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const page = await pdf.getPage(1);
          
          const scale = 2;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;
            
            setPdfRenderedUrl(canvas.toDataURL('image/png'));
            setPdfAspectRatio(viewport.width / viewport.height);
          }
        } catch (error) {
          console.error('Error rendering PDF:', error);
          setPdfRenderedUrl(previewUrl);
        } finally {
          setIsLoadingPdf(false);
        }
      };
      
      reader.readAsArrayBuffer(templateFile);
    }
  }, [templateFile, previewUrl]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getRelativePosition = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!viewerRef.current) return null;
    const rect = viewerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      isPanningRef.current = true;
      lastPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }
    
    // Check if we're starting to draw
    if (activeField && interactionMode === 'none') {
      const pos = getRelativePosition(e);
      if (!pos) return;
      
      setInteractionMode('draw');
      setDragStart(pos);
      setCurrentDrag({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  }, [isPanning, pan, activeField, interactionMode, getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - lastPan.current.x,
        y: e.clientY - lastPan.current.y,
      });
      return;
    }
    
    const pos = getRelativePosition(e);
    if (!pos) return;

    // Handle moving
    if (interactionMode === 'move' && movingArea && onAreaUpdate) {
      const area = textAreas[movingArea.type];
      if (!area) return;

      const deltaX = pos.x - movingArea.startX;
      const deltaY = pos.y - movingArea.startY;
      
      const newX = Math.max(0, Math.min(100 - area.width, movingArea.areaStartX + deltaX));
      const newY = Math.max(0, Math.min(100 - area.height, movingArea.areaStartY + deltaY));
      
      onAreaUpdate({ ...area, x: newX, y: newY }, movingArea.type);
      return;
    }

    // Handle resizing
    if (interactionMode === 'resize' && resizingArea && onAreaUpdate) {
      const { handle, startX, startY, area, type } = resizingArea;
      const deltaX = pos.x - startX;
      const deltaY = pos.y - startY;
      
      let newX = area.x;
      let newY = area.y;
      let newWidth = area.width;
      let newHeight = area.height;

      if (handle?.includes('e')) {
        newWidth = Math.max(5, area.width + deltaX);
      }
      if (handle?.includes('w')) {
        const widthChange = Math.min(deltaX, area.width - 5);
        newX = area.x + widthChange;
        newWidth = area.width - widthChange;
      }
      if (handle?.includes('s')) {
        newHeight = Math.max(3, area.height + deltaY);
      }
      if (handle?.includes('n')) {
        const heightChange = Math.min(deltaY, area.height - 3);
        newY = area.y + heightChange;
        newHeight = area.height - heightChange;
      }

      // Clamp to bounds
      newX = Math.max(0, Math.min(100 - newWidth, newX));
      newY = Math.max(0, Math.min(100 - newHeight, newY));
      
      onAreaUpdate({ ...area, x: newX, y: newY, width: newWidth, height: newHeight }, type);
      return;
    }

    // Handle drawing
    if (interactionMode === 'draw' && dragStart && activeField) {
      const x = Math.min(dragStart.x, pos.x);
      const y = Math.min(dragStart.y, pos.y);
      const width = Math.abs(pos.x - dragStart.x);
      const height = Math.abs(pos.y - dragStart.y);
      
      setCurrentDrag({ x, y, width, height });
    }
  }, [interactionMode, movingArea, resizingArea, dragStart, activeField, textAreas, getRelativePosition, onAreaUpdate]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    
    if (interactionMode === 'draw' && currentDrag && activeField && currentDrag.width > 2 && currentDrag.height > 1) {
      const newArea: TextArea = {
        id: `${activeField}-${Date.now()}`,
        type: activeField,
        ...currentDrag,
      };
      onAreaSet(newArea, activeField);
    }
    
    setInteractionMode('none');
    setDragStart(null);
    setCurrentDrag(null);
    setMovingArea(null);
    setResizingArea(null);
  }, [interactionMode, currentDrag, activeField, onAreaSet]);

  const startMove = useCallback((e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePosition(e);
    if (!pos) return;
    
    const area = textAreas[type];
    if (!area) return;
    
    setSelectedArea(type);
    setInteractionMode('move');
    setMovingArea({
      type,
      startX: pos.x,
      startY: pos.y,
      areaStartX: area.x,
      areaStartY: area.y,
    });
  }, [textAreas, getRelativePosition]);

  const startResize = useCallback((e: React.MouseEvent, type: string, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePosition(e);
    if (!pos) return;
    
    const area = textAreas[type];
    if (!area) return;
    
    setSelectedArea(type);
    setInteractionMode('resize');
    setResizingArea({
      type,
      handle,
      startX: pos.x,
      startY: pos.y,
      area: { ...area },
    });
  }, [textAreas, getRelativePosition]);

  // Get color scheme for a field type
  const getFieldColors = (type: string, index: number = 0) => {
    const colorSchemes = [
      { bg: 'bg-primary/10', border: 'border-primary', text: 'text-primary', handle: 'bg-primary', button: 'bg-primary text-primary-foreground' },
      { bg: 'bg-accent/10', border: 'border-accent', text: 'text-accent', handle: 'bg-accent', button: 'bg-accent text-accent-foreground' },
      { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-500', handle: 'bg-emerald-500', button: 'bg-emerald-500 text-white' },
      { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500', handle: 'bg-orange-500', button: 'bg-orange-500 text-white' },
      { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-500', handle: 'bg-purple-500', button: 'bg-purple-500 text-white' },
      { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-500', handle: 'bg-pink-500', button: 'bg-pink-500 text-white' },
    ];
    if (type === 'name') return colorSchemes[0];
    if (type === 'id') return colorSchemes[1];
    return colorSchemes[(index + 2) % colorSchemes.length];
  };

  const getFieldLabel = (type: string): string => {
    if (type === 'name') return 'Name';
    if (type === 'id') return 'ID';
    const customField = customFields.find(f => f.id === type);
    return customField?.label || type;
  };

  const renderTextArea = (
    area: TextArea | null,
    fieldFontSettings: FontSettings,
    label: string,
    type: string,
    sampleText: string,
    colorIndex: number = 0
  ) => {
    if (!area) return null;
    
    const isSelected = selectedArea === type;
    const colors = getFieldColors(type, colorIndex);
    
    return (
      <div
        key={area.id}
        className={cn(
          "absolute border-2 rounded-lg transition-colors group",
          isSelected ? 'border-solid' : 'border-dashed',
          colors.border,
          colors.bg
        )}
        style={{ 
          left: `${area.x}%`, 
          top: `${area.y}%`,
          width: `${area.width}%`,
          height: `${area.height}%`,
          minWidth: '50px',
          minHeight: '20px',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedArea(type);
        }}
      >
        {/* Move handle - center of area */}
        <div
          className={cn(
            "absolute inset-0 cursor-move flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          onMouseDown={(e) => startMove(e, type)}
        >
          <div className={cn("p-1 rounded", colors.handle, "text-white opacity-70")}>
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        {/* Label */}
        <div className={cn(
          "absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 cursor-move",
          colors.button
        )}
        onMouseDown={(e) => startMove(e, type)}
        >
          <Type className="w-3 h-3" />
          {label}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearArea(type);
              setSelectedArea(null);
            }}
            className="ml-1 hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        
        {/* Live text preview */}
        <div 
          className="absolute inset-0 flex items-center overflow-hidden px-1 pointer-events-none"
          style={{
            justifyContent: fieldFontSettings.align === 'left' ? 'flex-start' : fieldFontSettings.align === 'right' ? 'flex-end' : 'center',
          }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              fontFamily: fieldFontSettings.customFont ? fieldFontSettings.customFont.name : fieldFontSettings.family,
              fontSize: `${Math.min(fieldFontSettings.size * 0.6, 24)}px`,
              fontWeight: fieldFontSettings.weight,
              fontStyle: fieldFontSettings.style,
              color: fieldFontSettings.color,
            }}
          >
            {sampleText}
          </span>
        </div>

        {/* Resize handles */}
        <>
          {/* Corner handles */}
          <div 
            className={cn("absolute -top-1.5 -left-1.5 w-3 h-3 rounded-sm cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'nw')}
          />
          <div 
            className={cn("absolute -top-1.5 -right-1.5 w-3 h-3 rounded-sm cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'ne')}
          />
          <div 
            className={cn("absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-sm cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'sw')}
          />
          <div 
            className={cn("absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'se')}
          />
          {/* Edge handles */}
          <div 
            className={cn("absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-sm cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'n')}
          />
          <div 
            className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-sm cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 's')}
          />
          <div 
            className={cn("absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 rounded-sm cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'w')}
          />
          <div 
            className={cn("absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 rounded-sm cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity", colors.handle)}
            onMouseDown={(e) => startResize(e, type, 'e')}
          />
        </>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-secondary/30 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant={isPanning ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPanning(!isPanning)}
            title="Pan mode"
          >
            <Move className="w-4 h-4 mr-1" />
            Pan
          </Button>
          <Button
            variant={!isPanning ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPanning(false)}
            title="Select mode"
          >
            <MousePointer className="w-4 h-4 mr-1" />
            Select
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground min-w-[3.5rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Viewer area */}
      <div 
        ref={containerRef}
        className={cn(
          "flex-1 overflow-auto p-6",
          isPanning ? "cursor-grab active:cursor-grabbing" : 
          activeField ? "cursor-crosshair" : 
          interactionMode === 'move' ? "cursor-move" : "cursor-default"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedArea(null)}
      >
        <div
          ref={viewerRef}
          className="relative mx-auto shadow-2xl bg-white rounded-lg overflow-hidden select-none"
          style={{
            width: '100%',
            maxWidth: '700px',
            aspectRatio: pdfAspectRatio,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
        >
          {isLoadingPdf ? (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PDF...</span>
            </div>
          ) : pdfRenderedUrl || previewUrl ? (
            <img
              src={pdfRenderedUrl || previewUrl || ''}
              alt="Template preview"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <p className="text-muted-foreground">No template uploaded</p>
            </div>
          )}
          
          {/* Existing text areas */}
          {Object.entries(textAreas).map(([type, area], index) => {
            if (!area) return null;
            const fieldFontSettings = fontSettings[type] || fontSettings.name;
            const label = getFieldLabel(type);
            const sampleText = sampleData[type] || label;
            return renderTextArea(area, fieldFontSettings, label, type, sampleText, index);
          })}
          
          {/* Current drag selection */}
          {interactionMode === 'draw' && currentDrag && currentDrag.width > 0 && (
            <div
              className={cn(
                "absolute border-2 border-dashed rounded-lg pointer-events-none",
                getFieldColors(activeField || 'name').border,
                getFieldColors(activeField || 'name').bg
              )}
              style={{
                left: `${currentDrag.x}%`,
                top: `${currentDrag.y}%`,
                width: `${currentDrag.width}%`,
                height: `${currentDrag.height}%`,
              }}
            />
          )}
          
          {/* Instruction overlay */}
          {activeField && !isPanning && interactionMode === 'none' && (
            <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-6">
              <div className={cn(
                "px-4 py-2 rounded-full text-sm font-medium shadow-lg",
                getFieldColors(activeField).button
              )}>
                Click and drag to create {getFieldLabel(activeField)} text area
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
