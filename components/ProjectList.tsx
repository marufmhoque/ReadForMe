import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { Plus, FolderOpen, Clock, ChevronRight, Search, Filter, FileText } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onCreateProject: (nickname: string) => void;
  onSelectProject: (project: Project) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'files_desc';

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onSelectProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim()) return;
    onCreateProject(newNickname);
    setNewNickname('');
    setIsCreating(false);
  };

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter
    if (searchTerm) {
      result = result.filter(p => p.nickname.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date_desc') return b.createdAt - a.createdAt;
      if (sortBy === 'date_asc') return a.createdAt - b.createdAt;
      if (sortBy === 'files_desc') return b.files.length - a.files.length;
      return 0;
    });

    return result;
  }, [projects, searchTerm, sortBy]);

  return (
    <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Research Projects</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your scientific synthesis workspaces.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      {/* Controls */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="pl-10 pr-8 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer shadow-sm min-w-[180px]"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="files_desc">Most Files</option>
          </select>
        </div>
      </div>

      {isCreating && (
        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl animate-in slide-in-from-top-4">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="e.g., T-Cell Exhaustion Study"
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Create Workspace
            </button>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 && !isCreating ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
            <FolderOpen className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No projects found.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Start a new research synthesis or adjust your search.</p>
          </div>
        ) : (
          filteredProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="group cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                 <ChevronRight className="w-6 h-6 text-blue-500" />
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                    {project.nickname}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg w-fit mb-4">
                 <FileText className="w-4 h-4" />
                 <span className="font-medium">{project.files.length} Files</span>
              </div>

              {project.themeDescription && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Detected Theme</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {project.themeDescription}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};