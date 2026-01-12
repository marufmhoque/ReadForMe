import React from 'react';
import { Project, AnalyzedFile, AnalysisStatus, ThematicStatus } from '../types';
import { ToughScreen } from './ToughScreen';
import { FilePlus, FileText, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { DNASpinner } from './DNASpinner';

interface WorkspaceSidebarProps {
  project: Project;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({ project, onFileUpload }) => {
  
  const getStatusIcon = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.COMPLETED:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case AnalysisStatus.PROCESSING:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case AnalysisStatus.ERROR:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.COMPLETED: return 'Analyzed';
      case AnalysisStatus.PROCESSING: return 'Analyzing...';
      case AnalysisStatus.ERROR: return 'Failed';
      case AnalysisStatus.PENDING: return 'Queued';
      default: return '';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-[40vh] md:h-full transition-colors">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="font-bold text-xl text-slate-800 dark:text-white truncate mb-1">
          {project.nickname}
        </h2>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Project Workspace
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Upload Trigger */}
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all group bg-slate-100/50 dark:bg-slate-900/50">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
            <FilePlus className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Add Documents</span>
          <span className="text-xs text-slate-400 mt-1">PDF Format Only</span>
          <input type="file" multiple accept="application/pdf" className="hidden" onChange={onFileUpload} />
        </label>

        {/* Tough Screen Logic */}
        <ToughScreen files={project.files} themeDescription={project.themeDescription} />

        {/* File List */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Files ({project.files.length})
            </h3>
            {project.files.some(f => f.status === AnalysisStatus.PROCESSING) && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Processing
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {project.files.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                No files uploaded yet.
              </div>
            ) : (
              project.files.map(f => (
                <div 
                  key={f.id} 
                  className={`relative group flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                    f.thematicStatus === ThematicStatus.OUTLIER 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      f.thematicStatus === ThematicStatus.OUTLIER 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-500'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-medium ${
                         f.thematicStatus === ThematicStatus.OUTLIER 
                         ? 'text-red-900 dark:text-red-200' 
                         : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {f.file.name}
                      </div>
                      
                      {/* Detailed Progress Indicator */}
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(f.status)}
                        <span className={`text-xs font-medium ${
                          f.status === AnalysisStatus.ERROR ? 'text-red-500' :
                          f.status === AnalysisStatus.COMPLETED ? 'text-green-600 dark:text-green-400' :
                          f.status === AnalysisStatus.PROCESSING ? 'text-blue-600 dark:text-blue-400' :
                          'text-slate-400'
                        }`}>
                          {getStatusText(f.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual hint for outlier */}
                  {f.thematicStatus === ThematicStatus.OUTLIER && (
                    <div className="absolute right-2 top-2 w-2 h-2 rounded-full bg-red-500" title="Outlier Detected" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};