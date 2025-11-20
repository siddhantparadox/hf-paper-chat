import React, { useState } from 'react';
import { Header } from './components/Header';
import { PaperList } from './components/PaperList';
import { PaperDetail } from './components/PaperDetail';
import { Paper, ViewState } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setView(ViewState.PAPER_DETAIL);
    window.scrollTo(0, 0);
  };

  const handleGoHome = () => {
    setSelectedPaper(null);
    setView(ViewState.HOME);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-black">
      <Header 
        currentView={view} 
        onHomeClick={handleGoHome} 
        onPaperSubmit={handleSelectPaper}
      />
      
      {view === ViewState.HOME && (
        <PaperList onSelectPaper={handleSelectPaper} />
      )}

      {view === ViewState.PAPER_DETAIL && selectedPaper && (
        <PaperDetail paper={selectedPaper} onBack={handleGoHome} />
      )}
    </div>
  );
};

export default App;