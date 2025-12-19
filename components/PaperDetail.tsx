import React, { useState, useEffect, useRef } from 'react';
import { Paper, Conversation } from '../types';
import { NeoButton } from './NeoButton';
import { Streamdown } from 'streamdown';
import { fetchPaperDetails, fetchPaperRepos, HFPaperRepos } from '../services/hfService';
import { DEFAULT_MODEL_LABEL } from '../services/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Github, Link2, MessageCircle, Star, ThumbsUp } from 'lucide-react';

interface PaperDetailProps {
  paper: Paper;
  conversation: Conversation;
  onSendMessage: (input: string) => Promise<void>;
  onBack: () => void;
}

const ResourceSection = ({ title, items, type }: { title: string, items: any[], type: 'model' | 'dataset' | 'space' }) => {
  if (items.length === 0) return null;

  const limit = 4;
  const displayedItems = items.slice(0, limit);
  const hasMore = items.length > limit;

  const renderItem = (item: any) => {
    const url = type === 'model' ? `https://huggingface.co/${item.id}`
      : type === 'dataset' ? `https://huggingface.co/datasets/${item.id}`
        : `https://huggingface.co/spaces/${item.id}`;
    const icon = type === 'model' ? '📦' : type === 'dataset' ? '📊' : '🚀';

    return (
      <a key={item.id} href={url} target="_blank" rel="noreferrer" className="group block w-full sm:w-auto">
        <div className="border-2 border-black px-4 py-2 bg-white group-hover:bg-gray-50 group-hover:-translate-y-0.5 shadow-neo-sm transition-all text-sm font-bold flex items-center gap-2">
          {icon} <span className="truncate max-w-[200px]">{item.id}</span>
          <span className="text-xs font-normal text-gray-500 border-l-2 border-gray-200 pl-2 ml-1">❤️ {item.likes}</span>
        </div>
      </a>
    );
  };

  return (
    <div className="mb-6">
      <h5 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-3">{title}</h5>
      <div className="flex flex-wrap gap-3">
        {displayedItems.map(renderItem)}

        {hasMore && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="neutral" className="h-auto py-2 px-4 font-bold">
                Show {items.length - limit} more...
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black mb-4">All {title} ({items.length})</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(renderItem)}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export const PaperDetail: React.FC<PaperDetailProps> = ({ paper: initialPaper, conversation, onSendMessage, onBack }) => {
  const [paper, setPaper] = useState<Paper>(initialPaper);
  const [repos, setRepos] = useState<HFPaperRepos>({ models: [], datasets: [], spaces: [] });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages from conversation prop
  const messages = conversation.messages;

  // Enrich paper details and fetch repos on mount
  useEffect(() => {
    const enrichData = async () => {
      const details = await fetchPaperDetails(initialPaper.id);
      setPaper(prev => ({
        ...prev,
        ...details,
        numComments: details.numComments ?? prev.numComments,
        discussionId: details.discussionId ?? prev.discussionId,
        githubRepo: details.githubRepo ?? prev.githubRepo,
        projectPage: details.projectPage ?? prev.projectPage,
        githubStars: details.githubStars ?? prev.githubStars,
        submittedBy: details.submittedBy ?? prev.submittedBy,
        organization: details.organization ?? prev.organization,
      }));
    };

    const loadRepos = async () => {
      const data = await fetchPaperRepos(initialPaper.id);
      setRepos(data);
    };

    enrichData();
    loadRepos();
  }, [initialPaper.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const input = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      await onSendMessage(input);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-76px)] overflow-hidden bg-gray-100">

      {/* Left Panel: Paper Content */}
      <div className="w-full lg:w-1/2 overflow-y-auto p-6 lg:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-black bg-white">
        <div className="max-w-3xl mx-auto">
          <NeoButton variant="ghost" onClick={onBack} className="mb-6 lg:hidden">
            ← Back to Feed
          </NeoButton>

          {paper.thumbnailUrl || paper.imageUrl ? (
            <div className="mb-6 border-2 border-black shadow-neo overflow-hidden bg-gray-100">
              <img
                src={paper.thumbnailUrl || paper.imageUrl}
                alt={paper.title}
                className="w-full h-56 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : null}

          <div className="mb-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {paper.publishedDate}
              </span>
              {paper.organization?.name && (
                <span className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-neo-sm">
                  {paper.organization.avatarUrl && (
                    <img
                      src={paper.organization.avatarUrl}
                      alt={paper.organization.name}
                      className="w-5 h-5 rounded-full border border-black object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {paper.organization.name}
                </span>
              )}
              {paper.tags.map(tag => (
                <span key={tag} className="bg-hf-yellow border border-black px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {tag}
                </span>
              ))}
              {paper.aiKeywords?.length ? (
                paper.aiKeywords.map((kw) => (
                  <span key={kw} className="bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-neo-sm">
                    {kw}
                  </span>
                ))
              ) : null}
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-6">{paper.title}</h1>

            <div className="flex flex-wrap gap-2 mb-4 text-sm font-medium text-gray-600">
              <span className="font-bold text-black mr-2">Authors:</span>
              {paper.authors.map((author, i) => (
                <span key={i} className={i !== paper.authors.length - 1 ? "after:content-[','] mr-1" : ""}>
                  {author}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-700 mb-4">
              <span className="inline-flex items-center gap-1"><ThumbsUp size={16} /> {paper.upvotes}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle size={16} /> {paper.numComments ?? initialPaper.numComments ?? 0}</span>
              {paper.githubStars ? (
                <span className="inline-flex items-center gap-1"><Star size={16} /> {paper.githubStars}</span>
              ) : null}
              <a
                href={`https://huggingface.co/papers/${paper.id}${paper.discussionId ? `?discussion=${paper.discussionId}` : ''}`}
                target="_blank"
                rel="noreferrer"
              >
                <NeoButton variant="secondary" className="h-9 px-4 text-xs">
                  <MessageCircle size={14} className="mr-2" /> Discuss on HF
                </NeoButton>
              </a>
            </div>

            {paper.submittedBy?.name && (
              <div className="text-sm font-bold text-gray-600 mb-6 flex items-center gap-2">
                {paper.submittedBy.avatarUrl && (
                  <img
                    src={paper.submittedBy.avatarUrl}
                    alt={paper.submittedBy.name}
                    className="w-6 h-6 rounded-full border border-black object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                Submitted by {paper.submittedBy.name}
              </div>
            )}
          </div>

          {paper.aiSummary && (
            <div className="border-2 border-black bg-white shadow-neo p-5 mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">AI Summary</div>
              <p className="text-base leading-relaxed text-gray-800">{paper.aiSummary}</p>
            </div>
          )}

          <div className="prose prose-slate max-w-none border-2 border-black p-6 md:p-8 shadow-neo bg-[#FAFAFA]">
            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-200 pb-2">
              <h3 className="text-xl font-bold uppercase tracking-wide m-0">Abstract</h3>
              <a
                href={`https://arxiv.org/abs/${paper.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View on ArXiv ↗
              </a>
            </div>
            <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
              {paper.abstract}
            </p>
          </div>

          {paper.mediaUrls && paper.mediaUrls.length > 0 && (
            <div className="mt-6">
              <h4 className="font-black text-xl mb-3">Media</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paper.mediaUrls.map((url, idx) => (
                  <div key={idx} className="border-2 border-black shadow-neo-sm bg-white overflow-hidden">
                    <img
                      src={url}
                      alt={`media-${idx}`}
                      className="w-full h-40 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Repos Section */}
          {(repos.models.length > 0 || repos.datasets.length > 0 || repos.spaces.length > 0) && (
            <div className="mt-8 border-t-2 border-gray-200 pt-8">
              <h4 className="font-black text-2xl mb-6">Associated Resources</h4>
              <ResourceSection title="Models" items={repos.models} type="model" />
              <ResourceSection title="Datasets" items={repos.datasets} type="dataset" />
              <ResourceSection title="Spaces (Demos)" items={repos.spaces} type="space" />
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-900 text-white border-2 border-black shadow-neo">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xl mb-1">Explore the Paper</h4>
                <p className="text-gray-300 text-sm">Access the PDF, discussion, and related links.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`https://huggingface.co/papers/${paper.id}${paper.discussionId ? `?discussion=${paper.discussionId}` : ''}`} target="_blank" rel="noopener noreferrer">
                  <NeoButton variant="secondary" className="w-full sm:w-auto">
                    <MessageCircle size={16} className="mr-2" /> HF Page
                  </NeoButton>
                </a>
                {paper.githubRepo && (
                  <a href={paper.githubRepo} target="_blank" rel="noopener noreferrer">
                    <NeoButton variant="secondary" className="w-full sm:w-auto">
                      <Github size={16} className="mr-2" /> GitHub
                    </NeoButton>
                  </a>
                )}
                {paper.projectPage && (
                  <a href={paper.projectPage} target="_blank" rel="noopener noreferrer">
                    <NeoButton variant="secondary" className="w-full sm:w-auto">
                      <Link2 size={16} className="mr-2" /> Project
                    </NeoButton>
                  </a>
                )}
                <a href={`https://arxiv.org/pdf/${paper.id}.pdf`} target="_blank" rel="noopener noreferrer">
                  <NeoButton variant="primary" className="w-full sm:w-auto">
                    Open PDF
                  </NeoButton>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#fdfdfd]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[85%] sm:max-w-[75%] p-4 border-2 border-black shadow-neo-sm text-sm sm:text-base
                ${msg.role === 'user' ? 'bg-hf-yellow' : 'bg-white'}
              `}>
                <div className="font-bold text-xs mb-1 opacity-50 uppercase tracking-wider">
                  {msg.role === 'user' ? 'You' : DEFAULT_MODEL_LABEL}
                </div>
                <div className="markdown-body prose prose-sm max-w-none break-words">
                  <Streamdown isAnimating={msg.isThinking}>{msg.content || ''}</Streamdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-white p-4 border-2 border-black shadow-neo-sm animate-pulse flex gap-2 items-center">
                <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-black rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-black rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t-2 border-black">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about this paper..."
              disabled={isLoading}
              className="flex-1 p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-hf-yellow focus:border-black shadow-neo-sm text-base disabled:opacity-50"
            />
            <NeoButton type="submit" disabled={isLoading || !inputValue.trim()} className={(isLoading || !inputValue.trim()) ? "opacity-50 cursor-not-allowed" : ""}>
              Send
            </NeoButton>
          </form>
        </div>
      </div>

    </div>
  );
};
