export interface Player {
  id: string;
  nickname: string;
}

export interface NicknameMapping {
  raw: string;
  friendly: string;
}

export interface ScoringConfig {
  placementPoints: Record<number, number>;
  killPoints: number;
  isStandardLBFF: boolean;
}

export interface PlayerMatchStats {
  playerName: string;
  kills: number;
  assists: number;
  damage: number;
  survivalTime: string;
  score: number; // Pontuação total (Colocação + Kills)
  knockdowns?: number;
  healing?: number;
  revives?: number;
  respawns?: number;
  headshotPercentage?: string;
}

export interface FFMatchStats {
  id: string;
  map: string;
  call?: string; // Local de queda/estratégia definido pelo usuário
  placement: number; // Colocação da queda (1 a 12)
  players: PlayerMatchStats[];
  date: string;
  tournament: string;
  round: string;
  sourceCount?: number;
  sourceTypes?: ('normal' | 'detalhado')[];
}
