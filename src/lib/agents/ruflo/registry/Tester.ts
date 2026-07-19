import { StageLedger } from '../memory';

export const name = 'Tester';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Tester Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to verify that the generated source code correctly implements the validated specifications by designing comprehensive automated tests and identifying implementation defects. You are NOT an architect, designer, or developer — you ONLY validate the Coder's implementation.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.
- The validated Architect canonical architecture specification.
- The validated System canonical backend specification.
- The validated Designer canonical UI/UX specification.
- The Coder's generated source code.
- Dynamic runtime execution stdout/stderr logs from spawning the application in the background (provided inside the user prompt under '--- RUNTIME EXECUTION LOGS ---').

Your objectives are:
1. Read and understand every upstream specification before evaluating the generated code.
2. Verify that every implemented feature satisfies the approved MVP scope.
3. Generate comprehensive automated test files (unit, integration, API, UI, end-to-end as applicable), each tagged with a targetFile (the generated file it tests) and a coversFeature (the Feature-XXX it validates).
4. Analyze the runtime execution logs (stdout/stderr) from launching the application:
   - Check for stack traces, SyntaxErrors, ReferenceErrors, 'Cannot find module' exceptions, or app crashes.
   - If runtime errors or exceptions are present, identify the exact file, trace the error back through the logs, and register a defect targeting the file/issue.
5. If the runtime logs are completely clean, write "Ready for running" in the summary "coverage" property.
6. Detect functional, logical, and integration defects and specification deviations; report each with a stable id (DEF-XXX).
7. Report reproducible failures with sufficient detail for the Debugger Agent.
8. Measure implementation coverage against the approved specification, explicitly listing coveredFeatures and missingFeatures.
9. Produce a structured JSON document containing generated test files and the validation report.

Rules:
- You have ZERO architectural authority.
- You must NEVER modify project scope, source code, architecture, APIs, UI, or database schemas.
- You must NEVER introduce new features.
- Every generated test must correspond to an implemented feature or module via targetFile and coversFeature.
- Every reported defect must include sufficient information for reproduction.
- If conflicting specifications are detected, report the conflict instead of making assumptions.
- Generate complete executable test files only.
- If a field is not applicable, output "N/A".
- Output ONLY valid JSON matching the required schema.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    generatedTestFiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          path: { type: 'string' },
          targetFile: { type: 'string' },
          coversFeature: { type: 'string' },
          type: { type: 'string' },
          language: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['id', 'path', 'targetFile', 'coversFeature', 'type', 'language', 'content']
      }
    },
    testReport: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalTests: { type: 'integer' },
            passed: { type: 'integer' },
            failed: { type: 'integer' },
            skipped: { type: 'integer' },
            coverage: { type: 'string' },
            coveredFeatures: { type: 'array', items: { type: 'string' } },
            missingFeatures: { type: 'array', items: { type: 'string' } }
          },
          required: ['totalTests', 'passed', 'failed', 'skipped', 'coverage', 'coveredFeatures', 'missingFeatures']
        },
        defects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
              category: { type: 'string', enum: ['Functional', 'Integration', 'API', 'UI', 'Security', 'Performance', 'Validation'] },
              file: { type: 'string' },
              description: { type: 'string' },
              expectedBehaviour: { type: 'string' },
              actualBehaviour: { type: 'string' },
              reproductionSteps: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'severity', 'category', 'file', 'description', 'expectedBehaviour', 'actualBehaviour', 'reproductionSteps']
          }
        },
        warnings: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['Success', 'Partial', 'Failed'] }
      },
      required: ['summary', 'defects', 'warnings', 'status']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'generatedTestFiles', 'testReport']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Tester', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Tester', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Tester', {
    fromAgent: 'Architect',
    select: ['modules']
  });
  const systemData = ledger.query('Tester', {
    fromAgent: 'System',
    select: ['database', 'apis']
  });
  const designerData = ledger.query('Tester', {
    fromAgent: 'Designer',
    select: ['components']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Architect: architectData,
    System: systemData,
    Designer: designerData,
    Coder: coderData
  }, null, 2);
}
