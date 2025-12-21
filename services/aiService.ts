import OpenAI from 'openai';
import { Paper, ChatMessage, ReasoningMode } from '../types';

// Initialize the OpenAI client pointing to OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.API_KEY || '',
  dangerouslyAllowBrowser: true // Required for client-side usage if not using a backend proxy
});

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
export const DEFAULT_MODEL_LABEL = 'Gemini 3 Flash Preview';

type ReasoningDetail = {
  type?: string;
  text?: string;
  summary?: string;
  data?: string;
  [key: string]: unknown;
};

export type StreamChunk = {
  content?: string;
  reasoning?: string;
};

const getReasoningConfig = (mode: ReasoningMode) => {
  if (mode === "reasoning") {
    return { effort: "medium" as const };
  }
  return { effort: "none" as const };
};

const extractReasoningText = (details: ReasoningDetail[]) => {
  let text = '';
  for (const detail of details) {
    if (detail.type === 'reasoning.text' && typeof detail.text === 'string') {
      text += detail.text;
    } else if (detail.type === 'reasoning.summary' && typeof detail.summary === 'string') {
      text += `${text ? '\n' : ''}Summary: ${detail.summary}\n`;
    }
  }
  return text;
};

export const createSystemInstruction = (paper: Paper, ragContext?: string): string => {
  const base = `
    You are a paper-reading assistant embedded in the "HuggingPapers" platform.
    You are currently discussing the following academic paper:
    
    Title: ${paper.title}
    Authors: ${paper.authors.join(', ')}
    Published: ${paper.publishedDate}
    
    Abstract:
    ${paper.abstract}
    
    Your goal is to help the user understand this paper.
    Keep answers concise, technical where appropriate, and easy to read.
    Format your responses using Markdown.

    Rules:
    - Use only the paper excerpts for paper-specific claims.
    - If the excerpts do not contain the needed info, say you cannot find it in the paper.
    - Cite evidence using page markers like [PAGE 12].
    - Quote short phrases for numbers, datasets, metrics, or method details.
    - If the user asks for a definition, give the paper's definition first, then a plain-language paraphrase.
    - If multiple excerpts disagree, say so and show both.
    - When excerpts are provided, end with an \"Evidence\" section of bullet quotes with page markers.
  `;
  if (!ragContext?.trim()) {
    return `${base}

No paper excerpts were retrieved for this question. Answer only from the abstract and say when the abstract does not cover the request.
`;
  }

  return `${base}

Paper excerpts:
${ragContext}

Use these excerpts as the primary source. If they do not cover the answer, say what is missing and ask for the specific section or page.
`;
};

export const streamMessageToChat = async function* (
  messages: ChatMessage[],
  paper: Paper,
  options?: { reasoningMode?: ReasoningMode; ragContext?: string },
): AsyncGenerator<StreamChunk> {
  try {
    const systemInstruction = createSystemInstruction(paper, options?.ragContext);
    const reasoningMode = options?.reasoningMode ?? "fast";
    const reasoning = getReasoningConfig(reasoningMode);
    const emitReasoning = reasoningMode === "reasoning";

    const apiMessages = [
      { role: "system", content: systemInstruction },
      ...messages
        .filter(m => m.role !== 'system') // System message is generated dynamically
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      // OpenRouter supports unified reasoning config beyond OpenAI's native schema.
      reasoning,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParams & { reasoning: typeof reasoning });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as {
        content?: string;
        reasoning?: string;
        reasoning_details?: ReasoningDetail[];
      } | undefined;

      const content = delta?.content || '';
      if (content) {
        yield { content };
      }

      if (emitReasoning) {
        const reasoningDetails = delta?.reasoning_details;
        const reasoningText = reasoningDetails?.length
          ? extractReasoningText(reasoningDetails)
          : '';
        if (reasoningText) {
          yield { reasoning: reasoningText };
        } else if (delta?.reasoning) {
          yield { reasoning: delta.reasoning };
        }
      }
    }
  } catch (error: any) {
    console.error("Error communicating with OpenRouter:", error);
    yield { content: `Error: Unable to connect to the AI service. \n\nDetails: ${error.message || error}` };
  }
};
