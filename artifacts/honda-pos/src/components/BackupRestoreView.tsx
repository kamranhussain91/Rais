/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from './AppContext';
import { 
  Cloud, 
  CloudLightning, 
  RefreshCw, 
  Download, 
  Upload, 
  Calendar, 
  CheckCircle, 
  Check, 
  FileCode,
  ShieldAlert
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const { db, triggerBackup, triggerRestore, refreshData, currentUser } = useApp();
  const isUserAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Manager';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!db) return <div className="p-8 text-slate-500">Loading replication desks...</div>;

  const { backups } = db;

  // Trigger server-side manual file replication
  const handleCreateServerBackup = async () => {
    setLoading(true);
    setSuccessMsg(null);
    const success = await triggerBackup('Manual');
    setLoading(false);
    if (success) {
      setSuccessMsg('Successfully created backup mirror archive on local server disk');
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      alert('Error writing json database replica to node server.');
    }
  };

  // Download entire database as a local download file (JSON format)
  const handleDownloadOfflineDBFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `rais_honda_parts_db_${new Date().toISOString().substring(0,10)}.json`);
    dlAnchorElem.click();
  };

  // Handle uploaded JSON file selection to restore DB
  const handleUploadRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isUserAdmin) {
      alert('Secured Restore: Overwriting the database requires Administrator permissions.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textStr = event.target?.result as string;
        const parsedDBObj = JSON.parse(textStr);

        setLoading(true);
        const success = await triggerRestore(parsedDBObj);
        setLoading(false);

        if (success) {
          setSuccessMsg('Database fully restored from uploaded JSON file successfully!');
          setTimeout(() => setSuccessMsg(null), 5000);
          refreshData(); // Hard re-load context
        } else {
          alert('Upload failed: Ensure database fields matches Honda schema.');
        }
      } catch (err) {
        alert('Failed parsing uploaded file. Verify file is uncorrupted JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="backup-restore-view-container">
      
      {/* MAIN TRIGGERS CONTAINER MODULE K */}
      <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-red-600 animate-pulse" /> Replications & Offsite Backups
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">Dual backup structures: offline portable downloads or persistent server mirrors</p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200/70 flex items-center gap-2 text-[10px] font-sans">
            <Check className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          
          {/* server replica */}
          <div className="p-4 rounded-xl border border-slate-250 bg-slate-50/50 flex flex-col justify-between hover:border-red-200 transition-all">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-800 block text-xs">Create Server Mirror</span>
              <p className="text-slate-400 text-[10px] leading-normal mt-0.5">Saves a timestamped backup in the server directories for fast recovery</p>
            </div>
            <button 
              className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xxs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors uppercase tracking-wider"
              onClick={handleCreateServerBackup}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Write Server Backup
            </button>
          </div>

          {/* offline file download */}
          <div className="p-4 rounded-xl border border-slate-250 bg-slate-50/50 flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-800 block text-xs">Download Database JSON</span>
              <p className="text-slate-400 text-[10px] leading-normal mt-0.5">Exports the full shop database as a local download file for complete safety</p>
            </div>
            <button 
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors uppercase tracking-wider"
              onClick={handleDownloadOfflineDBFile}
            >
              <Download className="w-3 h-3" /> Export Portable JSON
            </button>
          </div>

          {/* overwrite loader */}
          <div className="p-5 rounded-2xl border border-dashed border-red-200 bg-red-50/15 sm:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <span className="font-black text-rose-800 flex items-center gap-2 text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600" /> Administrative Database Recovery
              </span>
              <p className="text-xxs text-slate-500 leading-normal">
                Upload a previously saved database backup file (`rais_honda_parts_db_*.json`) to overwrite the active environment.
                <strong className="text-rose-600 block mt-1">Warning: This operation overrides all current lists and ledger books!</strong>
              </p>
            </div>

            <div className="flex justify-center items-center">
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json"
                className="hidden"
                onChange={handleUploadRestoreFile}
              />
              <button 
                className={`py-2 w-full px-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg text-xxs shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${!isUserAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={() => isUserAdmin ? fileInputRef.current?.click() : alert('Administrator permissions required')}
                disabled={!isUserAdmin}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Backup File & Restore DB
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* REPLICAS HISTORY LOG LISTS */}
      <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-705 text-slate-800" /> Server Backup Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal">Displays previous backup archives written on server storage files</p>
        </div>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 text-xs">
          {backups && backups.length > 0 ? (
            backups.map(bk => (
              <div key={bk.id} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-1.5 text-xxs">
                  <span className="font-extrabold text-slate-805 text-slate-800 text-xs block truncate max-w-[200px]" title={bk.filename}>
                    {bk.filename}
                  </span>
                  <p className="text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-350" /> {new Date(bk.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-mono text-xxs font-black text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shrink-0">
                    {Math.round(bk.size / 1024)} KB
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] bg-red-50 text-red-700 border border-red-100 font-black uppercase tracking-wider">
                    {bk.type}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No server-side backup archives registered yet. Hit "Write Server Backup" on the left to create your first replica mirror.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
