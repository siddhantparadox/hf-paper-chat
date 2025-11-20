import React, { useEffect, useState } from 'react';
import { Paper } from '../types';
import { NeoCard } from './NeoCard';
import { fetchDailyPapers } from '../services/hfService';

interface PaperListProps {
  onSelectPaper: (paper: Paper) => void;
}

export const PaperList: React.FC<PaperListProps> = ({ onSelectPaper }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        setIsLoading(true);
        const data = await fetchDailyPapers();
        setPapers(data);
      } catch (err: any) {
        console.error("PaperList load error:", err);
        setError(err.message || "Failed to load trending papers. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPapers();
  }, []);

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Daily Trending Papers</h2>
          <div className="h-6 w-64 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="h-96 bg-gray-100 border-2 border-black shadow-neo animate-pulse p-6">
               <div className="h-6 bg-gray-200 w-3/4 mb-4"></div>
               <div className="h-4 bg-gray-200 w-full mb-2"></div>
               <div className="h-4 bg-gray-200 w-full mb-2"></div>
               <div className="h-4 bg-gray-200 w-1/2"></div>
             </div>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center text-center min-h-[50vh]">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-3xl font-black mb-2">Connection Error</h2>
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded mb-6 max-w-2xl overflow-auto">
            <p className="text-red-800 font-mono text-sm whitespace-pre-wrap">{error}</p>
        </div>
        <p className="text-lg text-gray-600 mb-6">
            If you are seeing a CORS error (Failed to fetch), the Hugging Face API might be blocking direct browser requests from this domain.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-hf-yellow border-2 border-black shadow-neo font-bold hover:shadow-neo-hover transition-all"
        >
          Retry Connection
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h2 className="text-4xl md:text-5xl font-black mb-4">Daily Trending Papers</h2>
        <p className="text-xl text-gray-600 font-medium border-l-4 border-hf-yellow pl-4">
          Discover the latest breakthroughs in AI and chat with them directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <NeoCard key={paper.id} onClick={() => onSelectPaper(paper)} className="flex flex-col h-full group">
            <div className="flex justify-between items-start mb-4">
               {paper.tags.length > 0 ? (
                 <div className="flex gap-2 flex-wrap">
                   {paper.tags.slice(0, 2).map(tag => (
                     <span key={tag} className="bg-gray-100 border border-black px-2 py-1 text-xs font-bold uppercase tracking-wider">
                       {tag}
                     </span>
                   ))}
                 </div>
               ) : (
                 <span className="bg-gray-100 border border-black px-2 py-1 text-xs font-bold uppercase tracking-wider">
                   ARXIV: {paper.id}
                 </span>
               )}
              <span className="text-sm font-bold text-gray-500 whitespace-nowrap ml-2">{paper.publishedDate}</span>
            </div>
            
            {/* Thumbnail Image if available */}
            <div className="w-full h-32 mb-4 overflow-hidden border-2 border-black bg-gray-100">
               <img 
                 src={paper.imageUrl} 
                 alt={paper.title} 
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
               />
            </div>
            
            <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-gray-700 transition-colors line-clamp-2">
              {paper.title}
            </h3>
            
            <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
              {paper.abstract}
            </p>

            <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100 mt-auto">
               <div className="flex items-center gap-1 text-sm font-bold">
                 <span>👍</span> {paper.upvotes}
               </div>
               <div className="flex -space-x-2 overflow-hidden max-w-[50%]">
                  {paper.authors.slice(0, 3).map((author, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center text-xs font-bold shrink-0" title={author}>
                      {author.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {paper.authors.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0">
                      +{paper.authors.length - 3}
                    </div>
                  )}
               </div>
            </div>
          </NeoCard>
        ))}
      </div>
    </main>
  );
};