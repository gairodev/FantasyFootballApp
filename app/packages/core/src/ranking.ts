import { Player, Pick, Strategy, RankingContext, Recommendation } from './types';

// Default weights for different strategies
const STRATEGY_WEIGHTS = {
  safe: { w1: 1.1, w2: 0.30, w3: 0.6, w4: 0.25, w5: 0.08, w6: 0.18, w7: 0.05 },
  balanced: { w1: 1.0, w2: 0.35, w3: 0.5, w4: 0.3, w5: 0.05, w6: 0.15, w7: 0.1 },
  upside: { w1: 1.0, w2: 0.35, w3: 0.4, w4: 0.35, w5: 0.03, w6: 0.10, w7: 0.25 }
};

// Replacement level baselines (simplified - would be more sophisticated in production)
const REPLACEMENT_BASELINES: Record<string, number> = {
  QB: 200,   // Points for QB12-15 range
  RB: 150,   // Points for RB24-30 range  
  WR: 140,   // Points for WR24-30 range
  TE: 100,   // Points for TE12-15 range
  K: 120,    // Points for K12-15 range
  DEF: 100   // Points for DEF12-15 range
};

// Position scarcity tiers (fewer quality players = higher scarcity)
const POSITION_SCARCITY: Record<string, number> = {
  RB: 0.8,   // RBs are most scarce
  TE: 0.6,   // Quality TEs are scarce
  WR: 0.4,   // WRs are moderately scarce
  QB: 0.3,   // QBs are plentiful
  K: 0.1,    // Kickers are very plentiful
  DEF: 0.2   // Defenses are plentiful
};

// Roster need priority (higher = more important to fill)
const ROSTER_NEED_PRIORITY: Record<string, number> = {
  QB: 0.8,   // Need at least 1 QB
  RB: 1.0,   // Need multiple RBs
  WR: 1.0,   // Need multiple WRs
  TE: 0.7,   // Need at least 1 TE
  K: 0.3,    // Kicker is low priority
  DEF: 0.4   // Defense is low priority
};

export function rankCandidates(context: RankingContext): Recommendation[] {
  const { remaining, picks, roster_positions, scoring, pick_no, strategy, team_on_clock } = context;
  const weights = STRATEGY_WEIGHTS[strategy];
  
  // Calculate current roster needs for the team on clock
  const teamNeeds = calculateTeamNeeds(picks, roster_positions, team_on_clock);
  
  // Calculate positional scarcity based on remaining players
  const scarcityMap = calculatePositionalScarcity(remaining);
  
  const scored = remaining.map(player => {
    // VORP calculation
    const vorp = calculateVORP(player, scoring);
    
    // ADP discount (higher ADP than current pick = better value)
    const adpDiscount = calculateADPDiscount(player, pick_no);
    
    // Roster need boost
    const needBoost = calculateNeedBoost(player, teamNeeds, roster_positions);
    
    // Positional scarcity boost
    const scarcityBoost = calculateScarcityBoost(player, scarcityMap);
    
    // Bye week penalty
    const byePenalty = calculateByePenalty(player, picks, team_on_clock);
    
    // Injury risk penalty
    const injuryPenalty = calculateInjuryPenalty(player);
    
    // Upside bonus (lower tier number = better)
    const upsideBonus = calculateUpsideBonus(player);
    
    // Calculate final score
    const score = vorp * weights.w1 + 
                  adpDiscount * weights.w2 + 
                  needBoost * weights.w3 + 
                  scarcityBoost * weights.w4 - 
                  byePenalty * weights.w5 - 
                  injuryPenalty * weights.w6 + 
                  upsideBonus * weights.w7;
    
    return {
      player_id: player.player_id,
      reason: generateReason(player, vorp, adpDiscount, needBoost, scarcityBoost),
      fit: determineFit(player, needBoost, upsideBonus, strategy),
      edge_vs_next: 0, // Will be calculated after sorting
      score,
      vorp,
      adp_discount: adpDiscount,
      need_boost: needBoost,
      scarcity_boost: scarcityBoost,
      bye_penalty: byePenalty,
      injury_penalty: injuryPenalty,
      upside_bonus: upsideBonus
    };
  });
  
  // Sort by score and calculate edge vs next
  const sorted = scored.sort((a, b) => b.score - a.score);
  
  // Calculate edge vs next for top recommendations
  sorted.forEach((rec, index) => {
    if (index === 0) {
      rec.edge_vs_next = 0;
    } else {
      rec.edge_vs_next = rec.score - sorted[index - 1].score;
    }
  });
  
  // Return top 12 recommendations
  return sorted.slice(0, 12);
}

