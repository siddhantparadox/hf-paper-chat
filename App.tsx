import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import type { Id } from './convex/_generated/dataModel';
import { useAuthActions } from '@convex-dev/auth/react';
import { Header } from './components/Header';
import { ConversationSidebar } from './components/ConversationSidebar';
import { PaperList } from './components/PaperList';
import { PaperDetail } from './components/PaperDetail';
import { Paper, ViewState, Conversation, ChatMessage } from './types';
import { getPaperById } from './services/hfService';
import { streamMessageToChat } from './services/aiService';

interface HistoryState {
  view: ViewState;
  paperId?: string;
}

function buildGreeting(paperTitle: string) {
  return `Hi! I'm ready to discuss "**${paperTitle}**". \n\nAsk me anything about the methodology, results, or abstract!`;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<Id<'conversations'> | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState<ChatMessage | null>(null);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<ChatMessage | null>(null);

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
  const loadPaperById = useCallback(
    async (paperId: string, options?: { conversationId?: Id<'conversations'> | null }) => {
      const nextConversationId = options?.conversationId ?? null;
      setActiveConversationId(nextConversationId);
      setStreamingAssistantMessage(null);
      setOptimisticUserMessage(null);
      setSelectedPaper(null);
      setView(ViewState.PAPER_DETAIL);

      // First try to find in loaded papers
      const cachedPaper = papers.find((p) => p.id === paperId);
      if (cachedPaper) {
        setSelectedPaper(cachedPaper);
        return;
      }

      // Fetch from API
      setIsLoadingPaper(true);
      try {
        const fetchedPaper = await getPaperById(paperId);
        setSelectedPaper(fetchedPaper);
      } catch (err) {
        console.error('Failed to fetch paper:', err);
        // Go back to home on error
        setView(ViewState.HOME);
        setSelectedPaper(null);
        setActiveConversationId(null);
      } finally {
        setIsLoadingPaper(false);
      }
    },
    [papers],
  );

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
    setOptimisticUserMessage(null);
    setSelectedPaper(paper);
    setView(ViewState.PAPER_DETAIL);

    // Build new URL preserving existing filter params
    const url = new URL(window.location.href);
    url.searchParams.set('paperId', paper.id);

    const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId: paper.id };
    window.history.pushState(state, '', url.toString());
    window.scrollTo(0, 0);
  }, []);

  const handleSelectConversation = useCallback(
    (conversationId: Id<'conversations'>, paperId: string) => {
      // Build new URL preserving existing filter params
      const url = new URL(window.location.href);
      url.searchParams.set('paperId', paperId);

      const state: HistoryState = { view: ViewState.PAPER_DETAIL, paperId };
      window.history.pushState(state, '', url.toString());
      window.scrollTo(0, 0);

      if (selectedPaper?.id === paperId) {
        setActiveConversationId(conversationId);
        setStreamingAssistantMessage(null);
        setOptimisticUserMessage(null);
        setView(ViewState.PAPER_DETAIL);
        return;
      }

      void loadPaperById(paperId, { conversationId });
    },
    [loadPaperById, selectedPaper],
  );

  useEffect(() => {
    if (!selectedPaper) return;
    if (activeConversationId) return;
    if (conversationForPaper === undefined) return;

    if (conversationForPaper) {
      setActiveConversationId(conversationForPaper._id);
    };
  }, [selectedPaper, activeConversationId, conversationForPaper]);

  // Handle sending a message in the chat
  const handleSendMessage = useCallback(async (input: string) => {
    if (!selectedPaper) return;

    const now = new Date().toISOString();
    setOptimisticUserMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      createdAt: now,
    });

    let conversationId = activeConversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      conversationId = await createConversation({
        paperId: selectedPaper.id,
        paperTitle: selectedPaper.title,
      });
      setActiveConversationId(conversationId);
    }

    const existingMessages: ChatMessage[] = (conversationWithMessages?.messages ?? []).map((msg) => ({
      id: msg._id,
      role: msg.role as ChatMessage['role'],
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    await appendMessages({
      conversationId,
      messages: isNewConversation
        ? [
          { role: 'assistant', content: buildGreeting(selectedPaper.title) },
          { role: 'user', content: input },
        ]
        : [{ role: 'user', content: input }],
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
      conversationId,
      messages: [{ role: 'assistant', content: assistantContent }],
    });
  }, [selectedPaper, activeConversationId, conversationWithMessages, createConversation, appendMessages]);

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
    setOptimisticUserMessage(null);
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
  const conversationForUi: Conversation | null = useMemo(() => {
    if (currentConversation) return currentConversation;
    if (!selectedPaper) return null;
    const now = new Date().toISOString();
    const messages: ChatMessage[] = [
      {
        id: 'greeting',
        role: 'assistant',
        content: buildGreeting(selectedPaper.title),
        createdAt: now,
      },
    ];
    if (optimisticUserMessage) messages.push(optimisticUserMessage);
    if (streamingAssistantMessage) messages.push(streamingAssistantMessage);

    return {
      id: activeConversationId ?? 'draft',
      paperId: selectedPaper.id,
      title: selectedPaper.title,
      createdAt: now,
      updatedAt: now,
      messages,
    };
  }, [currentConversation, selectedPaper, activeConversationId, optimisticUserMessage, streamingAssistantMessage]);

  return (
    <div className="flex h-screen font-sans text-black">
      <aside className="border-r-2 border-black bg-white flex flex-col shrink-0">
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <Header
          currentView={view}
          onHomeClick={handleGoHome}
          onPaperSubmit={handleSelectPaper}
          onSignOut={handleSignOut}
        />

        {view === ViewState.HOME && (
          <PaperList onSelectPaper={handleSelectPaper} onPapersLoaded={handlePapersLoaded} />
        )}

        {view === ViewState.PAPER_DETAIL && selectedPaper && conversationForUi && (
          <PaperDetail
            paper={selectedPaper}
            conversation={conversationForUi}
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
      </main>
    </div>
  );
};

export default App;
