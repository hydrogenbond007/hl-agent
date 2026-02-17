/**
 * Example: Using Hyperliquid toolkit with LangChain
 * 
 * This shows how to integrate the SDK with external agent frameworks
 */

import { 
  HyperliquidAgentToolkit,
  EnvWallet,
  getToolDefinitions,
  executeTool
} from '../src/index.js';

/**
 * This example demonstrates integration with LangChain
 * 
 * Note: Requires `npm install langchain @langchain/openai`
 */
async function main() {
  console.log('🔗 Hyperliquid + LangChain Integration Example\n');

  // 1. Setup wallet and toolkit
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('HYPERLIQUID_PRIVATE_KEY not set');
  }
  
  const wallet = new EnvWallet(privateKey);
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet',
    riskConfig: {
      maxLeverage: 5,
      maxPositionSizeUsd: 500,
      maxDailyLoss: 100,
    },
  });

  console.log(`Wallet: ${wallet.address}\n`);

  // 2. Get tool definitions compatible with OpenAI function calling
  const tools = getToolDefinitions();
  
  console.log('📚 Available Tools:');
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }
  console.log();

  // 3. Example: Direct tool execution
  console.log('📊 Example 1: Direct Tool Execution\n');
  
  const marketsResult = await executeTool('get_markets', { coins: ['BTC', 'ETH'] }, toolkit);
  console.log('Market Data:', JSON.stringify(marketsResult, null, 2));
  console.log();

  const balanceResult = await executeTool('get_balance', {}, toolkit);
  console.log('Balance:', JSON.stringify(balanceResult, null, 2));
  console.log();

  // 4. Example: Using with LangChain (conceptual)
  console.log('🦜 Example 2: LangChain Integration (Conceptual)\n');
  
  console.log(`
// In your LangChain code:
import { ChatOpenAI } from '@langchain/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
});

// Convert Hyperliquid tools to LangChain format
const langchainTools = tools.map(tool => ({
  name: tool.name,
  description: tool.description,
  func: async (params: string) => {
    const parsed = JSON.parse(params);
    return await executeTool(tool.name, parsed, toolkit);
  }
}));

// Create agent executor
const executor = await initializeAgentExecutorWithOptions(
  langchainTools,
  llm,
  {
    agentType: 'openai-functions',
    verbose: true
  }
);

// Use the agent
const result = await executor.call({
  input: "What's the current BTC price and should I buy?"
});
  `);

  // 5. Example: Manual agent loop
  console.log('🔄 Example 3: Manual Agent Loop\n');
  
  async function agentTick() {
    // Gather context
    const markets = await executeTool('get_markets', { coins: ['BTC'] }, toolkit);
    const positions = await executeTool('get_positions', {}, toolkit);
    const balance = await executeTool('get_balance', {}, toolkit);

    console.log('Context:', {
      markets: markets.success ? markets.data : null,
      positions: positions.success ? positions.data : null,
      balance: balance.success ? balance.data : null,
    });

    // Your decision logic here
    // For example, call LLM with context and execute returned actions
    
    console.log('\n(In production, you would call your LLM here with the context)');
    console.log('(The LLM would return actions like "open_position" or "close_position")');
    console.log('(Then you would execute those actions using executeTool)\n');
  }

  await agentTick();

  // 6. Example: OpenAI function calling format
  console.log('🤖 Example 4: OpenAI Function Calling Format\n');
  
  console.log('Tool definitions in OpenAI format:');
  console.log(JSON.stringify({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a trading assistant for Hyperliquid DEX.'
      },
      {
        role: 'user',
        content: 'What is the current BTC price?'
      }
    ],
    tools: tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))
  }, null, 2));

  console.log('\n✅ Integration examples completed!');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
