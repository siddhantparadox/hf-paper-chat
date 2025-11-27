import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Search, XCircle } from 'lucide-react';
import { Paper } from '../types';
import { NeoCard } from './NeoCard';
import { fetchDailyPapers, searchPapers } from '../services/hfService';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

const PaperGrid = ({ items, onSelect }: { items: Paper[]; onSelect: (paper: Paper) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map((paper) => (
      <NeoCard key={paper.id} onClick={() => onSelect(paper)} className="flex flex-col h-full group">
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
);

const Container = ({ children, date, setDate }: { children: React.ReactNode; date: Date | undefined; setDate: (d: Date | undefined) => void; }) => (
  <main className="max-w-7xl mx-auto p-4 md:p-8">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Daily Trending Papers</h2>
        <p className="text-xl text-gray-600 font-medium border-l-4 border-hf-yellow pl-4">
          Discover the latest breakthroughs in AI and chat with them directly.
        </p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"neutral"}
            className={cn(
              "w-[240px] justify-start text-left font-bold",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
    {children}
  </main>
);

interface PaperListProps {
  onSelectPaper: (paper: Paper) => void;
}

export const PaperList: React.FC<PaperListProps> = ({ onSelectPaper }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadPapers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Format date as YYYY-MM-DD if selected
        const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
        const data = await fetchDailyPapers(dateStr);
        setPapers(data);
      } catch (err: any) {
        console.error("PaperList load error:", err);
        setError(err.message || "Failed to load trending papers. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPapers();
  }, [date]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const results = await searchPapers(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      console.error("Paper search error:", err);
      setSearchError(err.message || "Failed to search papers. Try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);
  };

  if (isLoading) {
    return (
      <Container date={date} setDate={setDate}>
        {/* Search Panel */}
        <div className="mb-6 bg-white border-2 border-black shadow-neo p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Search Papers</p>
              <p className="text-gray-600">Find papers across Hugging Face by keyword and jump straight into chat.</p>
            </div>
          </div>
          <form className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword, title, or topic (e.g. latent space, diffusion)"
                className="pl-10 h-12"
              />
            </div>
            <Button type="button" className="h-12 px-6 font-bold" disabled>
              Search
            </Button>
          </form>
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
      </Container>
    );
  }

  if (error) {
    return (
      <Container date={date} setDate={setDate}>
        {/* Search Panel */}
        <div className="mb-6 bg-white border-2 border-black shadow-neo p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Search Papers</p>
              <p className="text-gray-600">Find papers across Hugging Face by keyword and jump straight into chat.</p>
            </div>
          </div>
          <form className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword, title, or topic (e.g. latent space, diffusion)"
                className="pl-10 h-12"
              />
            </div>
            <Button type="button" className="h-12 px-6 font-bold" disabled>
              Search
            </Button>
          </form>
        </div>
        <div className="flex flex-col items-center justify-center text-center min-h-[50vh]">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-black mb-2">Connection Error</h2>
          <div className="bg-red-50 border-2 border-red-200 p-4 rounded mb-6 max-w-2xl overflow-auto">
              <p className="text-red-800 font-mono text-sm whitespace-pre-wrap">{error}</p>
          </div>
          <p className="text-lg text-gray-600 mb-6">
              If you are seeing a CORS error (Failed to fetch), the Hugging Face API might be blocking direct browser requests from this domain.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="default"
            className="px-6 py-3 font-bold"
          >
            Retry Connection
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container date={date} setDate={setDate}>
      {/* Search Panel */}
      <div className="mb-6 bg-white border-2 border-black shadow-neo p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Search Papers</p>
            <p className="text-gray-600">Find papers across Hugging Face by keyword and jump straight into chat.</p>
          </div>
          {searchResults.length > 0 || searchError ? (
            <button
              onClick={handleClearSearch}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Clear search
            </button>
          ) : null}
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, title, or topic (e.g. latent space, diffusion)"
              className="pl-10 h-12"
            />
          </div>
          <Button type="submit" className="h-12 px-6 font-bold" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </form>
        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-red-700">
            <XCircle size={16} /> {searchError}
          </div>
        )}
      </div>

      {(isSearching || searchResults.length > 0 || searchError) && (
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-2xl font-black">Search Results</h3>
            {searchQuery && (
              <span className="text-sm font-bold text-gray-500">
                Showing results for “{searchQuery}”
              </span>
            )}
          </div>
          {isSearching && (
            <div className="flex items-center gap-2 text-sm font-bold">
              <Loader2 className="animate-spin" size={18} /> Searching papers...
            </div>
          )}
          {!isSearching && searchError && (
            <div className="flex items-center gap-2 text-sm font-bold text-red-700">
              <XCircle size={16} /> {searchError}
            </div>
          )}
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
            <div className="text-sm font-bold text-gray-600">
              No papers found. Try a different keyword.
            </div>
          )}
          {!isSearching && !searchError && searchResults.length > 0 && (
            <PaperGrid items={searchResults} onSelect={onSelectPaper} />
          )}
        </section>
      )}

      <PaperGrid items={papers} onSelect={onSelectPaper} />
    </Container>
  );
};
