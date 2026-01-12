import React, { useState, useRef, useEffect } from 'react';
import { Project, ChatMessage } from '../types';
import { askMike, generateReportStructure } from '../services/geminiService';
import { DNASpinner } from './DNASpinner';
import { Send, Download, FileText, Globe, BookOpen } from 'lucide-react';

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

  const handleExportPDF = async () => {
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

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Scientific Research Synthesis", margin, y);
      y += 10;
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text(`Project: ${project.nickname}`, margin, y);
      y += 20;

      const addSection = (title: string, content: string) => {
        if (y > 250) { doc.addPage(); y = 20; }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(title, margin, y);
        y += 10;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60);
        
        const splitText = doc.splitTextToSize(content, textWidth);
        doc.text(splitText, margin, y);
        y += (splitText.length * 6) + 10;
      };

      addSection("1. Background & Introduction", reportData.background);
      addSection("2. Methodology Review", reportData.methods);
      addSection("3. Results & Findings", reportData.results);
      addSection("4. Discussion & Gap Analysis", reportData.discussion);
      
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

      doc.save(`${project.nickname.replace(/\s+/g, '_')}_Report.pdf`);

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
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
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
          onClick={handleExportPDF}
          disabled={isGeneratingReport || project.chatHistory.length < 2}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isGeneratingReport ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> : <Download className="w-4 h-4" />}
          Export Report
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {project.chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-2">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            )}
            
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
            }`}>
              {/* Using CSS whitespace to preserve Markdown-like formatting */}
              <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {msg.content}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-2">
                <span className="text-slate-600 dark:text-slate-300 text-xs">Me</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
               <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <DNASpinner />
              <span className="text-sm text-slate-500 animate-pulse">Consulting references...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Mike a research question..."
            className="w-full pl-6 pr-14 py-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
          Primary Literature Priority • Web Gap Analysis Enabled
        </div>
      </div>
    </div>
  );
};