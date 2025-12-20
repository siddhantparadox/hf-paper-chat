export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  publishedDate: string;
  upvotes: number;
  tags: string[];
  numComments?: number;
  discussionId?: string;
  submittedBy?: {
    name: string;
    avatarUrl?: string;
  };
  organization?: {
    name: string;
    avatarUrl?: string;
  };
  githubRepo?: string;
  projectPage?: string;
  githubStars?: number;
  aiSummary?: string;
  aiKeywords?: string[];
  thumbnailUrl?: string;
  mediaUrls?: string[];
  pdfUrl?: string;
  imageUrl?: string;
}

export type ChatRole = "user" | "assistant" | "system";
export type ReasoningMode = "fast" | "reasoning";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  isThinking?: boolean; // UI-only state for streaming
  reasoning?: string;
}

export interface Conversation {
  id: string;
  paperId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export enum ViewState {
  HOME = 'HOME',
  PAPER_DETAIL = 'PAPER_DETAIL',
}
