import React from 'react';
import { Project, ThematicStatus, AnalyzedFile } from '../types';
import { AlertTriangle, CheckCircle2, FileText, Ban } from 'lucide-react';

interface ToughScreenProps {
  files: AnalyzedFile[];
  themeDescription?: string;
}

export const ToughScreen: React.FC<ToughScreenProps> = ({ files, themeDescription }) => {
  const outliers = files.filter(f => f.thematicStatus === ThematicStatus.OUTLIER);
  const aligned = files.filter(f => f.thematicStatus === ThematicStatus.ALIGNED);

  if (files.length === 0) return null;

  return (
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500">THE TOUGH SCREEN™</span> Analysis
        </h3>
        {themeDescription && (
           <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase">
             Detected Theme: {themeDescription}
           </span>
        )}
      </div>

      <div className="space-y-4">
        {outliers.length > 0 ? (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">
                  {outliers.length} Outlier{outliers.length > 1 ? 's' : ''} Detected
                </h4>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-3">
                  These files do not match the dominant scientific theme of the folder and will be excluded from synthesis to ensure accuracy.
                </p>
                <div className="space-y-2">
                  {outliers.map(f => (
                    <div key={f.id} className="flex items-start gap-2 text-xs bg-white dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                      <Ban className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{f.file.name}</span>
                        <p className="text-slate-500 dark:text-slate-400 italic mt-0.5">{f.outlierReason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : aligned.length > 0 ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">All {aligned.length} documents are thematically cohesive.</span>
            </div>
        ) : (
            <div className="text-sm text-slate-500 italic">Waiting for sufficient analysis...</div>
        )}
      </div>
    </div>
  );
};