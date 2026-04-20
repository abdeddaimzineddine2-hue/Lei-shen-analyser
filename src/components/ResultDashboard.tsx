import React from 'react';
import { format } from 'date-fns';
import { type WipeAnalysis } from '../lib/wcl-types';
import { AlertTriangle, Clock, Skull, Activity, ShieldAlert, Zap, Map as MapIcon, PlayCircle } from 'lucide-react';

interface ResultDashboardProps {
  analyses: WipeAnalysis[];
  reportId: string;
  players: Record<number, string>;
}

export function ResultDashboard({ analyses, reportId, players }: ResultDashboardProps) {
  if (!analyses || analyses.length === 0) return null;

  // Aggregate mistakes for the Hall of Shame
  const punishmentLeaderboard = React.useMemo(() => {
    const counts: Record<string, { total: number, mechanics: Record<string, number> }> = {};
    
    analyses.forEach(wipe => {
      wipe.mistakes.forEach(m => {
        if (!counts[m.playerName]) {
          counts[m.playerName] = { total: 0, mechanics: {} };
        }
        counts[m.playerName].total += 1;
        counts[m.playerName].mechanics[m.mechanicName] = (counts[m.playerName].mechanics[m.mechanicName] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [analyses]);

  const totalMistakes = analyses.reduce((acc, wipe) => acc + wipe.mistakes.length, 0);

  const getMechanicIcon = (name: string) => {
    if (name.includes('Crashing Thunder')) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    if (name.includes('Overcharge')) return <Zap className="w-4 h-4 text-blue-400" />;
    if (name.includes('Diffusion')) return <Zap className="w-4 h-4 text-indigo-400" />;
    if (name.includes('Whip')) return <Zap className="w-4 h-4 text-purple-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const generateDiscordExport = () => {
    let output = `**Lei Shen Heroic - Mistake Analysis**\n`;
    output += `*Processed ${analyses.length} Wipes. Total Mistakes Logged: ${totalMistakes}*\n\n`;
    
    output += `🏆 **Wall of Shame (Top 5)**\n`;
    output += `\`\`\`\n`;
    punishmentLeaderboard.slice(0, 5).forEach((p, i) => {
      output += `${i + 1}. ${p.name.padEnd(12)} - ${p.total} Mistakes\n`;
    });
    output += `\`\`\`\n`;

    navigator.clipboard.writeText(output);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <Skull className="w-5 h-5 text-red-400" />
            <h3 className="font-medium">Wipes Analyzed</h3>
          </div>
          <p className="text-3xl font-bold text-white">{analyses.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-medium">Total Mistakes</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalMistakes}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm shadow-inner flex flex-col justify-center items-start">
           <button 
            onClick={generateDiscordExport}
            className="w-full py-3 bg-[#5865F2]/20 text-[#5865F2] hover:bg-[#5865F2] hover:text-white border border-[#5865F2]/30 rounded-lg transition-all font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            Copy Discord Report
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Hall of Shame */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            The Hall of Shame
          </h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {punishmentLeaderboard.map((player, idx) => (
                <div key={player.name} className="flex items-center justify-between p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : idx === 1 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : idx === 2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-700 text-slate-400'}`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{player.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {Object.entries(player.mechanics).map(([k, v]) => `${v}x ${k}`).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold text-xl text-slate-300 bg-slate-900/50 px-3 py-1 rounded-lg">
                    {player.total}
                  </div>
                </div>
              ))}
              {punishmentLeaderboard.length === 0 && (
                <div className="p-8 text-center text-slate-500 italic">
                  No trackable mistakes found. A perfect raid!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wipe Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Wipe Breakdown
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {analyses.map((wipe, index) => (
              <div key={wipe.fightId} className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <span className="font-bold text-white">Wipe {index + 1}</span>
                    <span className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                      {wipe.wipePercentage.toFixed(1)}% HP
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    {format(wipe.duration, 'mm:ss')}
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  
                  {/* General Positional Events Timeline */}
                  {wipe.mechanicEvents && wipe.mechanicEvents.length > 0 && (
                    <div className="mb-4 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
                      <div className="bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-400 flex items-center gap-1.5 border-b border-slate-700/50">
                        <MapIcon className="w-3.5 h-3.5" />
                        Raid Positional Radars (Casts)
                      </div>
                      <div className="divide-y divide-slate-700/30">
                        {wipe.mechanicEvents.map((evt, i) => (
                           <div key={i} className="flex items-center justify-between py-1.5 hover:bg-slate-800/30 px-3 transition-colors group">
                           <div className="flex items-start gap-3 text-sm">
                             <div>
                               <span className="font-semibold text-indigo-300">{evt.mechanicName}</span>
                               <span className="text-slate-500 text-xs ml-2">(@ {format(evt.timestamp, 'mm:ss')})</span>
                               {evt.description && evt.description.includes('Check Replay') && (
                                   <span className="text-slate-400 text-xs ml-2 block mt-1">{evt.description}</span>
                               )}
                             </div>
                           </div>
                           <a 
                             href={`https://classic.warcraftlogs.com/reports/${reportId}#fight=${wipe.fightId}&view=replay&position=${Math.max(0, evt.timestamp - 3000)}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded text-xs font-medium border border-indigo-500/30 cursor-pointer"
                           >
                             <PlayCircle className="w-3.5 h-3.5" />
                             View in Replay
                           </a>
                         </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consumables Checklist */}
                  {wipe.consumables && wipe.consumables.length > 0 && (
                     <div className="mb-4 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50">
                        <div className="bg-slate-800 py-1.5 px-3 text-xs font-semibold text-slate-400 flex items-center justify-between border-b border-slate-700/50">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-indigo-400" />
                            Pre-pull Consumables & Potions
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">Based on combatantinfo exactly at pull</div>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {wipe.consumables.map(c => {
                                    const missingAnything = !c.hasFlask || !c.hasFood || !c.hasPrePot;
                                    const missingLabels = [];
                                    if (!c.hasFlask) missingLabels.push("Flask");
                                    if (!c.hasFood) missingLabels.push("Food");
                                    if (!c.hasPrePot) missingLabels.push("Pre-pot");

                                    return (
                                        <div key={c.id} className={`flex flex-col text-xs p-2 rounded border ${missingAnything ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/10'}`}>
                                            <span className="font-semibold text-slate-200">{c.name}</span>
                                            {missingAnything ? (
                                                <span className="text-red-400 font-medium">Missing: {missingLabels.join(', ')}</span>
                                            ) : (
                                                <span className="text-green-500 font-medium">Fully Prepared</span>
                                            )}
                                            {(c.combatPots > 0 || c.healthstones > 0) && (
                                                <div className="mt-1 flex gap-2 text-slate-400 text-[10px]">
                                                    {c.combatPots > 0 && <span>🧪 {c.combatPots} Combat Pot{c.combatPots > 1 ? 's' : ''}</span>}
                                                    {c.healthstones > 0 && <span>💚 {c.healthstones} Healthstone{c.healthstones > 1 ? 's' : ''}</span>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                     </div>
                  )}

                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Individual Mistakes</div>
                  {wipe.mistakes.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-2">No tracked personal errors found in this wipe.</p>
                  ) : (
                    wipe.mistakes.map((mistake, i) => (
                      <div key={i} className="flex items-start justify-between py-1 border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30 px-2 -mx-2 rounded transition-colors group">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5">{getMechanicIcon(mistake.mechanicName)}</div>
                          <div>
                            <span className="font-bold text-slate-200">{mistake.playerName}</span>
                            <span className="text-slate-400 mx-2">—</span>
                            <span className="text-slate-300">{mistake.description}</span>
                            <span className="text-slate-500 text-xs ml-2">(@ {format(mistake.timestamp, 'mm:ss')})</span>
                          </div>
                        </div>
                        <a 
                          href={`https://classic.warcraftlogs.com/reports/${reportId}#fight=${wipe.fightId}&view=replay&position=${Math.max(0, mistake.timestamp - 3000)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded text-xs font-medium border border-indigo-500/30 cursor-pointer"
                        >
                          <PlayCircle className="w-3 h-3" /> Replay
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
