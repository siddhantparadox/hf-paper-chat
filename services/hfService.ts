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

export const fetchDailyPapers = async (date?: string): Promise<Paper[]> => {
  try {
    const url = date ? `/hf-api/daily_papers?date=${date}` : '/hf-api/daily_papers';
    console.log(`Fetching daily papers from ${url}`);
    const response = await fetch(url);

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
      const aiSummary = (item as any).ai_summary || (item.paper as any).ai_summary || '';
      const aiKeywords = (item as any).ai_keywords || (item.paper as any).ai_keywords || [];
      const thumbnail = (item as any).thumbnail || (item.paper as any).thumbnail;
      const mediaUrls = (item as any).mediaUrls || (item as any).media_urls || (item.paper as any).mediaUrls || [];
      const discussionId = (item as any).discussionId || (item.paper as any).discussionId;
      const numComments = (item as any).numComments ?? (item.paper as any).numComments;
      const submittedOnDailyBy = (item as any).submittedOnDailyBy;
      const organization = (item as any).organization || (item.paper as any).organization;
      const githubRepo = (item as any).githubRepo || (item.paper as any).githubRepo;
      const projectPage = (item as any).projectPage || (item.paper as any).projectPage;

      return {
        id: item.paper.id,
        title: item.paper.title || 'Untitled Paper',
        authors: item.paper.authors ? item.paper.authors.map(a => a.name) : [],
        abstract: summaryText.replace(/<[^>]*>/g, ''), // Simple strip tags if any
        aiSummary,
        aiKeywords: Array.isArray(aiKeywords) ? aiKeywords : [],
        publishedDate: item.paper.publishedAt ? new Date(item.paper.publishedAt).toLocaleDateString() : 'Unknown Date',
        upvotes: item.paper.upvotes || 0,
        numComments: numComments || 0,
        discussionId,
        submittedBy: submittedOnDailyBy ? { name: submittedOnDailyBy.fullname || submittedOnDailyBy.user || '', avatarUrl: submittedOnDailyBy.avatarUrl } : undefined,
        organization: organization ? { name: organization.fullname || organization.name, avatarUrl: organization.avatar } : undefined,
        githubRepo,
        projectPage,
        tags: [], // HF Daily papers endpoint often doesn't return tags at this level
        imageUrl: thumbnail || `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${item.paper.id}.png`,
        thumbnailUrl: thumbnail || `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${item.paper.id}.png`,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        pdfUrl: `https://arxiv.org/pdf/${item.paper.id}.pdf`
      };
    }).filter((p): p is Paper => p !== null);

  } catch (error: any) {
    console.error("Error fetching daily papers:", error);
    // Re-throw with a clear message for the UI
    throw new Error(error.message || "Failed to connect to Hugging Face API.");
  }
};

