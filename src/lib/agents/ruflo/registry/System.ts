import { StageLedger } from '../memory';

export const name = 'System';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the System Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to transform the canonical context, implementation plan, and architecture into a complete backend system specification for the MVP. You decide HOW the backend will function, communicate, validate, and manage data, but NOT implement it.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.
- The validated Architect canonical architecture specification.

Your objectives are:
1. Analyze the project context, planned features, technology stack, and architecture.
2. Design the database schema, with every entity carrying an id, an explicit purpose (business justification), fields, relationships, indexes, and constraints.
3. Design all API endpoints required by the planned features, each carrying an id and a featureId referencing the Feature-XXX it supports.
4. Define API request/response contracts.
5. Define routing structure, with each route referencing the apiId it exposes.
6. Define middleware (authentication, authorization, validation, logging, rate limiting, error handling, security) whenever applicable.
7. Define backend services, each carrying an id and a usedByApis list referencing the API-XXX IDs that consume it.
8. Define configuration requirements (env vars, secrets, storage, caching, messaging, third-party integrations) whenever applicable.
9. Ensure every planned feature has complete backend support.
10. Produce a single structured JSON document marked as the canonical backend system specification.

Rules:
- If the project is a lightweight utility, script, or single-file tool (such as a CLI script or Streamlit page) that does not require database schemas, api endpoints, routing, or middleware, simply populate those fields with empty arrays/objects and "N/A" strings to satisfy the schema validation safely.
- Do not modify the MVP scope, add/remove features, or modify the architecture.
- Do not design UI layouts, generate frontend components, or generate source code.
- Every API endpoint must support at least one planned feature via featureId.
- Every database entity must have a non-empty purpose tied to a valid business requirement.
- Every middleware must have a clearly defined responsibility.
- Follow the conventions of the selected technology stack.
- If a field is not applicable, output "N/A".
- Output ONLY valid JSON matching the required schema.
- The generated JSON is marked "contextType": "canonical" and is immutable downstream.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    database: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              purpose: { type: 'string' },
              fields: { type: 'array', items: { type: 'string' } },
              relationships: { type: 'array', items: { type: 'string' } },
              indexes: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'name', 'purpose', 'fields', 'relationships', 'indexes', 'constraints']
          }
        }
      },
      required: ['type', 'entities']
    },
    apis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          method: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          featureId: { type: 'string' },
          request: { type: 'object' },
          response: { type: 'object' },
          middleware: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'method', 'route', 'purpose', 'featureId', 'request', 'response', 'middleware']
      }
    },
    routing: {
      type: 'object',
      properties: {
        routerStructure: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              apiId: { type: 'string' },
              path: { type: 'string' }
            },
            required: ['apiId', 'path']
          }
        },
        routeGroups: { type: 'array', items: { type: 'string' } }
      },
      required: ['routerStructure', 'routeGroups']
    },
    middleware: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          appliesTo: { type: 'array', items: { type: 'string' } }
        },
        required: ['name', 'purpose', 'appliesTo']
      }
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          usedByApis: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'usedByApis']
      }
    },
    configuration: {
      type: 'object',
      properties: {
        environmentVariables: { type: 'array', items: { type: 'string' } },
        storage: { type: 'array', items: { type: 'string' } },
        cache: { type: 'array', items: { type: 'string' } },
        externalServices: { type: 'array', items: { type: 'string' } },
        authentication: { type: 'array', items: { type: 'string' } },
        authorization: { type: 'array', items: { type: 'string' } },
        others: { type: 'array', items: { type: 'string' } }
      },
      required: ['environmentVariables', 'storage', 'cache', 'externalServices', 'authentication', 'authorization', 'others']
    },
    backendRules: {
      type: 'object',
      properties: {
        validationRules: { type: 'array', items: { type: 'string' } },
        businessRules: { type: 'array', items: { type: 'string' } },
        errorHandling: { type: 'array', items: { type: 'string' } },
        securityPolicies: { type: 'array', items: { type: 'string' } }
      },
      required: ['validationRules', 'businessRules', 'errorHandling', 'securityPolicies']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'database', 'apis', 'routing', 'middleware', 'services', 'configuration', 'backendRules']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('System', {
    fromAgent: 'Planner',
    select: ['requirements', 'vocabulary']
  });
  const architectData = ledger.query('System', {
    fromAgent: 'Architect',
    select: ['modules']
  });
  const queenData = ledger.query('System', {
    fromAgent: 'Queen',
    select: ['constraints']
  });
  return JSON.stringify({ Planner: plannerData, Architect: architectData, Queen: queenData }, null, 2);
}
