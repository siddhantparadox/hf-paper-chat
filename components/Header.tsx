import React, { useState } from 'react';
import { ViewState, Paper } from '../types';
import { NeoButton } from './NeoButton';
import { getPaperById } from '../services/hfService';

interface HeaderProps {
  currentView: ViewState;
  onHomeClick: () => void;
  onPaperSubmit: (paper: Paper) => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onHomeClick, onPaperSubmit, onSignOut }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    setError('');
    setIsLoading(true);

    try {
      // Try to extract ID from URL or use input as ID
      // Matches: 
      // https://huggingface.co/papers/2312.00752
      // 2312.00752
      let paperId = urlInput.trim();
      const match = urlInput.match(/papers\/(\d+\.\d+)/);
      if (match) {
        paperId = match[1];
      } else if (urlInput.includes('arxiv.org')) {
         const arxivMatch = urlInput.match(/(\d+\.\d+)/);
         if (arxivMatch) paperId = arxivMatch[1];
      }

      // Basic format check (digits.digits)
      if (!paperId.match(/^\d+\.\d+/)) {
        throw new Error("Invalid URL or ArXiv ID format. Expected format like '2312.00752'");
      }

      const paper = await getPaperById(paperId);
      onPaperSubmit(paper);
      setIsModalOpen(false);
      setUrlInput('');
    } catch (err: any) {
      console.error("Paper fetch error:", err);
      setError(err.message || "Could not find paper. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b-2 border-black px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onHomeClick}>
            <div className="text-3xl select-none">🤗</div>
            <h1 className="text-2xl font-black tracking-tighter hidden sm:block">HuggingPapers</h1>
          </div>
          
          <div className="flex gap-4">
            {onSignOut && (
              <NeoButton variant="secondary" onClick={onSignOut}>
                Sign Out
              </NeoButton>
            )}
            {currentView === ViewState.PAPER_DETAIL && (
              <NeoButton onClick={onHomeClick} variant="secondary" className="hidden sm:flex">
                Back to Feed
              </NeoButton>
            )}
            <NeoButton variant="primary" onClick={() => setIsModalOpen(true)}>
              Submit Paper
            </NeoButton>
          </div>
        </div>
      </header>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-2 border-black shadow-neo w-full max-w-md relative flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-4 border-b-2 border-black bg-gray-50">
              <h2 className="text-xl font-black uppercase">Analyze Paper</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-transparent hover:bg-gray-200 rounded-full transition-colors font-bold text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
              <p className="mb-4 text-sm text-gray-600 font-medium">
                Paste a Hugging Face Paper URL or an ArXiv ID to start chatting with it.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase mb-1">Paper URL / ID</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://huggingface.co/papers/2312.00752"
                  className="w-full p-3 border-2 border-black shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-hf-yellow font-mono text-sm"
                  autoFocus
                />
                {error && (
                  <div className="mt-3 text-xs font-bold text-red-600 bg-red-50 p-3 border border-red-200 break-words">
                    Error: {error}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <NeoButton 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </NeoButton>
                <NeoButton 
                  type="submit" 
                  variant="primary"
                  disabled={isLoading || !urlInput.trim()}
                  className={isLoading ? "opacity-75 cursor-wait" : ""}
                >
                  {isLoading ? "Loading..." : "Submit"}
                </NeoButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
