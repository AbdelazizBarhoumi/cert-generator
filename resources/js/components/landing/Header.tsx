import { FileText, CreditCard, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSelectModule: (module: 'certificate' | 'idcard' | 'pdfeditor') => void;
}

export function Header({ onSelectModule }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              DocuGen
            </span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => onSelectModule('certificate')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Certificates</span>
            </button>
            <button 
              onClick={() => onSelectModule('idcard')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>ID Cards</span>
            </button>
            <button 
              onClick={() => onSelectModule('pdfeditor')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>PDF Editor</span>
            </button>
          </nav>
          
          {/* CTA */}
          <Button variant="hero" size="sm" onClick={() => onSelectModule('certificate')}>
            Start Creating
          </Button>
        </div>
      </div>
    </header>
  );
}
