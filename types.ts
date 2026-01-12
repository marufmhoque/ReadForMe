import React from 'react';

// Status of a file in the processing queue
export enum AnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

// Thematic Classification
export enum ThematicStatus {
  UNKNOWN = 'UNKNOWN',
  ALIGNED = 'ALIGNED',
  OUTLIER = 'OUTLIER',
}

export interface Author {
  lastName: string;
  initials: string;
}

export interface CitationData {
  title: string;
  journal?: string;
  year?: string;
  authors: string[]; // List of names
  type: 'Primary Research' | 'Review Article' | 'Other';
  mainTopic: string;
}

// The structure returned by the Gemini API for single file analysis
export interface DocumentAnalysis {
  title: string;
  summary: string;
  keyPoints: string[];
  citationData: CitationData;
  thematicTags: string[];
}

// Internal app representation of a file
export interface AnalyzedFile {
  id: string;
  file: File; // Note: Files are not persistent across reload in browser without specialized API, so we re-request on session start or store metadata only
  status: AnalysisStatus;
  result?: DocumentAnalysis;
  thematicStatus: ThematicStatus;
  outlierReason?: string;
  error?: string;
}

// Project Structure
export interface Project {
  id: string;
  nickname: string;
  createdAt: number;
  files: AnalyzedFile[];
  chatHistory: ChatMessage[];
  themeDescription?: string; // e.g. "Immunology focused on T-Cells"
}

// Chat related types
export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  isThinking?: boolean;
  citations?: string[]; // APA formatted citations used in this response
  gapAnalysis?: {
    identifiedGap: string;
    recommendedReading: Array<{title: string, journal: string}>;
    futureResearch: string;
  };
}

// For the folder input handling
export interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

// PWA Install Prompt Event
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string | boolean;
    directory?: string | boolean;
  }
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Window {
    jspdf: any;
  }
}