import React, { useState } from 'react';
import { Settings, Search, Loader2, AlertCircle, CheckSquare, Square, ListFilter } from 'lucide-react';
import { useStore } from './lib/store';
import { SettingsModal } from './components/SettingsModal';
import { ResultDashboard } from './components/ResultDashboard';
import { fetchGraphQL, extractReportId } from './lib/wcl-api';
import { fetchLeiShenWipes, analyzeWipe } from './lib/analyzer';
import { type WipeAnalysis, type FightInfo } from './lib/wcl-types';
import { format } from 'date-fns';

export default function App() {
  const store = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [url, setUrl] = useState('');
  
  // State for fetching wipes
  const [isFetchingFights, setIsFetchingFights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Intermediary state: Wipes before analysis
  const [availableWipes, setAvailableWipes] = useState<FightInfo[] | null>(null);
  const [selectedWipeIds, setSelectedWipeIds] = useState<Set<number>>(new Set());
  const [reportDataId, setReportDataId] = useState<string>('');
  const [reportPlayers, setReportPlayers] = useState<Record<number, string>>({});
  
  // Final state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<WipeAnalysis[] | null>(null);

  const handleFetchFights = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setAvailableWipes(null);
    setSelectedWipeIds(new Set());

    const reportId = extractReportId(url);
    if (!reportId) {
      setError("Invalid Warcraft Logs URL. Make sure it contains a report ID.");
      return;
    }

    if (!store.hasCredentials()) {
      setIsSettingsOpen(true);
      return;
    }

    setIsFetchingFights(true);
    try {
      setReportDataId(reportId);
      const diagQuery = `
        query GetDiagnose($reportId: String!) {
          reportData {
            report(code: $reportId) {
              fights {
                id
                name
                encounterID
                kill
                difficulty
              }
            }
          }
        }
      `;
      const diagData = await fetchGraphQL(diagQuery, { reportId });
      const allFights = diagData?.reportData?.report?.fights || [];
      
      const leiShenFights = allFights.filter((f: any) => f.encounterID === 1577 || f.name === "Lei Shen");
      
      if (allFights.length === 0) {
        throw new Error("No fights found in this report at all. Check the report ID or permissions.");
      }
      
      if (leiShenFights.length === 0) {
        const otherEncounters = Array.from(new Set(allFights.map((f:any) => f.name))).join(', ');
        throw new Error(`Found fights in this log, but no Lei Shen (Found: ${otherEncounters}). Make sure this is a Throne of Thunder log.`);
      }

      const leiShenWipes = leiShenFights.filter((f: any) => f.kill === false);

      if (leiShenWipes.length === 0) {
        throw new Error(`Found ${leiShenFights.length} Lei Shen pulls, but none of them were wipes! (They were kills)`);
      }

      const actualEncounterId = leiShenFights[0].encounterID || 1577;
      const { fights, players } = await fetchLeiShenWipes(reportId, actualEncounterId);
      
      setAvailableWipes(fights);
      setReportPlayers(players);
      // Pre-select all wipes by default setup
      setSelectedWipeIds(new Set(fights.map((f: FightInfo) => f.id)));

    } catch (err: any) {
      setError(err.message || "An error occurred while fetching log data.");
    } finally {
      setIsFetchingFights(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    if (!availableWipes || selectedWipeIds.size === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const wipesToAnalyze = availableWipes.filter(w => selectedWipeIds.has(w.id));
      const wipePromises = wipesToAnalyze.map(fight => analyzeWipe(reportDataId, fight, reportPlayers));
      const wipeAnalyses = await Promise.all(wipePromises);

      setResults(wipeAnalyses.sort((a, b) => a.startTime - b.startTime));
    } catch(err: any) {
      setError(err.message || "An error occurred while analyzing the selected wipes.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleWipeSelection = (id: number) => {
    const next = new Set(selectedWipeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedWipeIds(next);
  };

  const selectAll = () => {
    if(availableWipes) {
      setSelectedWipeIds(new Set(availableWipes.map(f => f.id)));
    }
  };

  const deselectAll = () => {
    setSelectedWipeIds(new Set());
  };

  const resetSearch = () => {
    setResults(null);
    setAvailableWipes(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={resetSearch}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Lei Shen HC Analyzer
            </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer relative"
          >
            <Settings className="w-5 h-5" />
            {!store.hasCredentials() && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {!availableWipes && !results && (
          <div className="max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleFetchFights} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste MoP Classic Warcraft Logs URL..."
                  className="w-full bg-transparent border-none py-4 pl-6 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-0"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isFetchingFights}
                  className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isFetchingFights ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching...</> : 'Find Wipes'}
                </button>
              </div>
            </form>

            {!error && !isFetchingFights && (
              <div className="max-w-md mx-auto text-center space-y-4 text-slate-500 mt-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6 transform -rotate-6 border border-slate-700/50">
                  <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h2 className="text-lg font-medium text-slate-300">Strict Heuristic Engine</h2>
                <p className="text-sm leading-relaxed">
                  Paste a Warcraft Logs report ID. Select the specific wipes you want to analyze by Phase/Percentage, and the engine will track avoidable damage and mechanical failures.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-200 items-start animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Step 2: Select Wipes */}
        {availableWipes && !results && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ListFilter className="w-6 h-6 text-indigo-400" />
                  Select Wipes
                </h2>
                <p className="text-slate-400 mt-1">Found {availableWipes.length} wipes. Choose which ones to analyze.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={selectAll} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">Select All</button>
                <button onClick={deselectAll} className="text-sm text-slate-400 hover:text-slate-300 font-medium">Deselect All</button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/50 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-2">Include</div>
                <div className="col-span-4">Wipe #</div>
                <div className="col-span-3">Boss HP</div>
                <div className="col-span-3">Duration</div>
              </div>
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                {availableWipes.map((wipe, idx) => (
                  <label 
                    key={wipe.id} 
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <div className="col-span-2 flex items-center">
                      <div className="relative flex items-center justify-center w-5 h-5">
                        {selectedWipeIds.has(wipe.id) ? (
                          <CheckSquare className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-500 transition-colors" />
                        )}
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedWipeIds.has(wipe.id)} 
                          onChange={() => toggleWipeSelection(wipe.id)} 
                        />
                      </div>
                    </div>
                    <div className="col-span-4 font-medium text-slate-300">
                      Wipe {idx + 1}
                    </div>
                    <div className="col-span-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        {wipe.fightPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-3 text-slate-400 text-sm">
                      {format(wipe.endTime - wipe.startTime, 'mm:ss')}
                    </div>
                  </label>
                ))}
              </div>
              <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 text-sm">{selectedWipeIds.size} selected</span>
                <div className="flex gap-3">
                  <button onClick={resetSearch} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer font-medium">
                    Cancel
                  </button>
                  <button 
                    onClick={handleAnalyzeSelected}
                    disabled={selectedWipeIds.size === 0 || isAnalyzing}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all font-medium flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : `Analyze ${selectedWipeIds.size} pulls`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {results && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setResults(null)} className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-700">
                ← Back to Pulls
              </button>
            </div>
            <ResultDashboard analyses={results} reportId={reportDataId} players={reportPlayers} />
          </div>
        )}

      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
