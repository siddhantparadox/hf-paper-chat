import { Paper } from "../types";

interface HFAuthor {
  name: string;
  user_id?: string;
}

interface HFPaperResponse {
  paper: {
    id: string;
    title: string;
    summary: string;
    abstract?: string;
    authors: HFAuthor[];
    publishedAt: string;
    upvotes: number;
  };
}

export const fetchDailyPapers = async (): Promise<Paper[]> => {
  try {
    console.log("Fetching daily papers from /hf-api/daily_papers");
    const response = await fetch('/hf-api/daily_papers');

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: HFPaperResponse[] = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid API response format: Expected an array of papers.");
    }

    return data.map((item): Paper | null => {
      // Safety check for structure
      if (!item.paper) {
        console.warn("Skipping invalid paper item:", item);
        return null;
      }

      const summaryText = item.paper.summary || item.paper.abstract || '';
      return {
        id: item.paper.id,
        title: item.paper.title || 'Untitled Paper',
        authors: item.paper.authors ? item.paper.authors.map(a => a.name) : [],
        abstract: summaryText.replace(/<[^>]*>/g, ''), // Simple strip tags if any
        publishedDate: item.paper.publishedAt ? new Date(item.paper.publishedAt).toLocaleDateString() : 'Unknown Date',
        upvotes: item.paper.upvotes || 0,
        tags: [], // HF Daily papers endpoint often doesn't return tags at this level
        imageUrl: `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${item.paper.id}.png`,
        pdfUrl: `https://arxiv.org/pdf/${item.paper.id}.pdf`
      };
    }).filter((p): p is Paper => p !== null);

  } catch (error: any) {
    console.error("Error fetching daily papers:", error);
    // Re-throw with a clear message for the UI
    throw new Error(error.message || "Failed to connect to Hugging Face API.");
  }
};

export const fetchPaperDetails = async (paperId: string): Promise<Partial<Paper>> => {
  try {
    const response = await fetch(`/hf-api/papers/${paperId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch details for ${paperId}: ${response.statusText}`);
      return {};
    }

    const data = await response.json();
    const summaryText = data.summary || data.abstract || '';

    return {
      tags: data.tags || [],
      abstract: summaryText.replace(/<[^>]*>/g, ''),
    };
  } catch (e) {
    console.error("Error fetching paper details", e);
    return {};
  }
};

export const getPaperById = async (paperId: string): Promise<Paper> => {
  try {
    const response = await fetch(`/hf-api/papers/${paperId}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch paper (${response.status}): ${errorText}`);
    }
    const data = await response.json();

    const summaryText = data.summary || data.abstract || "No abstract available.";

    return {
      id: data.id,
      title: data.title,
      authors: data.authors ? data.authors.map((a: any) => a.name) : [],
      abstract: summaryText.replace(/<[^>]*>/g, ''),
      publishedDate: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : 'Unknown Date',
      upvotes: data.upvotes || 0,
      tags: data.tags || [],
      imageUrl: `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${data.id}.png`,
      pdfUrl: `https://arxiv.org/pdf/${data.id}.pdf`
    };
  } catch (error: any) {
    console.error("Error fetching specific paper:", error);
    throw new Error(error.message || "Could not retrieve paper details.");
  }
};