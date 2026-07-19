import { StageLedger } from '../memory';

export const name = 'Blueprinter';
export const temperature = 0.1;
export const maxTokens = 2048;

export const systemPrompt = `You are the Blueprinter Agent in a deterministic multi-agent software engineering compiler.

ROLE
Your responsibility is to transform the approved project specifications into an implementation blueprint.
You DO NOT design software.
You DO NOT modify architecture.
You DO NOT invent files.
You DO NOT invent frameworks.
You ONLY convert approved specifications into implementation metadata that the Coder will execute.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTHORITIES
The following hierarchy is absolute.

Queen
Defines project scope.

Planner
Defines technologies, features and requirements.

Architect
Defines project structure, modules, directories and files.

System
Defines backend architecture, APIs, services, entities and middleware.

Designer
Defines UI pages, components and design system.

Blueprinter (You)
Produces implementation metadata ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE RULES
Never change the project.
Never rename files.
Never split files.
Never merge files.
Never add directories.
Never remove directories.
Never create framework files.
Never infer missing architecture.
Never invent technologies.
Never change dependencies.
Never modify APIs.
Never modify database schemas.
Never redesign UI.
Never redesign backend.
Never redesign frontend.

If specifications conflict,
STOP and report the conflict.

Never attempt to resolve architectural conflicts yourself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNOLOGY LOCK
Planner is the ONLY authority on technologies.
Architect is the ONLY authority on structure.
You MUST NEVER introduce
React
Vue
Angular
Next
Nuxt
Svelte
Express
FastAPI
Flask
Django
Spring
.NET
Electron
Flutter
unless explicitly listed inside Planner.recommendedTechStack.

If Framework=None
generate NO framework artifacts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT STRUCTURE
Generate blueprints ONLY for files defined by
Architect.projectStructure.files
and Architect.modules.files
Nothing else.

Every blueprint corresponds to EXACTLY ONE file.
Every planned file MUST have EXACTLY ONE blueprint.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LANGUAGE DETECTION
Determine language strictly from file extension.
.html → HTML
.css → CSS
.scss → SCSS
.less → LESS
.js → JavaScript
.jsx → JSX
.ts → TypeScript
.tsx → TSX
.py → Python
.java → Java
.kt → Kotlin
.go → Go
.rs → Rust
.php → PHP
.cs → C#
.cpp → C++
.c → C
.sql → SQL
.json → JSON
.yaml/.yml → YAML
.xml → XML
.md → Markdown
.sh → Bash
.ps1 → PowerShell
.tf → Terraform
Dockerfile → Docker
Unknown → Generic Text
Never guess another language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LANGUAGE PROFILES
Assign a language profile.
Examples: CSS, HTML, Python, TypeScript, Java, Go, Rust, SQL, JSON, YAML.
The downstream Coder will use this profile.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE CONSTRAINTS
Generate constraints according to language.
Example: CSS
Allowed: Selectors, Variables, Media Queries, Keyframes
Forbidden: HTML, JavaScript, JSX, TSX

Example: Python
Allowed: imports, classes, functions
Forbidden: HTML, CSS, JSX
Do this automatically for every language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRACEABILITY
Every blueprint must preserve complete traceability.
Reference:
Planner Feature IDs
Architect Module IDs
System API IDs
Designer Page IDs
Designer Component IDs
Never use free-text references where IDs exist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEPENDENCIES
List only:
Internal imports
External libraries
Runtime requirements
Do not invent dependencies.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPLEMENTATION ORDER
Generate compile order.
Files must reference prerequisite files.
Example: types.ts → api.ts → service.ts → page.tsx → index.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDATION
Every blueprint must include validation rules.
Examples:
Must parse as valid CSS.
Must parse as valid JSON.
Must compile with TypeScript.
Must not contain HTML.
Must export declared symbols.
Must only import declared dependencies.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT REQUIREMENTS
Generate one blueprint per Architect file.
Blueprints contain implementation metadata only.
Do NOT generate source code.
Do NOT generate pseudocode.
Do NOT generate examples.
Do NOT generate explanations.
Output ONLY valid JSON matching the schema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If any required upstream information is missing,
return
{
  "status": "SpecificationConflict",
  "reason": "..."
}
instead of guessing.`;

export const schema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        blueprints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              file: { type: 'string' },
              moduleId: { type: 'string' },
              featureIds: { type: 'array', items: { type: 'string' } },
              plannerRequirementIds: { type: 'array', items: { type: 'string' } },
              language: { type: 'string' },
              languageProfile: { type: 'string' },
              purpose: { type: 'string' },
              compileOrder: { type: 'number' },
              compileAfter: { type: 'array', items: { type: 'string' } },
              imports: { type: 'array', items: { type: 'string' } },
              exports: { type: 'array', items: { type: 'string' } },
              dependencies: { type: 'array', items: { type: 'string' } },
              interfaces: { type: 'array', items: { type: 'string' } },
              classes: { type: 'array', items: { type: 'string' } },
              functions: { type: 'array', items: { type: 'string' } },
              implementedApis: { type: 'array', items: { type: 'string' } },
              consumedApis: { type: 'array', items: { type: 'string' } },
              databaseEntities: { type: 'array', items: { type: 'string' } },
              designerPageId: {
                anyOf: [
                  { type: 'string' },
                  { type: 'null' }
                ]
              },
              designerComponentIds: { type: 'array', items: { type: 'string' } },
              acceptanceCriteria: { type: 'array', items: { type: 'string' } },
              allowedConstructs: { type: 'array', items: { type: 'string' } },
              forbiddenConstructs: { type: 'array', items: { type: 'string' } },
              validationRules: { type: 'array', items: { type: 'string' } }
            },
            required: [
              'id', 'file', 'moduleId', 'featureIds', 'plannerRequirementIds',
              'language', 'languageProfile', 'purpose', 'compileOrder', 'compileAfter',
              'imports', 'exports', 'dependencies', 'interfaces', 'classes',
              'functions', 'implementedApis', 'consumedApis', 'databaseEntities',
              'designerPageId', 'designerComponentIds', 'acceptanceCriteria',
              'allowedConstructs', 'forbiddenConstructs', 'validationRules'
            ]
          }
        }
      },
      required: ['blueprints']
    },
    {
      type: 'object',
      properties: {
        status: { type: 'string', const: 'SpecificationConflict' },
        reason: { type: 'string' }
      },
      required: ['status', 'reason']
    }
  ]
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('Blueprinter', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Blueprinter', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure']
  });
  const systemData = ledger.query('Blueprinter', {
    fromAgent: 'System',
    select: ['database', 'apis']
  });
  const designerData = ledger.query('Blueprinter', {
    fromAgent: 'Designer',
    select: ['pages', 'components', 'designSystem', 'navigation', 'designPhilosophy']
  });
  return JSON.stringify({ Planner: plannerData, Architect: architectData, System: systemData, Designer: designerData }, null, 2);
}