export const searchPapers = async (query: string): Promise<Paper[]> => {
  if (!query.trim()) return [];

  try {
    const response = await fetch(`/hf-api/papers/search?q=${encodeURIComponent(query.trim())}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(`Search failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid search response format: Expected an array.");
    }

    return data.map((item): Paper | null => {
      const paperData = (item as any).paper || item;
      if (!paperData?.id) return null;

      const summaryText =
        (paperData.ai_summary as string) ||
        (item as any).ai_summary ||
        paperData.summary ||
        paperData.abstract ||
        (item as any).summary ||
        '';

      const keywords = (paperData.ai_keywords as string[]) || (item as any).ai_keywords || paperData.tags || [];
      const thumbnail = paperData.thumbnail || (item as any).thumbnail;
      const mediaUrls = paperData.mediaUrls || paperData.media_urls || (item as any).mediaUrls || [];
      const discussionId = (item as any).discussionId || (paperData as any).discussionId;
      const numComments = (item as any).numComments ?? (paperData as any).numComments;
      const githubRepo = (item as any).githubRepo || (paperData as any).githubRepo;
      const projectPage = (item as any).projectPage || (paperData as any).projectPage;
      const githubStars = (item as any).githubStars || (paperData as any).githubStars;
      const submitted = (item as any).submittedOnDailyBy;
      const organization = (item as any).organization || (paperData as any).organization;

      return {
        id: paperData.id,
        title: paperData.title || 'Untitled Paper',
        authors: paperData.authors ? paperData.authors.map((a: any) => a.name) : [],
        abstract: summaryText.replace(/<[^>]*>/g, ''),
        aiSummary: (paperData.ai_summary as string) || (item as any).ai_summary,
        publishedDate: paperData.publishedAt
          ? new Date(paperData.publishedAt).toLocaleDateString()
          : 'Unknown Date',
        upvotes: paperData.upvotes || (item as any).upvotes || 0,
        numComments: numComments || 0,
        discussionId,
        githubRepo,
        projectPage,
        githubStars: githubStars || 0,
        submittedBy: submitted ? { name: submitted.fullname || submitted.user || '', avatarUrl: submitted.avatarUrl } : undefined,
        organization: organization ? { name: organization.fullname || organization.name, avatarUrl: organization.avatar } : undefined,
        tags: Array.isArray(keywords) ? keywords : [],
        aiKeywords: Array.isArray(keywords) ? keywords : [],
        imageUrl: thumbnail
          ? thumbnail
          : `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${paperData.id}.png`,
        thumbnailUrl: thumbnail
          ? thumbnail
          : `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${paperData.id}.png`,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        pdfUrl: `https://arxiv.org/pdf/${paperData.id}.pdf`
      };
    }).filter((paper): paper is Paper => paper !== null);
  } catch (error: any) {
    console.error("Error searching papers:", error);
    throw new Error(error.message || "Failed to search papers.");
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
    const aiSummary = data.ai_summary || '';
    const aiKeywords = data.ai_keywords || data.tags || [];
    const mediaUrls = data.mediaUrls || data.media_urls || [];
    const discussionId = data.discussionId;
    const numComments = data.numComments;
    const submitted = data.submittedOnDailyBy;
    const organization = data.organization;
    const githubRepo = data.githubRepo;
    const projectPage = data.projectPage;
    const githubStars = data.githubStars;

    return {
      tags: data.tags || [],
      abstract: summaryText.replace(/<[^>]*>/g, ''),
      aiSummary,
      aiKeywords: Array.isArray(aiKeywords) ? aiKeywords : [],
      thumbnailUrl: data.thumbnail || undefined,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      discussionId,
      numComments,
      submittedBy: submitted ? { name: submitted.fullname || submitted.user || '', avatarUrl: submitted.avatarUrl } : undefined,
      organization: organization ? { name: organization.fullname || organization.name, avatarUrl: organization.avatar } : undefined,
      githubRepo,
      projectPage,
      githubStars,
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
    const aiSummary = data.ai_summary || '';
    const aiKeywords = data.ai_keywords || data.tags || [];
    const mediaUrls = data.mediaUrls || data.media_urls || [];
    const thumbnail = data.thumbnail;
    const discussionId = data.discussionId;
    const numComments = data.numComments;
    const submitted = data.submittedOnDailyBy;
    const organization = data.organization;
    const githubRepo = data.githubRepo;
    const projectPage = data.projectPage;
    const githubStars = data.githubStars;

    return {
      id: data.id,
      title: data.title,
      authors: data.authors ? data.authors.map((a: any) => a.name) : [],
      abstract: summaryText.replace(/<[^>]*>/g, ''),
      aiSummary,
      aiKeywords: Array.isArray(aiKeywords) ? aiKeywords : [],
      publishedDate: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : 'Unknown Date',
      upvotes: data.upvotes || 0,
      numComments: numComments || 0,
      discussionId,
      submittedBy: submitted ? { name: submitted.fullname || submitted.user || '', avatarUrl: submitted.avatarUrl } : undefined,
      organization: organization ? { name: organization.fullname || organization.name, avatarUrl: organization.avatar } : undefined,
      githubRepo,
      projectPage,
      githubStars,
      tags: data.tags || [],
      imageUrl: thumbnail || `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${data.id}.png`,
      thumbnailUrl: thumbnail || `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${data.id}.png`,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      pdfUrl: `https://arxiv.org/pdf/${data.id}.pdf`
    };
  } catch (error: any) {
    console.error("Error fetching specific paper:", error);
    throw new Error(error.message || "Could not retrieve paper details.");
  }
};

export interface HFPaperRepos {
  models: { id: string; likes: number; author: string }[];
  datasets: { id: string; likes: number; author: string }[];
  spaces: { id: string; likes: number; author: string }[];
}

export const fetchPaperRepos = async (paperId: string): Promise<HFPaperRepos> => {
  try {
    // Fetch from filtered endpoints for Models and Datasets to get comprehensive lists.
    // For Spaces, the filter endpoint often returns 0 because spaces aren't always explicitly tagged with arxiv.
    // So we use the /repos endpoint for Spaces, which uses internal linkage logic.
    const [modelsRes, datasetsRes, reposRes] = await Promise.all([
      fetch(`/hf-api/models?filter=arxiv:${paperId}&limit=1000`),
      fetch(`/hf-api/datasets?filter=arxiv:${paperId}&limit=1000`),
      fetch(`/hf-api/arxiv/${paperId}/repos`)
    ]);

    const parseRes = async (res: Response) => {
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((item: any) => ({
            id: item.id,
            likes: item.likes || 0,
            author: item.author || item.id.split('/')[0]
        }));
    };

    const models = await parseRes(modelsRes);
    const datasets = await parseRes(datasetsRes);
    
    // Parse spaces from the /repos endpoint response
    let spaces: { id: string; likes: number; author: string }[] = [];
    if (reposRes.ok) {
        const reposData = await reposRes.json();
        if (reposData.spaces && Array.isArray(reposData.spaces)) {
            spaces = reposData.spaces.map((item: any) => ({
                id: item.id,
                likes: item.likes || 0,
                author: item.author || item.id.split('/')[0]
            }));
        }
    }

    return { models, datasets, spaces };
  } catch (e) {
    console.error("Error fetching paper repos", e);
    return { models: [], datasets: [], spaces: [] };
  }
};
