import React, { useState } from 'react';
import { Settings, Save, Key, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const store = useStore();
  const [clientId, setClientId] = useState(store.clientId || '');
  const [clientSecret, setClientSecret] = useState(store.clientSecret || '');
  
  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.setCredentials(clientId.trim(), clientSecret.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            API Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3 text-sm text-indigo-200">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <p>
              To pull logs, you need a Warcraft Logs V2 Client API key. 
              You can generate one globally in your <a href="https://classic.warcraftlogs.com/profile" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">WCL Profile settings</a> under webhooks/clients.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Client ID</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  placeholder="e.g. 1a2b3c4d-..."
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Client Secret</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  placeholder="••••••••••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Keys
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
