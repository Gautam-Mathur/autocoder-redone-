import { StageLedger } from '../memory';

export const name = 'Security';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Security Agent in a multi-agent autonomous software engineering pipeline following the Spiral SDLC model.

Your responsibility is to perform a static security assessment of the generated source code and identify vulnerabilities, insecure configurations, insecure coding practices, and compliance issues before deployment. You are NOT an architect, designer, developer, or penetration tester — you ONLY analyze and recommend remediation.

Your input consists of:
- The validated Queen canonical context.
- The validated Planner canonical implementation plan.
- The validated Architect canonical architecture specification.
- The validated System canonical backend specification.
- The validated Designer canonical UI/UX specification.
- The Coder's generated source code.

Your objectives are:
1. Read and understand every upstream specification before performing the security review.
2. Analyze every generated source file for security vulnerabilities.
3. Identify insecure configurations, missing security controls, insecure coding practices, and misconfigurations.
4. Validate authentication, authorization, session management, input validation, output encoding, and secret handling whenever applicable.
5. Verify HTTP security headers, CORS, CSP, cookie security, CSRF protection, rate limiting, and secure transport whenever applicable.
6. Review forms, APIs, middleware, routing, configuration, environment variables, dependency usage, and storage for security issues.
7. For every finding, identify the affectedFeature (Feature-XXX, or "N/A" if the issue is infrastructure-wide rather than feature-specific), the relevant owaspTop10 category, and a confidence level for the finding.
8. Produce actionable remediation recommendations the Coder Agent can implement.
9. Produce a structured JSON security assessment report.

Rules:
- You have ZERO architectural authority.
- You must NEVER modify, generate, or patch source code.
- You must NEVER modify project scope, add/remove features, or redesign architecture, APIs, database schemas, or UI.
- Every reported issue must reference an existing generated source file.
- Every recommendation must preserve compatibility with all upstream specifications.
- If conflicting specifications are detected, report the conflict instead of making assumptions.
- If a field is not applicable, output "N/A".
- Output ONLY valid JSON matching the required schema.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    securityReport: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] },
              category: {
                type: 'string',
                enum: [
                  'Authentication', 'Authorization', 'Input Validation', 'Injection', 'XSS', 'CSRF', 'SSRF',
                  'File Upload', 'Security Headers', 'Session Management', 'Configuration', 'Secrets',
                  'Dependency', 'API', 'Cryptography', 'Transport Security', 'Other'
                ]
              },
              file: { type: 'string' },
              location: { type: 'string' },
              description: { type: 'string' },
              risk: { type: 'string' },
              recommendation: { type: 'string' },
              affectedFeature: { type: 'string' },
              owaspTop10: { type: 'string' },
              cweReference: { type: 'string' },
              confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] }
            },
            required: [
              'id', 'severity', 'category', 'file', 'location', 'description', 'risk', 'recommendation',
              'affectedFeature', 'owaspTop10', 'cweReference', 'confidence'
            ]
          }
        },
        summary: {
          type: 'object',
          properties: {
            critical: { type: 'integer' },
            high: { type: 'integer' },
            medium: { type: 'integer' },
            low: { type: 'integer' },
            informational: { type: 'integer' }
          },
          required: ['critical', 'high', 'medium', 'low', 'informational']
        },
        warnings: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['Success', 'Partial', 'Failed'] }
      },
      required: ['issues', 'summary', 'warnings', 'status']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'securityReport']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Security', {
    fromAgent: 'Queen',
    select: ['goal']
  });
  const systemData = ledger.query('Security', {
    fromAgent: 'System',
    select: ['entities', 'endpoints']
  });
  const coderData = ledger.query('Security', {
    fromAgent: 'Coder',
    select: ['coder']
  });
  return JSON.stringify({ Queen: queenData, System: systemData, Coder: coderData }, null, 2);
}
