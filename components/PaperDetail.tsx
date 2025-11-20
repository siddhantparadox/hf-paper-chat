import React, { useState, useEffect, useRef } from 'react';
import { Paper, ChatMessage } from '../types';
import { NeoButton } from './NeoButton';
import { streamMessageToChat } from '../services/aiService';
import { Streamdown } from 'streamdown';
import { fetchPaperDetails } from '../services/hfService';

interface PaperDetailProps {
  paper: Paper;
  onBack: () => void;
}

export const PaperDetail: React.FC<PaperDetailProps> = ({ paper: initialPaper, onBack }) => {
  const [paper, setPaper] = useState<Paper>(initialPaper);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enrich paper details on mount
  useEffect(() => {
    const enrichData = async () => {
      const details = await fetchPaperDetails(initialPaper.id);
      setPaper(prev => ({ ...prev, ...details }));
    };
    enrichData();
  }, [initialPaper.id]);

  // Initialize chat on mount
  useEffect(() => {
    setMessages([
      {
        id: 'intro',
        role: 'model',
        text: `Hi! I'm ready to discuss "**${paper.title}**". \n\nAsk me anything about the methodology, results, or abstract!`,
        timestamp: Date.now(),
      }
    ]);
  }, [paper.id, paper.title]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    let isFirstChunk = true;

    try {
      // Pass the updated history including the new user message
      const stream = streamMessageToChat(newMessages, paper);

      for await (const chunk of stream) {
        if (isFirstChunk) {
          isFirstChunk = false;
          setMessages(prev => [...prev, {
            id: botMsgId,
            role: 'model',
            text: chunk,
            timestamp: Date.now(),
            isThinking: true
          }]);
        } else {
          setMessages(prev => prev.map(msg =>
            msg.id === botMsgId
              ? { ...msg, text: msg.text + chunk }
              : msg
          ));
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId
          ? { ...msg, isThinking: false }
          : msg
      ));

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || "Sorry, I encountered an error processing your request.";
      if (isFirstChunk) {
        setMessages(prev => [...prev, {
          id: botMsgId,
          role: 'model',
          text: `**System Error:**\n${errorMessage}`,
          timestamp: Date.now()
        }]);
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === botMsgId
            ? { ...msg, text: msg.text + `\n\n**System Error:** ${errorMessage}`, isThinking: false }
            : msg
        ));
      }
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

          <div className="mb-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {paper.publishedDate}
              </span>
              {paper.tags.map(tag => (
                <span key={tag} className="bg-hf-yellow border border-black px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-6">{paper.title}</h1>

            <div className="flex flex-wrap gap-2 mb-8 text-sm font-medium text-gray-600">
              <span className="font-bold text-black mr-2">Authors:</span>
              {paper.authors.map((author, i) => (
                <span key={i} className={i !== paper.authors.length - 1 ? "after:content-[','] mr-1" : ""}>
                  {author}
                </span>
              ))}
            </div>
          </div>

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

          <div className="mt-8 p-6 bg-gray-900 text-white border-2 border-black shadow-neo">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xl mb-1">Read Full Paper</h4>
                <p className="text-gray-400 text-sm">
                  Access the PDF directly via ArXiv.
                </p>
              </div>
              <a href={`https://arxiv.org/pdf/${paper.id}.pdf`} target="_blank" rel="noopener noreferrer">
                <NeoButton variant="primary" className="w-full sm:w-auto">
                  Open PDF
                </NeoButton>
              </a>
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
                  {msg.role === 'user' ? 'You' : 'Gemini 2.5 Flash'}
                </div>
                <div className="markdown-body prose prose-sm max-w-none break-words">
                  <Streamdown isAnimating={msg.isThinking}>{msg.text || ''}</Streamdown>
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