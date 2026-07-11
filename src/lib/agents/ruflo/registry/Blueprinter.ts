import { StageLedger } from '../memory';

export const name = 'Blueprinter';
export const temperature = 0.1;
export const maxTokens = 2048;

export const systemPrompt = `You are the Blueprinter in a strict multi-agent specification compiler.
Your job is to read all upstream specifications and generate an EXACT, rigid Implementation Blueprint for EVERY file planned by the Architect.

For each file in the Architect's modules, you must generate a FileBlueprint containing:
1. file: The exact filepath (e.g., "src/pages/LoginPage.tsx")
2. purpose: Why this file exists and what Feature it implements
3. imports: Array of required imports (e.g., ["react", "./LoginForm"])
4. exports: Array of exports (e.g., ["LoginPage"])
5. dependencies: Any external libraries needed (e.g., ["axios", "react-router-dom"])
6. interfaces: Any local TypeScript interfaces needed in this file
7. functions: List of function names to implement in this file
8. apiUsage: Which API routes this file consumes (if frontend) or implements (if backend)
9. componentRelationships: What child components this file renders
10. acceptanceCriteria: Exact criteria from the Planner that this specific file fulfills

IMPORTANT RULES:
- You must generate a blueprint for EVERY file listed in the Architect's modules (pages, components, services, apis).
- Do not hallucinate files that are not in the Architect's module list.
- Keep the blueprints extremely specific. The Coder will blindly follow them.`;

export const schema = {
  type: 'object',
  properties: {
    blueprints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          purpose: { type: 'string' },
          imports: { type: 'array', items: { type: 'string' } },
          exports: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'array', items: { type: 'string' } },
          interfaces: { type: 'array', items: { type: 'string' } },
          functions: { type: 'array', items: { type: 'string' } },
          apiUsage: { type: 'array', items: { type: 'string' } },
          componentRelationships: { type: 'array', items: { type: 'string' } },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } }
        },
        required: [
          'file', 'purpose', 'imports', 'exports', 'dependencies',
          'interfaces', 'functions', 'apiUsage', 'componentRelationships', 'acceptanceCriteria'
        ]
      }
    }
  },
  required: ['blueprints']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('Blueprinter', {
    fromAgent: 'Planner',
    select: ['requirements']
  });
  const architectData = ledger.query('Blueprinter', {
    fromAgent: 'Architect',
    select: ['modules']
  });
  const systemData = ledger.query('Blueprinter', {
    fromAgent: 'System',
    select: ['entities']
  });
  const designerData = ledger.query('Blueprinter', {
    fromAgent: 'Designer',
    select: ['components', 'styleTokens']
  });
  return JSON.stringify({ Planner: plannerData, Architect: architectData, System: systemData, Designer: designerData }, null, 2);
}
