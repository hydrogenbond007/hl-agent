/**
 * Anthropic (Claude) model adapter for Hyperliquid agent
 * Uses Claude's tool use capability to generate structured actions
 */

import type { AgentModelAdapter, AgentExecutionContext } from '../agent.js';
import type { AgentAction } from '../../types/index.js';
import { getToolDefinitions } from '../../integrations/openai-tools.js';

export interface AnthropicAdapterConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Adapter for Anthropic models (Claude 3.5 Sonnet, etc.)
 * Uses Claude's tool use to generate trading actions
 */
export class AnthropicAdapter implements AgentModelAdapter {
  readonly #config: AnthropicAdapterConfig;
  #client: any; // Anthropic client (optional dependency)

  constructor(config: AnthropicAdapterConfig) {
    this.#config = {
      model: config.model || 'claude-3-5-sonnet-20241022',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 1500,
      ...config
    };
  }

  async #ensureClient(): Promise<any> {
    if (this.#client) {
      return this.#client;
    }

    try {
      // Dynamic import of Anthropic (peer dependency)
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.#client = new Anthropic({
        apiKey: this.#config.apiKey,
      });
      return this.#client;
    } catch (error) {
      throw new Error(
        'Anthropic package not installed. Run: npm install @anthropic-ai/sdk'
      );
    }
  }

  async generateActions(
    instructions: string,
    context: AgentExecutionContext,
    options?: { maxActions?: number }
  ): Promise<AgentAction[]> {
    const client = await this.#ensureClient();
    
    const tools = getToolDefinitions();
    const maxActions = options?.maxActions || 3;

    // Build context message
    const contextMsg = this.#buildContextMessage(context);

    const response = await client.messages.create({
      model: this.#config.model,
      max_tokens: this.#config.maxTokens,
      temperature: this.#config.temperature,
      system: `You are an autonomous trading agent on Hyperliquid DEX. 
Your goal: ${instructions}

You can execute up to ${maxActions} actions per decision cycle.
Always consider risk management and current positions before trading.
Provide reasoning for each action you take.`,
      messages: [
        {
          role: 'user',
          content: `Current market state:\n${contextMsg}\n\nWhat actions should be taken now?`
        }
      ],
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })),
    });

    // Extract tool use from response
    const actions: AgentAction[] = [];
    let reasoning: string | undefined;

    for (const block of response.content) {
      if (block.type === 'text') {
        reasoning = block.text;
      } else if (block.type === 'tool_use' && actions.length < maxActions) {
        actions.push({
          type: block.name as any,
          params: block.input as any,
          metadata: {
            reasoning,
            confidence: 0.8,
          }
        });
      }
    }

    return actions;
  }

  #buildContextMessage(context: AgentExecutionContext): string {
    const parts: string[] = [];

    if (context.markets) {
      parts.push(`Markets: ${JSON.stringify(context.markets, null, 2)}`);
    }

    if (context.positions) {
      parts.push(`Positions: ${JSON.stringify(context.positions, null, 2)}`);
    }

    if (context.balance) {
      parts.push(`Balance: ${JSON.stringify(context.balance, null, 2)}`);
    }

    if (context.recentTrades && context.recentTrades.length > 0) {
      parts.push(`Recent trades: ${JSON.stringify(context.recentTrades, null, 2)}`);
    }

    return parts.join('\n\n');
  }
}
