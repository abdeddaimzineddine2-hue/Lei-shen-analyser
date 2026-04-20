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

// A broad capture of MoP Consumable Buff IDs
export const CONSUMABLES = {
  FLASKS: [
    105689, 105691, 105693, 105694, 105696, 105681, // Standard Flasks
    128960, 127230, 114786, // Crystal of Insanity & Alternatives
  ],
  FOOD: [
    // Pandaren Banquets & High-end foods (250/275/300)
    104273, 104274, 104275, 104276, 104277, 104278, 104279, 104280, 104281, 104282, 104283,
    // Noodle Carts (added 5.4)
    145308, 145307, 145309, 145310, 145311,
    // Standard stat ranges as fallback
    ...Array.from({length: 50}, (_, i) => 104250 + i)
  ],
  POTIONS: [
    105697, // Virmen's Bite (Agi)
    105702, // Jade Serpent (Int)
    105706, // Mogu Power (Str)
    105701, // Mountains (Armor)
    105708, // Focus (Mana Channel)
    105707, // Master Mana
  ],
  HEALTHSTONES: [
    6262,   // Master Healthstone
    105698, // Master Healing Potion
  ]
};

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
  auras?: Array<{ ability: number; name?: string; }>;
}

export interface PlayerConsumables {
  id: number;
  name: string;
  hasFood: boolean;
  hasFlask: boolean;
  hasPrePot: boolean;
  combatPots: number;
  healthstones: number;
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
  consumables: PlayerConsumables[];
}
