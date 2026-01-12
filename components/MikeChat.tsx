import React, { useState, useRef, useEffect } from 'react';
import { Project, ChatMessage } from '../types';
import { askMike, generateReportStructure } from '../services/geminiService';
import { DNASpinner } from './DNASpinner';
import { Send, Download, Globe } from 'lucide-react';

interface MikeChatProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

export const MikeChat: React.FC<MikeChatProps> = ({ project, onUpdateProject }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project.chatHistory, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    // Optimistic Update
    const updatedHistory = [...project.chatHistory, userMsg];
    onUpdateProject({ ...project, chatHistory: updatedHistory });
    setInput('');
    setIsTyping(true);

    try {
      const response = await askMike(userMsg.content, project.files, updatedHistory);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response,
        timestamp: Date.now()
      };

      onUpdateProject({ ...project, chatHistory: [...updatedHistory, aiMsg] });
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I encountered an error accessing the knowledge base. Please try again.",
        timestamp: Date.now()
      };
      onUpdateProject({ ...project, chatHistory: [...updatedHistory, errorMsg] });
    } finally {
      setIsTyping(false);
    }
  };

  const handleDownloadReport = async () => {
    setIsGeneratingReport(true);
    try {
      const reportData = await generateReportStructure(project.chatHistory);
      
      // Dynamic import of jspdf (loaded via CDN in index.html)
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const textWidth = pageWidth - (margin * 2);
      
      let y = 20;

      // --- Header per PRD 2.05 ---
      // Main Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175); // Blue-800
      doc.text("ReadForMe Analysis", margin, y);
      y += 12;

      // Project Context
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(`Project Context: ${project.nickname}`, margin, y);
      y += 8;

      // Completion Timestamp
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Completion Timestamp: ${new Date().toLocaleString()}`, margin, y);
      y += 20; // Extra spacing before content

      // Divider Line
      doc.setDrawColor(200);
      doc.line(margin, y - 10, pageWidth - margin, y - 10);

      const addSection = (title: string, content: string) => {
        if (!content || content.length < 5) return;
        
        if (y > 250) { doc.addPage(); y = 20; }
        
        // Section Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(title, margin, y);
        y += 10;
        
        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60);
        
        const splitText = doc.splitTextToSize(content, textWidth);
        doc.text(splitText, margin, y);
        y += (splitText.length * 6) + 10;
      };

      // Logical Flow per PRD
      addSection("Background & Introduction", reportData.background);
      addSection("Experimental Methods", reportData.methods);
      addSection("Results & Conclusions", reportData.results);
      addSection("Discussion & Gap Analysis", reportData.discussion);
      
      if (reportData.references.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("References (APA)", margin, y);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        reportData.references.forEach((ref) => {
           const splitRef = doc.splitTextToSize(ref, textWidth);
           doc.text(splitRef, margin, y);
           y += (splitRef.length * 5) + 5;
        });
      }

      doc.save(`ReadForMe_Analysis_${project.nickname.replace(/\s+/g, '_')}.pdf`);

    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      {/* Chat Header */}
      <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
            M
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white">Mike</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Research Assistant
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={isGeneratingReport || project.chatHistory.length < 2}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-sm"
          aria-label="Download Research Report"
        >
          {isGeneratingReport ? <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /> : <Download className="w-4 h-4" />}
          Download Report
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {project.chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-2 shadow-md">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            )}
            
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
            }`}>
              {/* Using CSS whitespace to preserve Markdown-like formatting */}
              <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {msg.content}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-2">
                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">Me</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
               <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-3 shadow-sm">
              <DNASpinner />
              <span className="text-sm text-slate-500 font-medium animate-pulse">Consulting references...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Mike a research question..."
            className="w-full pl-6 pr-14 py-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-3 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
          Primary Literature Priority • Web Gap Analysis Enabled
        </div>
      </div>
    </div>
  );
};