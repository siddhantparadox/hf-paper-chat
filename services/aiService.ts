import OpenAI from 'openai';
import { Paper, ChatMessage } from '../types';

// Initialize the OpenAI client pointing to OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.API_KEY || '',
  dangerouslyAllowBrowser: true // Required for client-side usage if not using a backend proxy
});

const MODEL_NAME = "google/gemini-2.5-flash-preview-09-2025";

export const createSystemInstruction = (paper: Paper): string => {
  return `
    You are a helpful AI research assistant embedded in the "HuggingPapers" platform.
    You are currently discussing the following academic paper:
    
    Title: ${paper.title}
    Authors: ${paper.authors.join(', ')}
    Published: ${paper.publishedDate}
    
    Abstract:
    ${paper.abstract}
    
    Your goal is to help the user understand this paper. 
    Answer questions based on the abstract provided above. 
    If the question requires information not present in the abstract, use your general knowledge but clarify that it might not be in the specific paper text provided.
    Keep answers concise, technical where appropriate, and easy to read.
    Format your responses using Markdown.
  `;
};

export const streamMessageToChat = async function* (messages: ChatMessage[], paper: Paper) {
  try {
    const systemInstruction = createSystemInstruction(paper);

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
      model: MODEL_NAME,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error: any) {
    console.error("Error communicating with OpenRouter:", error);
    yield `Error: Unable to connect to the AI service. \n\nDetails: ${error.message || error}`;
  }
};
