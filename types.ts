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
