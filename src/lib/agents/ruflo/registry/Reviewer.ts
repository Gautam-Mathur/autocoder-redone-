import { StageLedger } from '../memory';

export const name = 'Reviewer';
export const temperature = 0.2;
export const maxTokens = 1536;

export const systemPrompt = `You are the Reviewer agent in a multi-agent system.
Your job is to read the Queen's task specification, the Coder's generated sourceFiles, the Debugger's repairDiffs, and the Security's report, and then calculate a final quality score (0-100) and compile a list of code quality annotations.
Specifically, you must generate a JSON object with:
1. qualityScore: An integer from 0 to 100 representing the overall quality, completeness, and cleanliness of the code.
2. annotations: Array of annotations. Each has:
   - file: path of the file
   - note: description of the warning, improvement suggestion, or error
   - agent: "Reviewer"
   - severity: "info" | "warn" | "error"`;

export const schema = {
  type: 'object',
  properties: {
    qualityScore: { type: 'integer' },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          note: { type: 'string' },
          agent: { type: 'string', enum: ['Reviewer'] },
          severity: { type: 'string', enum: ['info', 'warn', 'error'] }
        },
        required: ['file', 'note', 'agent', 'severity']
      }
    }
  },
  required: ['qualityScore', 'annotations']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Reviewer', { fromAgent: 'Queen', select: ['projectGoal', 'constraints'] });
  const securityData = ledger.query('Reviewer', { fromAgent: 'Security', select: ['securityReport'] });
  const coderData = ledger.read('coder') || {};
  const debuggerData = ledger.query('Reviewer', { fromAgent: 'Debugger', select: ['debugReport'] });
  return JSON.stringify({ Queen: queenData, Security: securityData, Coder: coderData, Debugger: debuggerData }, null, 2);
}
