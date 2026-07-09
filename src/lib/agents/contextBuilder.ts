import { queryAgentOutput } from './sml';
import manifest from './manifest.json';

export async function buildUserContext(
  conversationId: string,
  agentName: string
): Promise<string> {
  const agentDeps = (manifest.dependencies as any)[agentName];
  if (!agentDeps || !agentDeps.inputs) {
    return '{}';
  }

  const mergedContext: Record<string, any> = {};

  for (const inputPath of agentDeps.inputs) {
    const [upstreamAgent, field] = inputPath.split('.');
    if (!upstreamAgent || !field) continue;

    const data = await queryAgentOutput(conversationId, upstreamAgent, field);
    if (data !== null && data !== undefined) {
      if (!mergedContext[upstreamAgent]) {
        mergedContext[upstreamAgent] = {};
      }
      mergedContext[upstreamAgent][field] = data;
    }
  }

  return JSON.stringify(mergedContext, null, 2);
}
