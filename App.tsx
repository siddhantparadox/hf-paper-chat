import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import type { Id } from './convex/_generated/dataModel';
import { useAuthActions } from '@convex-dev/auth/react';
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

  const [activeConversationId, setActiveConversationId] = useState<Id<'conversations'> | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState<ChatMessage | null>(null);
  const creatingConversationForPaperId = useRef<string | null>(null);

  const conversationsForUser = useQuery(api.conversations.listForUser);
  const createConversation = useMutation(api.conversations.create);
  const appendMessages = useMutation(api.conversations.appendMessages);
  const { signOut } = useAuthActions();
  const handleSignOut = useCallback(() => void signOut(), [signOut]);

  const conversationForPaper = useQuery(
    api.conversations.getForUserAndPaper,
    selectedPaper ? { paperId: selectedPaper.id } : "skip",
  );

  const conversationWithMessages = useQuery(
    api.conversations.getWithMessages,
    activeConversationId ? { conversationId: activeConversationId } : "skip",
  );

  // Parse URL and set initial state
  const parseURLState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const paperId = params.get('paperId');
    return { paperId };
  }, []);

  // Load paper by ID (from URL or cache)
  const loadPaperById = useCallback(async (paperId: string) => {
    setActiveConversationId(null);
    setStreamingAssistantMessage(null);

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
        setActiveConversationId(null);
        setStreamingAssistantMessage(null);
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
        setActiveConversationId(null);
        setStreamingAssistantMessage(null);
        setView(ViewState.HOME);
      } else if (state.view === ViewState.PAPER_DETAIL && state.paperId) {
        loadPaperById(state.paperId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadPaperById]);

  const handleSelectPaper = useCallback((paper: Paper) => {
    setActiveConversationId(null);
    setStreamingAssistantMessage(null);
    setSelectedPaper(paper);
    setView(ViewState.PAPER_DETAIL);

    // Build new URL preserving existing filter params
    const url = new URL(window.location.href);
    url.searchParams.set('paperId', paper.id);

    const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId: paper.id };
    window.history.pushState(state, '', url.toString());
    window.scrollTo(0, 0);
  }, []);

  const openPaperById = useCallback((paperId: string) => {
    // Build new URL preserving existing filter params
    const url = new URL(window.location.href);
    url.searchParams.set('paperId', paperId);

    const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId };
    window.history.pushState(state, '', url.toString());
    window.scrollTo(0, 0);

    loadPaperById(paperId);
  }, [loadPaperById]);

  useEffect(() => {
    if (!selectedPaper) return;
    if (conversationForPaper === undefined) return;

    if (conversationForPaper) {
      setActiveConversationId(conversationForPaper._id);
      return;
    }

    const paperId = selectedPaper.id;
    if (creatingConversationForPaperId.current === paperId) return;
    creatingConversationForPaperId.current = paperId;

    let canceled = false;
    void (async () => {
      try {
        const conversationId = await createConversation({
          paperId,
          paperTitle: selectedPaper.title,
        });
        await appendMessages({
          conversationId,
          messages: [
            {
              role: 'assistant',
              content: `Hi! I'm ready to discuss "**${selectedPaper.title}**". \n\nAsk me anything about the methodology, results, or abstract!`,
            },
          ],
        });
        if (!canceled) setActiveConversationId(conversationId);
      } catch (err) {
        console.error('Failed to create conversation:', err);
      } finally {
        if (creatingConversationForPaperId.current === paperId) {
          creatingConversationForPaperId.current = null;
        }
      }
    })();

    return () => {
      canceled = true;
      if (creatingConversationForPaperId.current === paperId) {
        creatingConversationForPaperId.current = null;
      }
    };
  }, [selectedPaper, conversationForPaper, createConversation, appendMessages]);

  // Handle sending a message in the chat
  const handleSendMessage = useCallback(async (input: string) => {
    if (!selectedPaper || !activeConversationId) return;

    const now = new Date().toISOString();
    const existingMessages: ChatMessage[] = (conversationWithMessages?.messages ?? []).map((msg) => ({
      id: msg._id,
      role: msg.role as ChatMessage['role'],
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    await appendMessages({
      conversationId: activeConversationId,
      messages: [{ role: 'user', content: input }],
    });

    const localAssistantMessageId = crypto.randomUUID();
    setStreamingAssistantMessage({
      id: localAssistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now,
      isThinking: true,
    });

    let assistantContent = '';
    const stream = streamMessageToChat(
      [
        ...existingMessages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: input,
          createdAt: now,
        },
      ],
      selectedPaper,
    );

    for await (const chunk of stream) {
      assistantContent += chunk;
      setStreamingAssistantMessage((prev) =>
        prev && prev.id === localAssistantMessageId
          ? { ...prev, content: assistantContent }
          : prev,
      );
    }

    setStreamingAssistantMessage((prev) =>
      prev && prev.id === localAssistantMessageId
        ? { ...prev, content: assistantContent, isThinking: false }
        : prev,
    );

    await appendMessages({
      conversationId: activeConversationId,
      messages: [{ role: 'assistant', content: assistantContent }],
    });
  }, [selectedPaper, activeConversationId, conversationWithMessages, appendMessages]);

  useEffect(() => {
    if (!streamingAssistantMessage || streamingAssistantMessage.isThinking) return;

    const persistedMessages = conversationWithMessages?.messages;
    const lastPersisted = persistedMessages ? persistedMessages[persistedMessages.length - 1] : undefined;
    if (
      lastPersisted &&
      lastPersisted.role === streamingAssistantMessage.role &&
      lastPersisted.content === streamingAssistantMessage.content
    ) {
      setStreamingAssistantMessage(null);
    }
  }, [conversationWithMessages, streamingAssistantMessage]);

  const handleGoHome = useCallback(() => {
    setSelectedPaper(null);
    setActiveConversationId(null);
    setStreamingAssistantMessage(null);
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
  const persistedConversation = conversationWithMessages?.conversation;
  const persistedMessages: ChatMessage[] = (conversationWithMessages?.messages ?? []).map((msg) => ({
    id: msg._id,
    role: msg.role as ChatMessage['role'],
    content: msg.content,
    createdAt: msg.createdAt,
  }));

  const lastPersistedMessage = persistedMessages[persistedMessages.length - 1];
  let messagesForUi = persistedMessages;
  if (
    streamingAssistantMessage &&
    (!lastPersistedMessage ||
      lastPersistedMessage.role !== streamingAssistantMessage.role ||
      lastPersistedMessage.content !== streamingAssistantMessage.content)
  ) {
    messagesForUi = [...persistedMessages, streamingAssistantMessage];
  }

  const currentConversation: Conversation | null = persistedConversation
    ? {
      id: persistedConversation._id,
      paperId: persistedConversation.paperId,
      title: persistedConversation.paperTitle,
      createdAt: persistedConversation.createdAt,
      updatedAt: persistedConversation.updatedAt,
      messages: messagesForUi,
    }
    : null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-black">
      <Header
        currentView={view}
        onHomeClick={handleGoHome}
        onPaperSubmit={handleSelectPaper}
        onSignOut={handleSignOut}
      />

      {view === ViewState.HOME && (
        <>
          <div className="border-b-2 border-black bg-white">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h2 className="text-lg font-black mb-3">Recent Chats</h2>
              {conversationsForUser === undefined ? (
                <p className="text-sm font-medium text-gray-600">Loading conversations...</p>
              ) : conversationsForUser.length === 0 ? (
                <p className="text-sm font-medium text-gray-600">
                  No conversations yet. Open a paper to start one.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {conversationsForUser.slice(0, 6).map((conv) => (
                    <button
                      key={conv._id}
                      onClick={() => openPaperById(conv.paperId)}
                      className="text-left border-2 border-black bg-white shadow-neo-sm hover:bg-gray-50 transition-colors p-4"
                    >
                      <div className="font-bold truncate" title={conv.paperTitle}>
                        {conv.paperTitle}
                      </div>
                      <div className="text-xs font-bold text-gray-500 mt-2">ARXIV: {conv.paperId}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <PaperList onSelectPaper={handleSelectPaper} onPapersLoaded={handlePapersLoaded} />
        </>
      )}

      {view === ViewState.PAPER_DETAIL && selectedPaper && currentConversation && (
        <PaperDetail
          paper={selectedPaper}
          conversation={currentConversation}
          onSendMessage={handleSendMessage}
          onBack={handleGoHome}
        />
      )}

      {view === ViewState.PAPER_DETAIL && selectedPaper && !currentConversation && !isLoadingPaper && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
            <p className="font-bold">Loading chat...</p>
          </div>
        </div>
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
