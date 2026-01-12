import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DocumentAnalysis, AnalysisStatus, CitationData, ChatMessage, AnalyzedFile } from '../types';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    citationData: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        journal: { type: Type.STRING },
        year: { type: Type.STRING },
        authors: { type: Type.ARRAY, items: { type: Type.STRING } },
        type: { type: Type.STRING, enum: ['Primary Research', 'Review Article', 'Other'] },
        mainTopic: { type: Type.STRING }
      }
    },
    thematicTags: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

const outlierSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    mainTheme: { type: Type.STRING, description: "The dominant scientific theme of the group" },
    outliers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Why this file does not fit the main theme" }
        }
      }
    }
  }
};

// Helper to wait for a specified duration
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry logic wrapper
async function retryWithBackoff<T>(
  operation: () => Promise<T>, 
  retries = 5, 
  delay = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = 
      error.status === 429 || 
      error.code === 429 || 
      (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
    
    const isServerOverload = error.status === 503 || (error.message && error.message.includes('503'));

    if ((isQuotaError || isServerOverload) && retries > 0) {
      console.warn(`Gemini API limit hit. Retrying in ${delay}ms...`);
      await wait(delay);
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Analyzes a PDF file.
 * Uses gemini-3-flash-preview for speed and efficiency on single file tasks.
 */
export const analyzePdf = async (base64Data: string): Promise<DocumentAnalysis> => {
  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Data } },
          { text: "Analyze this PDF. Extract metadata for APA citation, determine if it is Primary Research or Review, and summarize key scientific findings." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    return JSON.parse(text) as DocumentAnalysis;
  });
};

/**
 * The "Tough Screen": Identifies outliers in a batch of files.
 * Uses gemini-3-flash-preview for efficient batch processing.
 */
export const detectOutliers = async (files: AnalyzedFile[]): Promise<{ mainTheme: string, outliers: { filename: string, reason: string }[] }> => {
  if (files.length < 3) return { mainTheme: "Insufficient files for cohesion check", outliers: [] };

  const summaries = files.map(f => `Filename: ${f.file.name}\nTitle: ${f.result?.title}\nTopic: ${f.result?.citationData.mainTopic}\nType: ${f.result?.citationData.type}`).join('\n---\n');

  const prompt = `
    Analyze the following list of scientific documents.
    1. Identify the dominant scientific theme (e.g., "Immunology: T-Cell Exhaustion" or "Machine Learning: Transformers").
    2. Identify any outliers. An outlier is a paper that belongs to a completely different field (e.g., A cardiovascular paper in an immunology folder).
    3. Strictly distinguish between Primary Literature and Reviews. If the topic is the same, it is NOT an outlier.
    
    Documents:
    ${summaries}
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: outlierSchema,
        temperature: 0.1
      }
    });

    return JSON.parse(response.text || "{}");
  });
};

/**
 * "Mike" Chatbot: Synthesizes answers and performs Gap Analysis with Web Search.
 * Uses gemini-3-pro-preview for complex reasoning and synthesis.
 */
export const askMike = async (question: string, files: AnalyzedFile[], previousChat: ChatMessage[]): Promise<string> => {
  const completedFiles = files.filter(f => f.status === AnalysisStatus.COMPLETED && f.result && f.thematicStatus !== 'OUTLIER');
  
  if (completedFiles.length === 0) return "I need valid, non-outlier documents to analyze before I can answer.";

  // Context Construction
  const context = completedFiles.map(f => `
    [ID: ${f.id}]
    Title: ${f.result?.title}
    Authors: ${f.result?.citationData.authors.join(', ')} (${f.result?.citationData.year})
    Summary: ${f.result?.summary}
    Key Points: ${f.result?.keyPoints.join('; ')}
  `).join('\n\n');

  const chatHistory = previousChat.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
    You are "Mike", a senior scientific research assistant powered by Gemini 1.5 Pro capabilities.
    User Question: "${question}"

    Research Context (from uploaded folder):
    ${context}

    Chat History:
    ${chatHistory}

    Instructions:
    1. Answer the user's question by SYNTHESIZING information from the provided documents. Do not just list summaries.
    2. You MUST cite your sources using strict APA format in-text (Author, Year) when making claims.
    3. If the answer is NOT in the documents, you must perform a GAP ANALYSIS.
       - Use the 'googleSearch' tool to find the missing information.
       - Prioritize Peer-Reviewed Literature over generic websites.
    4. Return your response in a clear, structured Markdown format.
    5. At the end, list the full APA References for any papers cited.
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      }
    });

    // Check for grounding (web search results)
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text = response.text || "I couldn't generate a response.";

    if (grounding && grounding.length > 0) {
      text += "\n\n*External Sources Consulted:*";
      grounding.forEach((chunk: any) => {
        if (chunk.web?.uri) {
           text += `\n- [${chunk.web.title}](${chunk.web.uri})`;
        }
      });
    }

    return text;
  });
};

/**
 * Generates the logic for the final PDF report.
 * Uses gemini-3-pro-preview for high-quality long-context synthesis.
 */
export const generateReportStructure = async (chatHistory: ChatMessage[]): Promise<{
  background: string,
  methods: string,
  results: string,
  discussion: string,
  references: string[]
}> => {
  if (chatHistory.length === 0) throw new Error("No chat history to synthesize.");

  const conversation = chatHistory.filter(m => m.role !== 'user').map(m => m.content).join('\n\n');

  const prompt = `
    I have a series of Q&A responses about a scientific topic. 
    Re-organize this unstructured information into a formal Scientific Report structure.
    Igore chronological order of the questions. Group facts logically.
    
    Input Text:
    ${conversation}

    Output Requirement (JSON):
    - background: Synthesize introduction and background info.
    - methods: Synthesize any experimental methods discussed.
    - results: Synthesize findings and data.
    - discussion: Synthesize conclusions, gaps, and future directions.
    - references: A consolidated list of all APA references mentioned.
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    return JSON.parse(response.text || "{}");
  });
};