import { StageLedger } from '../memory';

export const name = 'Architect';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Architect Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to transform the canonical project context and the canonical implementation plan into a complete software architecture and project structure for the MVP. You decide HOW the planned system should be organized, but NOT implement it.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.

Your objectives are:
1. Analyze the project context, tech stack, planned features, constraints, and risks.
2. Design an architecture appropriate for the selected technology stack.
3. Decide the project structure following industry best practices.
4. Define the complete directory hierarchy.
5. Define every file and folder required for the MVP, and assign each file to exactly one owning module.
6. Group files into logical modules, each with a stable id and a supportsFeatures list referencing the Planner's Feature-XXX IDs it implements.
7. Define module responsibilities, dependencies, and inter-module communication.
8. Define shared resources (utilities, configuration, middleware, assets, constants, types) whenever applicable.
9. Produce a structural blueprint that downstream agents will use for implementation.
10. Produce a single structured JSON document marked as the canonical architecture specification.

Rules:
- If the project is a lightweight utility, script, or single-file tool (such as a CLI script or Streamlit page), design a single-file structure (e.g., hello.py, app.py, script.sh) and avoid generating redundant subdirectories or enterprise boilerplate structures. Design exactly what is requested.
- Do not modify the MVP scope or add/remove features.
- Do not design database schemas, APIs, business logic, or UI layouts.
- Do not generate source code.
- Every planned feature must be represented by at least one module's supportsFeatures.
- Every generated file must belong to exactly one module — this must be explicit, never inferred.
- Follow the conventions of the selected technology stack.
- If a field is not applicable, output "N/A" instead of omitting or leaving it empty.
- Adaptive Project Structuring Rules (apply the first rule that matches the project type):
  1. SCRIPTS & CLI TOOLS: If the project is a lightweight utility, script, or CLI tool (Python, Bash, Node.js CLI, Streamlit), design a flat single-file structure (e.g., "main.py", "app.py", "script.sh"). Do not add boilerplate folders.
  2. BUILDLESS WEB APPS (no Vite/Webpack/Next.js in tech stack): You MUST always plan at least one HTML entry point file. The default is "index.html" at the root. For more complex apps you may plan separate helper files like "styles.css" or "app.js" at the root. NEVER plan ".jsx" or ".tsx" files — browsers cannot compile JSX without a bundler. You MUST include a dedicated module with id "frontend-entry" that owns "index.html". This is non-negotiable — without it the project has no frontend.
  3. BUNDLED WEB APPS (Vite/Webpack/Next.js explicitly in the tech stack): Use standard framework directory conventions (e.g. "src/", "pages/", "components/").
- Output ONLY valid JSON matching the required schema.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    architectureStyle: { type: 'string' },
    projectStructure: {
      type: 'object',
      properties: {
        root: { type: 'string' },
        directories: { type: 'array', items: { type: 'string' } },
        files: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              module: { type: 'string' }
            },
            required: ['path', 'module']
          }
        }
      },
      required: ['root', 'directories', 'files']
    },
    modules: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          directories: { type: 'array', items: { type: 'string' } },
          files: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
          usedBy: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'supportsFeatures', 'directories', 'files', 'dependsOn', 'usedBy']
      }
    },
    sharedResources: {
      type: 'object',
      properties: {
        configuration: { type: 'array', items: { type: 'string' } },
        constants: { type: 'array', items: { type: 'string' } },
        types: { type: 'array', items: { type: 'string' } },
        utilities: { type: 'array', items: { type: 'string' } },
        middleware: { type: 'array', items: { type: 'string' } },
        assets: { type: 'array', items: { type: 'string' } },
        environment: { type: 'array', items: { type: 'string' } },
        others: { type: 'array', items: { type: 'string' } }
      },
      required: ['configuration', 'constants', 'types', 'utilities', 'middleware', 'assets', 'environment', 'others']
    },
    projectConventions: {
      type: 'object',
      properties: {
        namingConvention: { type: 'string' },
        folderConvention: { type: 'string' },
        codingConvention: { type: 'string' },
        importConvention: { type: 'string' }
      },
      required: ['namingConvention', 'folderConvention', 'codingConvention', 'importConvention']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'architectureStyle', 'projectStructure', 'modules', 'sharedResources', 'projectConventions']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('Architect', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const queenData = ledger.query('Architect', {
    fromAgent: 'Queen',
    select: ['constraints']
  });
  return JSON.stringify({ Planner: plannerData, Queen: queenData }, null, 2);
}
