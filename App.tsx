import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PaperList } from './components/PaperList';
import { PaperDetail } from './components/PaperDetail';
import { Paper, ViewState } from './types';
import { getPaperById } from './services/hfService';

interface HistoryState {
  view: ViewState;
  paperId?: string;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  // Parse URL and set initial state
  const parseURLState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const paperId = params.get('paperId');
    return { paperId };
  }, []);

  // Load paper by ID (from URL or cache)
  const loadPaperById = useCallback(async (paperId: string) => {
    // First try to find in loaded papers
    const cachedPaper = papers.find(p => p.id === paperId);
    if (cachedPaper) {
      setSelectedPaper(cachedPaper);
      setView(ViewState.PAPER_DETAIL);
      return;
    }

    // Fetch from API
    setIsLoadingPaper(true);
    try {
      const fetchedPaper = await getPaperById(paperId);
      setSelectedPaper(fetchedPaper);
      setView(ViewState.PAPER_DETAIL);
    } catch (err) {
      console.error('Failed to fetch paper:', err);
      // Go back to home on error
      setView(ViewState.HOME);
      setSelectedPaper(null);
    } finally {
      setIsLoadingPaper(false);
    }
  }, [papers]);

  // Handle initial URL state on mount
  useEffect(() => {
    const { paperId } = parseURLState();

    if (paperId) {
      // If we have a paperId in URL, try to load it
      loadPaperById(paperId);
    }

    // Set initial history state if not already set
    if (!window.history.state?.view) {
      const state: HistoryState = paperId
        ? { view: ViewState.PAPER_DETAIL, paperId }
        : { view: ViewState.HOME };
      window.history.replaceState(state, '', window.location.href);
    }
  }, []); // Only run once on mount

  // Watch for papers loading and check if we need to display a paper from URL
  useEffect(() => {
    const { paperId } = parseURLState();
    if (paperId && papers.length > 0 && !selectedPaper && view !== ViewState.PAPER_DETAIL) {
      const paper = papers.find(p => p.id === paperId);
      if (paper) {
        setSelectedPaper(paper);
        setView(ViewState.PAPER_DETAIL);
      }
    }
  }, [papers, parseURLState, selectedPaper, view]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;

      if (!state || state.view === ViewState.HOME) {
        setSelectedPaper(null);
        setView(ViewState.HOME);
      } else if (state.view === ViewState.PAPER_DETAIL && state.paperId) {
        loadPaperById(state.paperId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadPaperById]);

  const handleSelectPaper = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    setView(ViewState.PAPER_DETAIL);

    // Build new URL preserving existing filter params
    const url = new URL(window.location.href);
    url.searchParams.set('paperId', paper.id);

    const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId: paper.id };
    window.history.pushState(state, '', url.toString());
    window.scrollTo(0, 0);
  }, []);

  const handleGoHome = useCallback(() => {
    setSelectedPaper(null);
    setView(ViewState.HOME);

    // Remove paperId but preserve filter params (date, week, month)
    const url = new URL(window.location.href);
    url.searchParams.delete('paperId');

    const state: HistoryState = { view: ViewState.HOME };
    window.history.pushState(state, '', url.toString());
  }, []);

  // Callback to receive papers from PaperList
  const handlePapersLoaded = useCallback((loadedPapers: Paper[]) => {
    setPapers(loadedPapers);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-black">
      <Header
        currentView={view}
        onHomeClick={handleGoHome}
        onPaperSubmit={handleSelectPaper}
      />

      {view === ViewState.HOME && (
        <PaperList onSelectPaper={handleSelectPaper} onPapersLoaded={handlePapersLoaded} />
      )}

      {view === ViewState.PAPER_DETAIL && selectedPaper && (
        <PaperDetail paper={selectedPaper} onBack={handleGoHome} />
      )}

      {isLoadingPaper && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
            <p className="font-bold">Loading paper...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;