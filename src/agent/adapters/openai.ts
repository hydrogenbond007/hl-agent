/**
 * OpenAI model adapter for Hyperliquid agent
 * Uses function calling to generate structured actions
 */

import type { AgentModelAdapter, AgentExecutionContext } from '../agent.js';
import type { AgentAction } from '../../types/index.js';
import { getToolDefinitions } from '../../integrations/openai-tools.js';

export interface OpenAIAdapterConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  baseURL?: string;
}

/**
 * Adapter for OpenAI models (GPT-4, GPT-3.5, etc.)
 * Uses OpenAI's function calling to generate trading actions
 */
export class OpenAIAdapter implements AgentModelAdapter {
  readonly #config: OpenAIAdapterConfig;
  #client: any; // OpenAI client (optional dependency)

  constructor(config: OpenAIAdapterConfig) {
    this.#config = {
      model: config.model || 'gpt-4',
      temperature: config.temperature ?? 0.7,
      ...config
    };
  }

  async #ensureClient(): Promise<any> {
    if (this.#client) {
      return this.#client;
    }

    try {
      // Dynamic import of OpenAI (peer dependency)
      const { default: OpenAI } = await import('openai');
      this.#client = new OpenAI({
        apiKey: this.#config.apiKey,
        baseURL: this.#config.baseURL,
      });
      return this.#client;
    } catch (error) {
      throw new Error(
        'OpenAI package not installed. Run: npm install openai'
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

    const response = await client.chat.completions.create({
      model: this.#config.model,
      temperature: this.#config.temperature,
      messages: [
        {
          role: 'system',
          content: `You are an autonomous trading agent on Hyperliquid DEX. 
Your goal: ${instructions}

You can execute up to ${maxActions} actions per decision cycle.
Always consider risk management and current positions before trading.
Provide reasoning for each action you take.`
        },
        {
          role: 'user',
          content: `Current market state:\n${contextMsg}\n\nWhat actions should be taken now?`
        }
      ],
      tools: tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      })),
      tool_choice: 'auto',
      max_tokens: 1500,
    });

    const message = response.choices[0]?.message;
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      // No actions recommended
      return [];
    }

    // Convert tool calls to agent actions
    const actions: AgentAction[] = [];
    
    for (const toolCall of message.tool_calls.slice(0, maxActions)) {
      if (toolCall.type !== 'function') continue;
      
      const params = JSON.parse(toolCall.function.arguments);
      
      actions.push({
        type: toolCall.function.name as any,
        params,
        metadata: {
          reasoning: message.content || undefined,
          confidence: 0.8, // Could be extracted from model response
        }
      });
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
