// Spell IDs for Lei Shen HC based on MoP Classic data
export const LEI_SHEN_MECHANICS = {
  // Phase 1 / General
  DECAPITATE: 134912, // Tank damage - should be mitigated/distanced
  THUNDERSTRUCK_CAST: 135095, 
  THUNDERSTRUCK: 135115, // Actual impact damage spell ID
  CRASHING_THUNDER: 135150, // Standing in the bad stuff

  // Phase 2 / North
  BOUNCING_BOLT_CAST: 136272,
  BOUNCING_BOLT: 136361, // The initial hit
  UNMAPPED_ENERGY: 136294, // Add spawned (Missed soak) - This is an NPC id usually, but we look for summon events
  SUMMON_BALL_LIGHTNING: 136543, // P2 Add Spawns (Ball Lightning)
  
  // South
  OVERCHARGE: 136224, // Hitting others with the stun ring
  
  // East
  DIFFUSION_CHAIN: 135991, // Chain lightning
  
  // West
  STATIC_SHOCK: 135695, // Shared damage. Needs multiple soakers.

  // Phase 3
  VIOLENT_GALE_WINDS: 136889, // Pushed off platforms / taking tick damage
  LIGHTNING_WHIP: 136850, // Initial whip strike
  LIGHTNING_WHIP_VOID: 136845, // Standing in the lines left behind
};

export const LEI_SHEN_ID = 1577; // Encounter ID for Lei Shen

// Types representing common WCL Event structures we care about
export interface WCLEvent {
  type: string;
  timestamp: number;
  sourceID?: number;
  targetID?: number;
  abilityGameID?: number;
  mitigated?: number;
  unmitigatedAmount?: number;
  amount?: number;
  hitType?: number; 
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
}

export interface PlayerMistake {
  playerId: number;
  playerName: string;
  mechanicName: string;
  spellId: number;
  timestamp: number;
  damageTaken?: number;
  description: string;
}

export interface MechanicEvent {
  id: string;
  mechanicName: string;
  spellId: number;
  timestamp: number;
  description: string;
}

export interface FightInfo {
  id: number;
  startTime: number;
  endTime: number;
  name: string;
  kill: boolean;
  fightPercentage: number;
}

export interface WipeAnalysis {
  fightId: number;
  startTime: number;
  endTime: number;
  duration: number;
  kill: boolean;
  wipePercentage: number;
  mistakes: PlayerMistake[];
  mechanicEvents: MechanicEvent[];
}
