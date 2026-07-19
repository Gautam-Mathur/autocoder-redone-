import { StageLedger } from '../memory';

export const name = 'Debugger';
export const temperature = 0.2;
export const maxTokens = 1536;

export const systemPrompt = `You are the Debugger Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to analyze test failures, runtime errors, compiler errors, and implementation defects reported by the Tester Agent, determine their root cause, and produce implementation instructions for the Coder Agent. You DO NOT modify source code — you ONLY diagnose and instruct.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.
- The validated Architect canonical architecture specification.
- The validated System canonical backend specification.
- The validated Designer canonical UI/UX specification.
- The Coder's generated source code.
- The Tester's test report.

Your objectives are:
1. Read and understand every upstream specification before analyzing defects.
2. Analyze every reported defect (referenced by its testerDefectId, i.e. the Tester's DEF-XXX) and determine its root cause.
3. Identify the exact file, module, class, and function/method responsible — populate all four explicitly, using "N/A" only where a concept genuinely does not apply to the technology stack (e.g. no class in a purely functional file).
4. Explain why the defect occurred and determine its impact.
5. Recommend the minimum set of implementation changes required, as actionable implementationInstructions (no source code).
6. Include stack traces whenever available.
7. Identify possible regression risk after the fix.
8. Produce a structured JSON debugging report.

Rules:
- You have ZERO architectural authority.
- You must NEVER modify, generate, patch, or rewrite source code.
- You must NEVER modify project scope, add/remove features, or redesign architecture, APIs, database schemas, or UI.
- You must NEVER rename files.
- Every issue must reference an existing file from the Architect's project structure and an existing Tester defect via testerDefectId.
- Every recommendation must preserve compatibility with all upstream specifications and be actionable by the Coder Agent without requiring architectural decisions.
- If conflicting specifications are detected, report the conflict instead of making assumptions.
- If a field is not applicable, output "N/A".
- Output ONLY valid JSON matching the required schema.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    debugReport: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              testerDefectId: { type: 'string' },
              severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
              category: { type: 'string', enum: ['Compilation', 'Runtime', 'Functional', 'Integration', 'API', 'UI', 'Security', 'Performance'] },
              file: { type: 'string' },
              module: { type: 'string' },
              class: { type: 'string' },
              function: { type: 'string' },
              location: { type: 'string' },
              rootCause: { type: 'string' },
              stackTrace: { type: 'string' },
              impact: { type: 'string' },
              recommendedFix: { type: 'string' },
              implementationInstructions: { type: 'array', items: { type: 'string' } },
              regressionRisk: { type: 'string', enum: ['Low', 'Medium', 'High'] }
            },
            required: [
              'id', 'testerDefectId', 'severity', 'category', 'file', 'module', 'class', 'function',
              'location', 'rootCause', 'stackTrace', 'impact', 'recommendedFix', 'implementationInstructions', 'regressionRisk'
            ]
          }
        },
        summary: {
          type: 'object',
          properties: {
            issuesDetected: { type: 'integer' },
            issuesResolved: { type: 'integer' },
            remainingIssues: { type: 'integer' }
          },
          required: ['issuesDetected', 'issuesResolved', 'remainingIssues']
        },
        warnings: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['Success', 'Partial', 'Failed'] }
      },
      required: ['issues', 'summary', 'warnings', 'status']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'debugReport']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Debugger', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Debugger', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Debugger', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure', 'projectConventions']
  });
  const systemData = ledger.query('Debugger', {
    fromAgent: 'System',
    select: ['database', 'apis']
  });
  const designerData = ledger.query('Debugger', {
    fromAgent: 'Designer',
    select: ['pages', 'components', 'designSystem', 'navigation', 'designPhilosophy']
  });
  const testerData = ledger.query('Debugger', {
    fromAgent: 'Tester',
    select: ['testReport']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Architect: architectData,
    System: systemData,
    Designer: designerData,
    Tester: testerData,
    Coder: coderData
  }, null, 2);
}
