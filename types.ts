export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  publishedDate: string;
  upvotes: number;
  tags: string[];
  aiSummary?: string;
  aiKeywords?: string[];
  thumbnailUrl?: string;
  mediaUrls?: string[];
  pdfUrl?: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
}

export enum ViewState {
  HOME = 'HOME',
  PAPER_DETAIL = 'PAPER_DETAIL',
}
