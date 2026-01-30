import { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { CertificateWizard } from '@/components/generator/CertificateWizard';
import { IDCardWizard } from '@/components/generator/IDCardWizard';
import { PDFEditorWizard } from '@/components/generator/PDFEditorWizard';

type Module = 'home' | 'certificate' | 'idcard' | 'pdfeditor';

const Index = () => {
  const [activeModule, setActiveModule] = useState<Module>('home');

  const handleSelectModule = (module: 'certificate' | 'idcard' | 'pdfeditor') => {
    setActiveModule(module);
  };

  const handleBackToHome = () => {
    setActiveModule('home');
  };

  if (activeModule === 'certificate') {
    return <CertificateWizard onBack={handleBackToHome} />;
  }

  if (activeModule === 'idcard') {
    return <IDCardWizard onBack={handleBackToHome} />;
  }

  if (activeModule === 'pdfeditor') {
    return <PDFEditorWizard onBack={handleBackToHome} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSelectModule={handleSelectModule} />
      <Hero onSelectModule={handleSelectModule} />
    </div>
  );
};

export default Index;
