import Anthropic from '@anthropic-ai/sdk';
import { Recommendation, Strategy, RankingContext } from '@fantasy-football/core';

export interface LLMRecommendation {
  player_id: string;
  reason: string;
  fit: "value" | "need" | "stack" | "upside" | "safe";
  edge_vs_next: number;
}

export interface LLMResponse {
  ranked: LLMRecommendation[];
}

export class AnthropicClient {
  private anthropic: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.anthropic = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Get AI-powered pick recommendations using the deterministic ranking as context
   */
  async getRecommendations(
    context: RankingContext,
    deterministicTop: Recommendation[]
  ): Promise<LLMRecommendation[]> {
    try {
      const tool: Anthropic.Tool = {
        name: "pick_recommender",
        description: "Rank the top draft picks based on league context and player analysis",
        input_schema: {
          type: "object" as const,
          properties: {
            ranked: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  player_id: { type: "string" },
                  reason: { type: "string", maxLength: 140 },
                  fit: {
                    type: "string",
                    enum: ["value", "need", "stack", "upside", "safe"]
                  },
                  edge_vs_next: { type: "number" }
                },
                required: ["player_id", "reason", "fit", "edge_vs_next"]
              }
            }
          },
          required: ["ranked"]
        }
      };

      // Build candidates from Recommendation fields, looking up Player data
      // from context.remaining for position/team info.
      // Note: Recommendation has player_id, score, vorp, adp_discount,
      // need_boost, scarcity_boost, etc. -- but NOT a nested `player` object.
      const candidates = deterministicTop.map((rec) => {
        const player = context.remaining.find(p => p.player_id === rec.player_id);
        return {
          player_id: rec.player_id,
          pos: player?.pos,
          team: player?.team,
          tier: player?.tier,
          adp: player?.adp,
          vorp: rec.vorp,
          score: rec.score,
          adp_discount: rec.adp_discount,
          need_boost: rec.need_boost,
          scarcity_boost: rec.scarcity_boost
        };
      });

      const systemPrompt = `You are an NFL draft strategy expert. Given league settings, roster needs, and the candidate list with VORP/ADP/tier/risks, output a strict JSON object matching the tool schema.

Key considerations:
- Prefer VORP and positional scarcity
- Avoid overreacting to minor news
- Keep reasons concise (<=140 chars)
- Consider roster construction needs
- Factor in draft position value

Output only valid JSON matching the schema.`;

      const userPrompt = JSON.stringify({
        league: {
          name: context.league.name,
          scoring: context.scoring,
          roster_positions: context.roster_positions
        },
        team_on_clock: context.team_on_clock,
        pick_no: context.pick_no,
        strategy: context.strategy,
        candidates: candidates
      });

      const response = await this.anthropic.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ],
        tools: [tool],
        tool_choice: { type: "tool", name: "pick_recommender" },
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 1000
      });

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      if (!toolUseBlock) {
        throw new Error('No tool_use block in response');
      }

      const parsed = toolUseBlock.input as LLMResponse;

      // Validate the response structure
      if (!parsed.ranked || !Array.isArray(parsed.ranked)) {
        throw new Error('Invalid response structure from LLM');
      }

      // Ensure we have the expected number of recommendations
      const expectedCount = Math.min(deterministicTop.length, 8);
      if (parsed.ranked.length < expectedCount) {
        console.warn(`LLM returned fewer recommendations than expected: ${parsed.ranked.length} vs ${expectedCount}`);
      }

      return parsed.ranked.slice(0, expectedCount);

    } catch (error) {
      console.error('Error getting LLM recommendations:', error);

      // Fallback to deterministic recommendations with basic reasons
      return deterministicTop.slice(0, 8).map((rec, index) => ({
        player_id: rec.player_id,
        reason: rec.reason,
        fit: rec.fit,
        edge_vs_next: index === 0 ? 0 : rec.edge_vs_next
      }));
    }
  }

  /**
   * Test the LLM connection and response format
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10
      });

      return response.content.length > 0;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): string {
    return this.model;
  }
}
