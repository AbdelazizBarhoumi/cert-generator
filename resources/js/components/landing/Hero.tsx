import { FileText, CreditCard, ArrowRight, Sparkles, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onSelectModule: (module: 'certificate' | 'idcard' | 'pdfeditor') => void;
}

export function Hero({ onSelectModule }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>Generate hundreds of documents in seconds</span>
          </div>
          
          {/* Headline */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="text-foreground">Create </span>
            <span className="text-gradient">Certificates</span>
            <span className="text-foreground"> & </span>
            <span className="text-gradient">ID Cards</span>
            <span className="text-foreground"> at Scale</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Upload your template, position the text fields, import your data, and download personalized documents in bulk.
          </p>
          
          {/* CTA Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Certificate Generator Card */}
            <button
              onClick={() => onSelectModule('certificate')}
              className="group relative p-8 bg-card rounded-2xl border border-border shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-primary-foreground" />
                </div>
                
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                  Certificate Generator
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Perfect for diplomas, awards, training certificates, and official documents.
                </p>
                
                <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-4 transition-all">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
            
            {/* ID Card Maker Card */}
            <button
              onClick={() => onSelectModule('idcard')}
              className="group relative p-8 bg-card rounded-2xl border border-border shadow-lg hover:shadow-xl hover:border-accent/30 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7 text-accent-foreground" />
                </div>
                
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                  ID Card Maker
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Create employee badges, membership cards, event passes, and more.
                </p>
                
                <div className="flex items-center gap-2 text-accent font-medium group-hover:gap-4 transition-all">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
            
            {/* PDF Editor Card */}
            <button
              onClick={() => onSelectModule('pdfeditor')}
              className="group relative p-8 bg-card rounded-2xl border border-border shadow-lg hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <Edit3 className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                  PDF Editor
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  Add text, edit content, and customize any PDF document easily.
                </p>
                
                <div className="flex items-center gap-2 text-purple-500 font-medium group-hover:gap-4 transition-all">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
          
          {/* Features list */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>No signup required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Unlimited documents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Instant ZIP download</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
