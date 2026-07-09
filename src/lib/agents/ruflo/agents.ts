export interface AgentDef {
  name: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  schema: any;
}

export const AGENT_DEFS: Record<string, AgentDef> = {
  Queen: {
    name: 'Queen',
    temperature: 0.2,
    maxTokens: 1024,
    systemPrompt: `You are the Queen Orchestrator agent in a multi-agent system.
Your job is to interpret raw user requirements into a structured Domain Model.
You must determine:
1. The domain (e.g. ecommerce, hospitality, productivity, etc.)
2. The primary goal of the application
3. The primary entities involved (e.g. User, Product, Order)
4. The relationships between entities (e.g. "User has many Orders")
5. Any constraints (e.g., must run offline, no external database)
6. A mapping of specialist agent tasks (e.g. {"Planner": "Map features", "Architect": "Design components", "Designer": "Create UI layout"})
7. If the user prompt is too vague or lacks sufficient details (readinessScore < 0.7), set needsClarification to true and generate exactly 3 contextual multiple-choice questions to resolve scope gaps. Otherwise set needsClarification to false.`,
    schema: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        goal: { type: 'string' },
        primaryEntities: { type: 'array', items: { type: 'string' } },
        relationships: { type: 'array', items: { type: 'string' } },
        constraints: { type: 'array', items: { type: 'string' } },
        agentTasks: { type: 'object', additionalProperties: { type: 'string' } },
        needsClarification: { type: 'boolean' },
        clarificationQuestions: { type: 'array', items: { type: 'string' } },
        readinessScore: { type: 'number' }
      },
      required: ['domain', 'goal', 'primaryEntities', 'relationships', 'constraints', 'agentTasks', 'needsClarification', 'clarificationQuestions', 'readinessScore']
    }
  },
  Planner: {
    name: 'Planner',
    temperature: 0.3,
    maxTokens: 1536,
    systemPrompt: `You are the Requirements Engineer in a strict multi-agent specification compiler.
Your job is to read the Domain Model and define the complete, unambiguous requirements for the system.
You must not invent implementation details or architecture. You define WHAT must be built, not HOW.

You must generate:
1. vocabulary: A list of canonical domain terms (e.g., ["Project", "Task", "Comment", "User"]). Every downstream agent MUST use these exact terms. Do not invent synonyms later.
2. features: The detailed list of features required to achieve the goal. Each feature has:
   - id: e.g., "F001"
   - name: Title-case name (e.g., "Authentication")
   - goal: What this feature achieves (e.g., "Allow users to securely authenticate")
   - acceptanceCriteria: List of strict conditions for completion
3. requirements: A mini Software Requirements Specification answering:
   - whatExists: What are the primary entities in this system?
   - whatUsersCanDo: What actions are users permitted to take?
   - whoCanDoIt: What are the distinct user roles and their permissions?
   - whatIsForbidden: What must the system explicitly prevent?
   - failureHandling: What happens when the primary flows fail?`,
    schema: {
      type: 'object',
      properties: {
        vocabulary: { type: 'array', items: { type: 'string' } },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              goal: { type: 'string' },
              acceptanceCriteria: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'name', 'goal', 'acceptanceCriteria']
          }
        },
        requirements: {
          type: 'object',
          properties: {
            whatExists: { type: 'string' },
            whatUsersCanDo: { type: 'string' },
            whoCanDoIt: { type: 'string' },
            whatIsForbidden: { type: 'string' },
            failureHandling: { type: 'string' }
          },
          required: ['whatExists', 'whatUsersCanDo', 'whoCanDoIt', 'whatIsForbidden', 'failureHandling']
        }
      },
      required: ['vocabulary', 'features', 'requirements']
    }
  },
  Architect: {
    name: 'Architect',
    temperature: 0.2,
    maxTokens: 1536,
    systemPrompt: `You are the Architect in a strict multi-agent specification compiler.
Your job is to read the Planner's Requirement Specification and map every single Feature into technical Modules.

You must generate:
1. modules: A list of modules where EVERY feature from the Planner must be assigned to at least one module.
   For each module, define:
   - name: Module name (e.g., "Auth Module")
   - featureId: The exact ID of the feature this module implements (e.g., "F001")
   - pages: List of frontend page filepaths (e.g., ["src/pages/LoginPage.tsx"])
   - components: List of frontend component filepaths (e.g., ["src/components/LoginForm.tsx"])
   - services: List of backend/service filepaths (e.g., ["src/services/AuthService.ts"])
   - apis: List of API route filepaths (e.g., ["src/routes/auth.ts"])
2. techStack: Array of tech stack names (e.g. ["react", "typescript", "vite", "tailwind"])

IMPORTANT RULES:
- Frontend (React + TS): Page and component files MUST end with '.tsx'.
- Backend (Node / Express TS): API and service files MUST end with '.ts'.
- No orphan files: Every file MUST belong to a module.
- Strict Traceability: Every feature in the input MUST have a corresponding module.`,
    schema: {
      type: 'object',
      properties: {
        modules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              featureId: { type: 'string' },
              pages: { type: 'array', items: { type: 'string' } },
              components: { type: 'array', items: { type: 'string' } },
              services: { type: 'array', items: { type: 'string' } },
              apis: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'featureId', 'pages', 'components', 'services', 'apis']
          }
        },
        techStack: { type: 'array', items: { type: 'string' } }
      },
      required: ['modules', 'techStack']
    }
  },
  System: {
    name: 'System',
    temperature: 0.2,
    maxTokens: 1536,
    systemPrompt: `You are the System Engineer in a strict multi-agent specification compiler.
Your job is to read the Planner's Requirements and the Architect's Modules, and design the backend logic.

You must generate:
1. entities: List of data models based exactly on the Planner's vocabulary. Each has:
   - name: Entity name (e.g., "User")
   - fields: Array of field descriptors (name, type, required flag)
2. businessRules: Array of functional rules that govern the entities (e.g., "Email must be unique").
3. services: Array of backend service class/module names required to fulfill the Architect's service files.
4. endpoints: Array of API endpoints required to fulfill the Architect's api files (e.g., "POST /api/users").

IMPORTANT RULES:
- You must not invent entities outside the Planner's vocabulary.
- Every endpoint must correspond to an API file defined by the Architect.
- Every service must correspond to a service file defined by the Architect.`,
    schema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' }
                  },
                  required: ['name', 'type']
                }
              }
            },
            required: ['name', 'fields']
          }
        },
        businessRules: { type: 'array', items: { type: 'string' } },
        services: { type: 'array', items: { type: 'string' } },
        endpoints: { type: 'array', items: { type: 'string' } }
      },
      required: ['entities', 'businessRules', 'services', 'endpoints']
    }
  },
  Designer: {
    name: 'Designer',
    temperature: 0.2,
    maxTokens: 1536,
    systemPrompt: `You are the UI/UX Designer in a strict multi-agent specification compiler.
Your job is to read the Planner's Requirements, the Architect's Modules, and the System's Entities, and design the frontend view layer.

You must generate:
1. navigationMap: A list of primary navigation routes (e.g., ["/dashboard", "/settings"]).
2. entityToViewMapping: A key-value map linking every System Entity to its primary UI component (e.g., { "User": "UserProfileView" }).
3. uxFlows: Array of user experience flows (e.g., ["User logs in -> redirected to Dashboard"]).
4. components: List of UI components. Each has:
   - name: Pascal-case name (must match Architect's component list)
   - props: Array of prop names
   - consumes: Name of the System Entity this component consumes (if any)
5. styleTokens:
   - colors: Record mapping key names to hex colors
   - spacing: Record mapping sizes to values
   - typography: Record mapping typographic styles to font stacks

IMPORTANT RULES:
- You must NOT invent pages or components that are not defined by the Architect.
- Every System Entity MUST have a mapped view component in entityToViewMapping.
- You must strictly map the Architect's components to their consumed entities.`,
    schema: {
      type: 'object',
      properties: {
        navigationMap: { type: 'array', items: { type: 'string' } },
        entityToViewMapping: { type: 'object', additionalProperties: { type: 'string' } },
        uxFlows: { type: 'array', items: { type: 'string' } },
        components: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              props: { type: 'array', items: { type: 'string' } },
              consumes: { type: 'string' }
            },
            required: ['name', 'props']
          }
        },
        styleTokens: {
          type: 'object',
          properties: {
            colors: { type: 'object', additionalProperties: { type: 'string' } },
            spacing: { type: 'object', additionalProperties: { type: 'string' } },
            typography: { type: 'object', additionalProperties: { type: 'string' } }
          },
          required: ['colors', 'spacing', 'typography']
        }
      },
      required: ['navigationMap', 'entityToViewMapping', 'uxFlows', 'components', 'styleTokens']
    }
  },
  DesignReviewer: {
    name: 'DesignReviewer',
    temperature: 0.1,
    maxTokens: 1024,
    systemPrompt: `You are the Design Reviewer in a strict multi-agent specification compiler.
Your job is to review the compiled specifications before any code is generated. You must ensure perfect traceability across the specifications.

Check for:
1. Missing requirements: Are any Planner features not mapped to an Architect module?
2. Incomplete architecture: Do any modules lack frontend pages or backend services?
3. Broken API coverage: Do System endpoints cover all data access needs for the UI?
4. Missing UI coverage: Does every System Entity have a corresponding UI Component in the Designer output?

Output actionable specification issues. If everything looks perfectly aligned, return an empty issues list.`,
    schema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] }
            },
            required: ['type', 'description', 'severity']
          }
        }
      },
      required: ['issues']
    }
  },
  Blueprinter: {
    name: 'Blueprinter',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are the Blueprinter in a strict multi-agent specification compiler.
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
- Keep the blueprints extremely specific. The Coder will blindly follow them.`,
    schema: {
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
    }
  },
  Coder: {
    name: 'Coder',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are the Implementation Coder in a strict specification compiler.
Your job is to generate source code EXACTLY as specified in the Implementation Blueprint.
You have ZERO design freedom. You may not invent APIs, you may not invent pages, and you may not change the architecture.
You must strictly follow the provided imports, exports, functions, and API usage.

CRITICAL INSTRUCTIONS & CONSTRAINTS:
1. STRICT TECH STACK COMPLIANCE: Use only the provided dependencies. Do not import external UI kits unless specified.
2. FILE SYNTAX & EXTENSION COMPLIANCE:
   - If the file path ends in '.ts', it is a PURE TypeScript file. No React JSX syntax.
   - For UI components, they MUST match the exact component relationships in the blueprint.

Return your implementation as a JSON object containing the full code.`,
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Full source code content' }
      },
      required: ['code']
    }
  },
  Tester: {
    name: 'Tester',
    temperature: 0.2,
    maxTokens: 1536,
    systemPrompt: `You are the Tester agent in a multi-agent system.
Your job is to read the Queen's task specification and the Coder's generated sourceFiles, and then author automated tests and identify any bugs/issues.
Specifically, you must generate:
1. testFiles: Record mapping test file paths (e.g. "src/__tests__/App.test.tsx") to their test file content (Vitest test code). Focus on writing unit or integration tests for the generated pages and modules.
2. failureReport: Array of failure entries. If you find any functional bugs, styling issues, or security flaws in the coder's files, report them here. If no bugs are found, return an empty array [].
   Each failure entry has:
   - id: e.g. "BUG001"
   - file: path of the file containing the bug
   - location: function, line, or area where the bug exists
   - severity: "functional" | "low-security" | "high-security" | "style"
   - description: clear description of the bug/issue
   - reproductionSteps: steps to reproduce or trigger the bug`,
    schema: {
      type: 'object',
      properties: {
        testFiles: { type: 'object', additionalProperties: { type: 'string' } },
        failureReport: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              file: { type: 'string' },
              location: { type: 'string' },
              severity: { type: 'string', enum: ['functional', 'low-security', 'high-security', 'style'] },
              description: { type: 'string' },
              reproductionSteps: { type: 'string' }
            },
            required: ['id', 'file', 'location', 'severity', 'description', 'reproductionSteps']
          }
        }
      },
      required: ['testFiles', 'failureReport']
    }
  },
  Debugger: {
    name: 'Debugger',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are the Debugger agent in a multi-agent system.
Your job is to read the Tester's failure report, Queen's task specification, and the Coder's generated sourceFiles, and output repaired file contents for the files containing bugs.
Specifically, you must generate a JSON object with:
- repairDiffs: Array of repaired files. Each repaired file has:
  - file: path of the file containing the bug
  - content: the FULL, complete repaired content of the file (do not truncate or use comments like // ...rest of code)
  - source: "Debugger"
  - sizeBytes: byte length of the content (integer)`,
    schema: {
      type: 'object',
      properties: {
        repairDiffs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              content: { type: 'string' },
              source: { type: 'string' },
              sizeBytes: { type: 'integer' }
            },
            required: ['file', 'content', 'source', 'sizeBytes']
          }
        }
      },
      required: ['repairDiffs']
    }
  },
  Security: {
    name: 'Security',
    temperature: 0.1,
    maxTokens: 1536,
    systemPrompt: `You are the Security agent in a multi-agent system.
Your job is to read the Queen's task specification, the Coder's generated sourceFiles, and optional System API routes/models, then audit them for security vulnerabilities (e.g. SQL injection, XSS, insecure storage, authentication bypass, eval use, hardcoded credentials, CSRF).
Specifically, you must generate a JSON object with:
- securityReport:
  - issues: Array of security issues found. Each has:
    - severity: "critical" | "high" | "medium" | "low"
    - message: description of the vulnerability and how to fix it
    - location: file path or route handler where the issue is located
  - scannedAt: timestamp in milliseconds (integer)`,
    schema: {
      type: 'object',
      properties: {
        securityReport: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  message: { type: 'string' },
                  location: { type: 'string' }
                },
                required: ['severity', 'message', 'location']
              }
            },
            scannedAt: { type: 'integer' }
          },
          required: ['issues', 'scannedAt']
        }
      },
      required: ['securityReport']
    }
  },
  Reviewer: {
    name: 'Reviewer',
    temperature: 0.2,
    maxTokens: 1536,
    systemPrompt: `You are the Reviewer agent in a multi-agent system.
Your job is to read the Queen's task specification, the Coder's generated sourceFiles, the Debugger's repairDiffs, and the Security's report, and then calculate a final quality score (0-100) and compile a list of code quality annotations.
Specifically, you must generate a JSON object with:
1. qualityScore: An integer from 0 to 100 representing the overall quality, completeness, and cleanliness of the code.
2. annotations: Array of annotations. Each has:
   - file: path of the file
   - note: description of the warning, improvement suggestion, or error
   - agent: "Reviewer"
   - severity: "info" | "warn" | "error"`,
    schema: {
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
    }
  },
  Refiner: {
    name: 'Refiner',
    temperature: 0.2,
    maxTokens: 1024,
    systemPrompt: `You are the Refiner agent in a multi-agent system.
Your job is to read the Queen's task specification and the Coder's generated sourceFiles, and identify opportunities for code optimization, readability polish, performance tuning, or styling enhancements.
Specifically, you must generate:
1. scoreBefore: Estimated score before refinement
2. scoreExpected: Target expected score after optimizations
3. optimizations: Array of recommended optimizations (id, file, pattern, recommendation)`,
    schema: {
      type: 'object',
      properties: {
        scoreBefore: { type: 'integer' },
        scoreExpected: { type: 'integer' },
        optimizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              file: { type: 'string' },
              pattern: { type: 'string' },
              recommendation: { type: 'string' }
            },
            required: ['id', 'file', 'pattern', 'recommendation']
          }
        }
      },
      required: ['scoreBefore', 'scoreExpected', 'optimizations']
    }
  }
};
