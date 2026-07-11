import { StageLedger } from './memory';
import { AGENT_DEFS } from './agents';

export interface TokenBudgetResult {
  budget: number;
  timeoutMs: number;
}

export function calculateTokenBudget(
  agentName: string,
  ledger: StageLedger
): TokenBudgetResult {
  let budget = 8192; // Default base fallback

  // 1. Task-based Scaling Math
  if (agentName === 'Planner') {
    const taskSpec = ledger.read('taskSpec');
    const featuresCount = taskSpec?.mvpScope?.included?.length || 0;
    budget = 8192 + (featuresCount * 300);
  } 
  else if (agentName === 'Architect') {
    const planner = ledger.read('planner');
    const featuresCount = planner?.features?.length || 0;
    budget = 8192 + (featuresCount * 300);
  }
  else if (agentName === 'System' || agentName === 'Designer') {
    const planner = ledger.read('planner');
    const featuresCount = planner?.features?.length || 0;
    const architect = ledger.read('architect');
    const fileCount = architect?.projectStructure?.files?.length || 0;
    budget = 8192 + (featuresCount * 300) + (fileCount * 300);
  } 
  else if (agentName === 'Coder') {
    const architect = ledger.read('architect');
    const fileCount = architect?.projectStructure?.files?.length || 0;
    budget = 16384 + (fileCount * 500);
  } 
  else if (agentName === 'Debugger' || agentName === 'Tester') {
    const coderState = ledger.read('coder') || {};
    let totalChars = 0;
    Object.values(coderState).forEach((code: any) => {
      if (typeof code === 'string') {
        totalChars += code.length;
      }
    });
    const totalTokens = Math.round(totalChars / 4);
    budget = Math.max(8192, Math.round(totalTokens * 0.5));
  } 
  else {
    // For other agents (Queen, Reviewer, Security), fall back to metadata configurations
    const def = AGENT_DEFS[agentName];
    if (def && typeof def.maxTokens === 'number') {
      budget = Math.max(8192, def.maxTokens);
    }
  }

  // 2. Timeout Scaling Math: scale timeout linearly to calculated token budget (180s to 1800s)
  // Maps budget between 8192 and 16384 onto 180s to 1800s
  const timeoutSeconds = Math.max(180, Math.min(1800, Math.round((budget / 16384) * 1620 + 180)));
  const timeoutMs = timeoutSeconds * 1000;

  return {
    budget,
    timeoutMs
  };
}
