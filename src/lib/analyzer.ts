import { fetchGraphQL } from './wcl-api';
import { LEI_SHEN_ID, LEI_SHEN_MECHANICS, CONSUMABLES, type WCLEvent, type PlayerMistake, type WipeAnalysis, type PlayerConsumables } from './wcl-types';

export async function fetchLeiShenWipes(reportId: string, encounterId: number = LEI_SHEN_ID) {
  const query = `
    query GetFights($reportId: String!) {
      reportData {
        report(code: $reportId) {
          fights(encounterID: ${encounterId}) {
            id
            startTime
            endTime
            name
            kill
            fightPercentage
          }
          masterData {
            actors(type: "Player") {
              id
              name
              subType
            }
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, { reportId });
  const report = data?.reportData?.report;
  
  if (!report || !report.fights) return { fights: [], players: {} };

  // Filter for wipes only here to be safer
  const wipes = report.fights.filter((f: any) => f.kill === false);

  const playerMap: Record<number, string> = {};
  if (report.masterData && report.masterData.actors) {
    report.masterData.actors.forEach((a: any) => {
      playerMap[a.id] = a.name;
    });
  }

  return {
    fights: wipes,
    players: playerMap
  };
}

export async function analyzeWipe(reportId: string, fight: any, players: Record<number, string>): Promise<WipeAnalysis> {
  const ALL_TRACKED_SPELLS = [
    ...Object.values(LEI_SHEN_MECHANICS),
    ...CONSUMABLES.POTIONS,
    ...CONSUMABLES.HEALTHSTONES
  ];

  const query = `
    query GetFightEvents($reportId: String!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $reportId) {
          events(startTime: $startTime, endTime: $endTime, limit: 10000, 
                 filterExpression: "type = \\"combatantinfo\\" OR ability.id IN (${ALL_TRACKED_SPELLS.join(',')})") {
            data
          }
        }
      }
    }
  `;

  const data = await fetchGraphQL(query, { 
    reportId, 
    startTime: fight.startTime, 
    endTime: fight.endTime 
  });

  const events: WCLEvent[] = data?.reportData?.report?.events?.data || [];
  const mistakes: PlayerMistake[] = [];
  const mechanicEvents: MechanicEvent[] = [];
  const handledCasts = new Set<string>();
  const combatants: Record<number, PlayerConsumables> = {};

  events.forEach(event => {
    // 0. Parse Pre-pull Consumables Snapshot
    // WCL fires a 'combatantinfo' payload for every player at the precise millisecond combat begins
    if (event.type === 'combatantinfo') {
      const playerId = event.sourceID;
      // Ensure it's a real player and not a pet getting a strange ghost event
      if (playerId && players[playerId]) {
        const auras = event.auras || [];
        const hasFood = auras.some((a: any) => CONSUMABLES.FOOD.includes(a.ability));
        const hasFlask = auras.some((a: any) => CONSUMABLES.FLASKS.includes(a.ability));
        const hasPrePot = auras.some((a: any) => CONSUMABLES.POTIONS.includes(a.ability));

        combatants[playerId] = {
          id: playerId,
          name: players[playerId],
          hasFood,
          hasFlask,
          hasPrePot,
          combatPots: 0,
          healthstones: 0
        };
      }
      return; // combatantinfo events have no damage/cast data for subsequent steps
    }

    // 0.5 Parse Mid-fight consumables (Potions being consumed, Healthstones)
    if (event.type === 'cast' && event.sourceID && combatants[event.sourceID]) {
      const spellId = event.abilityGameID;
      if (spellId) {
        if (CONSUMABLES.POTIONS.includes(spellId)) {
          combatants[event.sourceID].combatPots++;
        } else if (CONSUMABLES.HEALTHSTONES.includes(spellId)) {
          combatants[event.sourceID].healthstones++;
        }
      }
    }

    // 1. Process Positional Cast Sweeps (Thunderstruck, Bouncing Bolt Casts)
    if (event.type === 'cast' || event.type === 'begincast' || event.type === 'applydebuff') {
      const spellId = event.abilityGameID;
      if (!spellId) return;

      if (spellId === LEI_SHEN_MECHANICS.THUNDERSTRUCK_CAST || spellId === LEI_SHEN_MECHANICS.BOUNCING_BOLT_CAST || spellId === LEI_SHEN_MECHANICS.SUMMON_BALL_LIGHTNING || spellId === LEI_SHEN_MECHANICS.STATIC_SHOCK) {
        const timeKey = Math.floor((event.timestamp - fight.startTime) / 4000);
        const nameKey = spellId === LEI_SHEN_MECHANICS.STATIC_SHOCK ? `${spellId}-${timeKey}-${event.targetID}` : `${spellId}-${timeKey}`;
        
        let name = 'Unknown';
        if (spellId === LEI_SHEN_MECHANICS.THUNDERSTRUCK_CAST) name = 'Thunderstruck (Cast)';
        if (spellId === LEI_SHEN_MECHANICS.BOUNCING_BOLT_CAST) name = 'Bouncing Bolts (Cast)';
        if (spellId === LEI_SHEN_MECHANICS.SUMMON_BALL_LIGHTNING) name = 'Summon Ball Lightning (Adds Spawn)';
        if (spellId === LEI_SHEN_MECHANICS.STATIC_SHOCK) name = 'Static Shock (Applied)';
        
        console.log(`[DEBUG MECHANIC] Spell: ${name}, targetID: ${event.targetID}, type: ${event.type}`, event);

        // Try extracting targetX/targetY from the log itself to spot the baiter without jumping to replay!
        let baitLocationHint = '';
        if (event.targetX && event.targetY) {
            baitLocationHint = ` at (X: ${Math.round(parseFloat(event.targetX as any))}, Y: ${Math.round(parseFloat(event.targetY as any))})`;
        }

        // Grab target name if it exists on this exact event frame
        if (event.targetID && players[event.targetID]) {
          name += ` on ${players[event.targetID]}`;
        }

        // Check if we already logged this cast window
        const existingEventIndex = mechanicEvents.findIndex(e => e.id === nameKey);
        
        if (existingEventIndex === -1) {
          mechanicEvents.push({
            id: nameKey,
            mechanicName: name,
            spellId: spellId,
            timestamp: event.timestamp - fight.startTime,
            description: `Check Replay for Baiter${baitLocationHint}`
          });
        } else {
          // If the previous one we captured DID NOT have a target, but THIS ONE does, upgrade the name!
          // This solves the issue where begincast has no target, but cast success does!
          if (!mechanicEvents[existingEventIndex].mechanicName.includes(' on ') && name.includes(' on ')) {
            mechanicEvents[existingEventIndex].mechanicName = name;
          }
        }
      }
    }

    // 2. Process Mistake Damage checks
    if (event.type !== 'damage' || !event.targetID || !players[event.targetID]) return;

    const targetName = players[event.targetID];
    const spellId = event.abilityGameID;

    if (!spellId) return;

    switch(spellId) {
      case LEI_SHEN_MECHANICS.THUNDERSTRUCK:
        // In 10/25m HC, Lei Shen's Thunderstruck deals ~1,000,000 to ~1,200,000 base damage reduced by distance.
        // If a player takes roughly > 250,000 unmitigated, they were too close (within ~20 yards of him).
        const dmg = event.unmitigatedAmount || event.amount || 0;
        
        console.log(`[DEBUG] Thunderstruck hit ${targetName} for ${dmg} unmitigated. Raw Amount: ${event.amount}`);

        if (dmg > 250000) {
          mistakes.push({
            playerId: event.targetID,
            playerName: targetName,
            mechanicName: 'Thunderstruck',
            spellId: spellId,
            timestamp: event.timestamp - fight.startTime,
            damageTaken: dmg,
            description: `Too close to Boss (${Math.round(dmg/1000)}k dmg)`
          });
        }
        break;

      case LEI_SHEN_MECHANICS.CRASHING_THUNDER:
        mistakes.push({
          playerId: event.targetID,
          playerName: targetName,
          mechanicName: 'Crashing Thunder',
          spellId: spellId,
          timestamp: event.timestamp - fight.startTime,
          damageTaken: event.amount,
          description: `Stood in Crashing Thunder`
        });
        break;
      
      case LEI_SHEN_MECHANICS.OVERCHARGE:
        // Overcharge damage to self is mitigated, damage to others is usually what we track if people failed to spread
        // A deeper check might be needed for actual source vs target, but raw damage taken works as a baseline metric
        mistakes.push({
          playerId: event.targetID,
          playerName: targetName,
          mechanicName: 'Overcharge',
          spellId: spellId,
          timestamp: event.timestamp - fight.startTime,
          damageTaken: event.amount,
          description: `Hit by an Overcharge ring`
        });
        break;

      case LEI_SHEN_MECHANICS.DIFFUSION_CHAIN:
        // Getting hit by diffusion chain (usually means someone was too close)
        mistakes.push({
          playerId: event.targetID,
          playerName: targetName,
          mechanicName: 'Diffusion Chain',
          spellId: spellId,
          timestamp: event.timestamp - fight.startTime,
          damageTaken: event.amount,
          description: `Chained by Diffusion Chain (too close)`
        });
        break;

      case LEI_SHEN_MECHANICS.LIGHTNING_WHIP_VOID:
        mistakes.push({
          playerId: event.targetID,
          playerName: targetName,
          mechanicName: 'Lightning Whip (Void)',
          spellId: spellId,
          timestamp: event.timestamp - fight.startTime,
          damageTaken: event.amount,
          description: `Stood in the Lightning Whip lines`
        });
        break;
    }
  });

  return {
    fightId: fight.id,
    startTime: fight.startTime,
    endTime: fight.endTime,
    duration: fight.endTime - fight.startTime,
    kill: fight.kill,
    wipePercentage: fight.fightPercentage,
    mistakes,
    mechanicEvents: mechanicEvents.sort((a,b) => a.timestamp - b.timestamp),
    consumables: Object.values(combatants).sort((a,b) => a.name.localeCompare(b.name))
  };
}
