import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectList } from './components/ProjectList';
import { MikeChat } from './components/MikeChat';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { AnalyzedFile, AnalysisStatus, Project, ThematicStatus, BeforeInstallPromptEvent } from './types';
import { analyzePdf, detectOutliers } from './services/geminiService';
import { fileToBase64 } from './utils/fileHelpers';
import { Sun, Moon, ArrowLeft, Download, BookOpen } from 'lucide-react';
import { DNASpinner } from './components/DNASpinner';

export default function App() {
  // --- State Management ---
  
  // Theme state with local storage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('readforme_theme');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [view, setView] = useState<'LANDING' | 'DASHBOARD' | 'WORKSPACE'>('LANDING');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const STORAGE_KEY = 'readforme_projects_local_v1';
  const THEME_KEY = 'readforme_theme';

  // --- Effects ---

  // PWA Install
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  // Theme Persistence
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load Projects on Mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  // Save Projects on Change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  // Queue Processing Logic (Concurrency = 1)
  useEffect(() => {
    const processQueue = async () => {
      if (!currentProject || isProcessingQueue) return;

      const pendingFile = currentProject.files.find(f => f.status === AnalysisStatus.PENDING);
      if (!pendingFile) {
        // If all files processed and we haven't run Tough Screen yet (or added new files), run it
        const processedCount = currentProject.files.filter(f => f.status === AnalysisStatus.COMPLETED).length;
        if (processedCount >= 3 && !currentProject.themeDescription) {
             runToughScreen(currentProject);
        }
        return;
      }

      setIsProcessingQueue(true);

      try {
        // Update status to processing
        updateFileStatus(pendingFile.id, AnalysisStatus.PROCESSING);

        // Analyze
        const base64 = await fileToBase64(pendingFile.file);
        const result = await analyzePdf(base64);

        // Update with Result
        updateFileStatus(pendingFile.id, AnalysisStatus.COMPLETED, result);
        
      } catch (e: any) {
        console.error(e);
        updateFileStatus(pendingFile.id, AnalysisStatus.ERROR, undefined, e.message);
      } finally {
        setIsProcessingQueue(false);
      }
    };

    if (currentProject?.files.some(f => f.status === AnalysisStatus.PENDING)) {
      processQueue();
    }
  }, [currentProject, isProcessingQueue]);

  // --- Helpers ---

  const updateFileStatus = (fileId: string, status: AnalysisStatus, result?: any, error?: string) => {
    if (!currentProject) return;
    const updatedFiles = currentProject.files.map(f => {
      if (f.id === fileId) {
        return { ...f, status, result, error };
      }
      return f;
    });
    
    // Check if we need to re-run outliers (e.g. after a file completes)
    const updatedProject = { ...currentProject, files: updatedFiles };
    setCurrentProject(updatedProject);
    updateProjectInList(updatedProject);
  };

  const updateProjectInList = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const runToughScreen = async (project: Project) => {
    const completed = project.files.filter(f => f.status === AnalysisStatus.COMPLETED);
    const { mainTheme, outliers } = await detectOutliers(completed);
    
    const updatedFiles = project.files.map(f => {
       const isOutlier = outliers.find(o => o.filename === f.file.name);
       if (isOutlier) {
         return { ...f, thematicStatus: ThematicStatus.OUTLIER, outlierReason: isOutlier.reason };
       }
       return { ...f, thematicStatus: ThematicStatus.ALIGNED };
    });

    const updatedProject = { ...project, files: updatedFiles, themeDescription: mainTheme };
    setCurrentProject(updatedProject);
    updateProjectInList(updatedProject);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProject || !e.target.files) return;
    const newFiles: AnalyzedFile[] = Array.from(e.target.files)
      .filter(f => f.type === 'application/pdf')
      .map(f => ({
        id: uuidv4(),
        file: f,
        status: AnalysisStatus.PENDING,
        thematicStatus: ThematicStatus.UNKNOWN
      }));

    const updatedProject = {
      ...currentProject,
      files: [...currentProject.files, ...newFiles],
      // Reset theme description to trigger a re-run of Tough Screen after new files process.
      themeDescription: undefined 
    };
    
    setCurrentProject(updatedProject);
    updateProjectInList(updatedProject);
  };

  // --- Render ---

  if (view === 'LANDING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="absolute top-6 right-6 z-50">
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)} 
             className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
           >
             {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </div>
        
        <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
           <div className="flex justify-center mb-6">
              <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] shadow-2xl shadow-blue-500/30 ring-4 ring-white dark:ring-slate-800">
                <BookOpen className="w-20 h-20 text-white" />
              </div>
           </div>
           
           <div className="space-y-4 max-w-2xl mx-auto">
             <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
               ReadForMe
             </h1>
             <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
               Transforming folders of scientific literature into actionable intelligence.
             </p>
           </div>

           <div className="pt-4">
             <button
               onClick={() => setView('DASHBOARD')}
               className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white transition-all duration-300 bg-blue-600 font-pj rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/30"
             >
               Begin Reading
               <div className="absolute -inset-3 rounded-2xl bg-blue-400 opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-300" />
             </button>
           </div>
        </div>
        
        <div className="absolute bottom-8 flex items-center gap-2 text-slate-400 dark:text-slate-600 text-xs font-semibold uppercase tracking-widest">
           <span>Powered by Gemini 2.5</span>
           <span>•</span>
           <span>Local Processing</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 transition-colors font-sans">
      
      {/* App Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0 z-20 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
           {view === 'WORKSPACE' && (
             <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300">
               <ArrowLeft className="w-5 h-5" />
             </button>
           )}
           <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setView('LANDING')}>
             <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
               ReadForMe
             </div>
             {isProcessingQueue && (
               <div className="scale-75 origin-left">
                  <DNASpinner />
               </div>
             )}
           </div>
        </div>

        <div className="flex items-center gap-3">
          {installPrompt && (
             <button onClick={() => installPrompt.prompt()} className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
               <Download className="w-4 h-4" /> Install App
             </button>
          )}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Toggle Theme"
          >
             {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex">
        {view === 'DASHBOARD' && (
          <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
             <ProjectList 
               projects={projects} 
               onCreateProject={(nick) => {
                 const newProj: Project = { id: uuidv4(), nickname: nick, createdAt: Date.now(), files: [], chatHistory: [] };
                 setProjects([...projects, newProj]);
                 setCurrentProject(newProj);
                 setView('WORKSPACE');
               }}
               onSelectProject={(p) => {
                 setCurrentProject(p);
                 setView('WORKSPACE');
               }}
             />
          </div>
        )}

        {view === 'WORKSPACE' && currentProject && (
          <div className="w-full h-full flex flex-col md:flex-row">
            
            {/* Modular Sidebar Component */}
            <WorkspaceSidebar 
              project={currentProject} 
              onFileUpload={handleFileUpload} 
            />

            {/* Main: Chat */}
            <section className="flex-1 h-[60vh] md:h-full relative z-10 shadow-inner">
               <MikeChat 
                 project={currentProject} 
                 onUpdateProject={(p) => {
                   setCurrentProject(p);
                   updateProjectInList(p);
                 }} 
               />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}