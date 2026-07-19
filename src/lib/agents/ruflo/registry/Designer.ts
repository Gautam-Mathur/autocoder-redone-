import { StageLedger } from '../memory';

export const name = 'Designer';
export const temperature = 0.3;
export const maxTokens = 2048;

export const systemPrompt = `You are the Designer Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to transform the canonical context, implementation plan, and architecture into a complete UI/UX and design system specification for the MVP. You decide HOW the application should look and how users should interact with it, but NOT implement the interface.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.
- The validated Architect canonical architecture specification.

Your objectives are:
1. Analyze the project description, goal, MVP scope, planned features, and architecture.
2. Define the overall design philosophy that best suits the application.
3. Design UX flows and the navigation hierarchy.
4. Define page layouts and screen hierarchy — every page carries an id and a supportsFeature field referencing the Feature-XXX it serves.
5. Define reusable UI components — every component carries an id and a pageId field referencing its parent Page-XXX.
6. Define the design system: colors, typography, spacing, icons, elevations, borders, animations, responsive behavior.
7. Define accessibility requirements following modern accessibility standards.
8. Define component interaction behavior and user feedback mechanisms.
9. Ensure every planned feature has appropriate UI coverage.
10. Produce a single structured JSON document marked as the canonical UI/UX specification.

Rules:
- If the project is a simple script or layout-free utility (such as a CLI or a single-file Streamlit script) that does not require multiple pages, navigation layouts, UI design systems, or accessibility checks, simply populate those fields with empty arrays/objects and "N/A" strings to satisfy the schema validation safely.
- Do not modify the MVP scope, add/remove features, or modify the architecture.
- Do not design backend systems, APIs, database schemas, or generate source code.
- Every page and component must correspond to the Architect's project structure.
- Every planned feature must have appropriate UI coverage via supportsFeature.
- Follow modern UI/UX best practices.
- If a field is not applicable, output "N/A".
- Output ONLY valid JSON matching the required schema.
- The generated JSON is marked "contextType": "canonical" and is immutable downstream.

Example Canonical JSON Structure:
{
  "contextType": "canonical",
  "projectName": "Example App",
  "mvpReference": "MVP-001",
  "designPhilosophy": {
    "theme": "dark",
    "designPrinciples": ["Simple", "Modern"],
    "targetExperience": "Clean tracking dashboard",
    "brandingGuidelines": []
  },
  "navigation": {
    "primaryNavigation": ["Dashboard"],
    "secondaryNavigation": [],
    "userFlows": []
  },
  "pages": [
    {
      "id": "Page-Dashboard",
      "name": "DashboardPage",
      "purpose": "Overview of metrics",
      "layout": "standard",
      "supportsFeature": "Feature-001",
      "components": ["Component-Chart"]
    }
  ],
  "components": [
    {
      "id": "Component-Chart",
      "name": "ProgressChart",
      "purpose": "Renders workout progress graphs",
      "pageId": "Page-Dashboard",
      "variants": [],
      "states": []
    }
  ],
  "designSystem": {
    "colors": ["bg-slate-950"],
    "typography": [],
    "spacing": [],
    "icons": [],
    "animations": [],
    "responsiveBreakpoints": [],
    "elevation": [],
    "borders": []
  },
  "accessibility": {
    "standards": ["WCAG 2.1 AA"],
    "requirements": []
  },
  "interactionGuidelines": {
    "feedback": [],
    "transitions": [],
    "errorStates": [],
    "loadingStates": []
  }
}`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    designPhilosophy: {
      type: 'object',
      properties: {
        theme: { type: 'string' },
        designPrinciples: { type: 'array', items: { type: 'string' } },
        targetExperience: { type: 'string' },
        brandingGuidelines: { type: 'array', items: { type: 'string' } }
      },
      required: ['theme', 'designPrinciples', 'targetExperience', 'brandingGuidelines']
    },
    navigation: {
      type: 'object',
      properties: {
        primaryNavigation: { type: 'array', items: { type: 'string' } },
        secondaryNavigation: { type: 'array', items: { type: 'string' } },
        userFlows: { type: 'array', items: { type: 'string' } }
      },
      required: ['primaryNavigation', 'secondaryNavigation', 'userFlows']
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          layout: { type: 'string' },
          supportsFeature: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'layout', 'supportsFeature', 'components']
      }
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          pageId: { type: 'string' },
          variants: { type: 'array', items: { type: 'string' } },
          states: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'pageId', 'variants', 'states']
      }
    },
    designSystem: {
      type: 'object',
      properties: {
        colors: { type: 'array', items: { type: 'string' } },
        typography: { type: 'array', items: { type: 'string' } },
        spacing: { type: 'array', items: { type: 'string' } },
        icons: { type: 'array', items: { type: 'string' } },
        animations: { type: 'array', items: { type: 'string' } },
        responsiveBreakpoints: { type: 'array', items: { type: 'string' } },
        elevation: { type: 'array', items: { type: 'string' } },
        borders: { type: 'array', items: { type: 'string' } }
      },
      required: ['colors', 'typography', 'spacing', 'icons', 'animations', 'responsiveBreakpoints', 'elevation', 'borders']
    },
    accessibility: {
      type: 'object',
      properties: {
        standards: { type: 'array', items: { type: 'string' } },
        requirements: { type: 'array', items: { type: 'string' } }
      },
      required: ['standards', 'requirements']
    },
    interactionGuidelines: {
      type: 'object',
      properties: {
        feedback: { type: 'array', items: { type: 'string' } },
        transitions: { type: 'array', items: { type: 'string' } },
        errorStates: { type: 'array', items: { type: 'string' } },
        loadingStates: { type: 'array', items: { type: 'string' } }
      },
      required: ['feedback', 'transitions', 'errorStates', 'loadingStates']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'designPhilosophy', 'navigation', 'pages', 'components', 'designSystem', 'accessibility', 'interactionGuidelines']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('Designer', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Designer', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure']
  });
  const systemData = ledger.query('Designer', {
    fromAgent: 'System',
    select: ['database']
  });
  return JSON.stringify({ Planner: plannerData, Architect: architectData, System: systemData }, null, 2);
}

