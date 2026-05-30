import { enterAgent } from '../agentSession';

// Activates the AI-double chat mode; subsequent input is routed to the agent
// (see shell.ts) until the visitor types `exit`.
export const agent = async (args: string[]): Promise<string> => enterAgent();
