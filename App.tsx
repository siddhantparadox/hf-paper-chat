import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PaperList } from './components/PaperList';
import { PaperDetail } from './components/PaperDetail';
import { Paper, ViewState, Conversation, ChatMessage } from './types';
import { getPaperById } from './services/hfService';
import { streamMessageToChat } from './services/aiService';

interface HistoryState {
  view: ViewState;
  paperId?: string;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  // Conversation state - keyed by paper ID
  const [conversationsByPaper, setConversationsByPaper] = useState<Record<string, Conversation>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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

  // Create or get conversation for a paper
  const getOrCreateConversation = useCallback((paper: Paper): Conversation => {
    let conv = conversationsByPaper[paper.id];
    if (!conv) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      conv = {
        id,
        paperId: paper.id,
        title: paper.title,
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            createdAt: now,
            content: `Hi! I'm ready to discuss "**${paper.title}**". \n\nAsk me anything about the methodology, results, or abstract!`
          }
        ]
      };
      setConversationsByPaper(prev => ({ ...prev, [paper.id]: conv! }));
    }
    return conv;
  }, [conversationsByPaper]);

  const handleSelectPaper = useCallback((paper: Paper) => {
    const conv = getOrCreateConversation(paper);
    setActiveConversationId(conv.id);
    setSelectedPaper(paper);
    setView(ViewState.PAPER_DETAIL);

    // Build new URL preserving existing filter params
    const url = new URL(window.location.href);
    url.searchParams.set('paperId', paper.id);

    const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId: paper.id };
    window.history.pushState(state, '', url.toString());
    window.scrollTo(0, 0);
  }, [getOrCreateConversation]);

  // Handle sending a message in the chat
  const handleSendMessage = useCallback(async (input: string) => {
    if (!selectedPaper || !activeConversationId) return;

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      createdAt: now
    };

    // Add user message to conversation
    setConversationsByPaper(prev => {
      const conv = prev[selectedPaper.id];
      if (!conv) return prev;
      return {
        ...prev,
        [selectedPaper.id]: {
          ...conv,
          updatedAt: now,
          messages: [...conv.messages, userMsg]
        }
      };
    });

    const botMsgId = crypto.randomUUID();
    let isFirstChunk = true;

    try {
      // Get current messages including the new user message
      const currentConv = conversationsByPaper[selectedPaper.id];
      const messagesForApi = currentConv ? [...currentConv.messages, userMsg] : [userMsg];

      const stream = streamMessageToChat(messagesForApi, selectedPaper);

      for await (const chunk of stream) {
        if (isFirstChunk) {
          isFirstChunk = false;
          // Add assistant message placeholder
          setConversationsByPaper(prev => {
            const conv = prev[selectedPaper.id];
            if (!conv) return prev;
            return {
              ...prev,
              [selectedPaper.id]: {
                ...conv,
                messages: [...conv.messages, {
                  id: botMsgId,
                  role: 'assistant',
                  content: chunk,
                  createdAt: new Date().toISOString(),
                  isThinking: true
                }]
              }
            };
          });
        } else {
          // Append to existing assistant message
          setConversationsByPaper(prev => {
            const conv = prev[selectedPaper.id];
            if (!conv) return prev;
            return {
              ...prev,
              [selectedPaper.id]: {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === botMsgId
                    ? { ...msg, content: msg.content + chunk }
                    : msg
                )
              }
            };
          });
        }
      }

      // Mark streaming as complete
      setConversationsByPaper(prev => {
        const conv = prev[selectedPaper.id];
        if (!conv) return prev;
        return {
          ...prev,
          [selectedPaper.id]: {
            ...conv,
            updatedAt: new Date().toISOString(),
            messages: conv.messages.map(msg =>
              msg.id === botMsgId
                ? { ...msg, isThinking: false }
                : msg
            )
          }
        };
      });

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || "Sorry, I encountered an error processing your request.";

      if (isFirstChunk) {
        setConversationsByPaper(prev => {
          const conv = prev[selectedPaper.id];
          if (!conv) return prev;
          return {
            ...prev,
            [selectedPaper.id]: {
              ...conv,
              messages: [...conv.messages, {
                id: botMsgId,
                role: 'assistant',
                content: `**System Error:**\n${errorMessage}`,
                createdAt: new Date().toISOString()
              }]
            }
          };
        });
      } else {
        setConversationsByPaper(prev => {
          const conv = prev[selectedPaper.id];
          if (!conv) return prev;
          return {
            ...prev,
            [selectedPaper.id]: {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === botMsgId
                  ? { ...msg, content: msg.content + `\n\n**System Error:** ${errorMessage}`, isThinking: false }
                  : msg
              )
            }
          };
        });
      }
    }
  }, [selectedPaper, activeConversationId, conversationsByPaper]);

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

  // Get current conversation for selected paper
  const currentConversation = selectedPaper ? conversationsByPaper[selectedPaper.id] : null;

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

      {view === ViewState.PAPER_DETAIL && selectedPaper && currentConversation && (
        <PaperDetail
          paper={selectedPaper}
          conversation={currentConversation}
          onSendMessage={handleSendMessage}
          onBack={handleGoHome}
        />
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