function calculateVORP(player: Player, scoring: Record<string, number>): number {
  const baseline = player.projection_baseline || 0;
  const replacement = REPLACEMENT_BASELINES[player.pos] || 100;
  return Math.max(0, baseline - replacement);
}

function calculateADPDiscount(player: Player, pickNo: number): number {
  if (typeof player.adp !== 'number') return 0;
  return Math.max(0, player.adp - pickNo);
}

function calculateNeedBoost(player: Player, teamNeeds: Record<string, number>, rosterPositions: string[]): number {
  const position = player.pos;
  const need = teamNeeds[position] || 0;
  const priority = ROSTER_NEED_PRIORITY[position] || 0.5;
  return need * priority;
}

function calculateScarcityBoost(player: Player, scarcityMap: Record<string, number>): number {
  const scarcity = scarcityMap[player.pos] || 0.5;
  return scarcity * 50; // Scale factor
}

function calculateByePenalty(player: Player, picks: Pick[], teamOnClock: number): number {
  if (!player.bye_week) return 0;
  
  // Check if team already has players with same bye week
  const teamPicks = picks.filter(p => p.roster_id === teamOnClock);
  const sameByeCount = teamPicks.length; // Simplified - would check actual bye weeks
  
  if (sameByeCount >= 3) return 20; // Heavy penalty for too many same bye week
  if (sameByeCount >= 2) return 10; // Moderate penalty
  return 0;
}

function calculateInjuryPenalty(player: Player): number {
  switch (player.injury_status) {
    case 'out': return 50;
    case 'doubtful': return 30;
    case 'questionable': return 15;
    default: return 0;
  }
}

function calculateUpsideBonus(player: Player): number {
  if (!player.tier) return 0;
  return (1 / player.tier) * 20; // Lower tier number = higher bonus
}

function calculateTeamNeeds(picks: Pick[], rosterPositions: string[], teamId: number): Record<string, number> {
  const teamPicks = picks.filter(p => p.roster_id === teamId);
  const needs: Record<string, number> = {};
  
  // Count current players by position
  const currentCounts: Record<string, number> = {};
  teamPicks.forEach(pick => {
    // This is simplified - would need to look up actual player positions
    // For now, assume some distribution
    const pos = 'RB'; // Placeholder
    currentCounts[pos] = (currentCounts[pos] || 0) + 1;
  });
  
  // Calculate needs based on roster positions
  rosterPositions.forEach(pos => {
    if (pos !== 'BN' && pos !== 'IR') {
      const current = currentCounts[pos] || 0;
      const required = rosterPositions.filter(p => p === pos).length;
      needs[pos] = Math.max(0, required - current);
    }
  });
  
  return needs;
}

function calculatePositionalScarcity(remaining: Player[]): Record<string, number> {
  const positionCounts: Record<string, number> = {};
  const positionTiers: Record<string, number[]> = {};
  
  // Count players and their tiers by position
  remaining.forEach(player => {
    if (!positionCounts[player.pos]) {
      positionCounts[player.pos] = 0;
      positionTiers[player.pos] = [];
    }
    positionCounts[player.pos]++;
    if (player.tier) {
      positionTiers[player.pos]!.push(player.tier);
    }
  });
  
  // Calculate scarcity based on count and quality
  const scarcity: Record<string, number> = {};
  Object.keys(positionCounts).forEach(pos => {
    const count = positionCounts[pos];
    const tiers = positionTiers[pos] || [];
    const avgTier = tiers.length > 0 ? tiers.reduce((a, b) => a + b, 0) / tiers.length : 10;
    
    // Lower count and lower average tier = higher scarcity
    scarcity[pos] = Math.max(0.1, Math.min(1.0, 
      (1 / count) * 100 + (1 / avgTier) * 10
    ));
  });
  
  return scarcity;
}

function generateReason(player: Player, vorp: number, adpDiscount: number, needBoost: number, scarcityBoost: number): string {
  const reasons: string[] = [];
  
  if (vorp > 50) reasons.push('High VORP');
  if (adpDiscount > 20) reasons.push('ADP value');
  if (needBoost > 0.5) reasons.push('Roster need');
  if (scarcityBoost > 25) reasons.push('Position scarce');
  
  if (reasons.length === 0) {
    reasons.push('Solid pick');
  }
  
  return reasons.slice(0, 2).join(', ');
}

function determineFit(player: Player, needBoost: number, upsideBonus: number, strategy: Strategy): "value" | "need" | "stack" | "upside" | "safe" {
  if (needBoost > 0.8) return 'need';
  if (upsideBonus > 15) return 'upside';
  if (strategy === 'safe') return 'safe';
  return 'value';
}
