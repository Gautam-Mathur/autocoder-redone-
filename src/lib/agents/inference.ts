import { prisma } from '../db';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InferenceOptions {
  temperature?: number;
  format?: 'json' | 'text';
}

import fs from 'fs';
import path from 'path';

// Settings helper
export async function getLLMConfig() {
  const defaults = {
    provider: process.env.LLM_PROVIDER || 'ollama', // 'ollama' | 'openai' | 'anthropic'
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3:8b-instruct',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  };

  const settingsPath = path.join(process.cwd(), 'settings.json');
  let config = { ...defaults };
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      config = { ...defaults, ...data };
    } catch (e) {
      console.error('Error reading settings.json, using defaults:', e);
    }
  }

  // Model fallback check: verify if the configured model is installed
  if (config.provider === 'ollama') {
    try {
      const res = await fetch(`${config.ollamaHost}/api/tags`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models) && data.models.length > 0) {
          const installedModelNames = data.models.map((m: any) => m.name);
          if (!installedModelNames.includes(config.ollamaModel)) {
            // Configured model not found, fallback to the first installed model
            config.ollamaModel = installedModelNames[0];
          }
        }
      }
    } catch (e) {
      // Endpoint is offline, keep default model name config
    }
  }

  return config;
}

export async function checkOllamaConnection(host: string): Promise<boolean> {
  try {
    const res = await fetch(`${host}/api/tags`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function runInference(
  messages: Message[],
  options: InferenceOptions = {}
): Promise<string> {
  if (process.env.MOCK_INFERENCE === 'true') {
    const sysPrompt = messages.find(m => m.role === 'system')?.content || '';
    if (sysPrompt.includes('Queen Orchestrator')) {
      return JSON.stringify({
        domain: "Todo App",
        goal: "Manage items",
        primaryEntities: ["Task"],
        relationships: ["User has many Tasks"],
        constraints: [],
        agentTasks: {},
        needsClarification: false,
        clarificationQuestions: [],
        readinessScore: 0.95
      });
    }
    if (sysPrompt.includes('Requirements Engineer')) {
      return JSON.stringify({
        vocabulary: ["Task"],
        features: [
          {
            id: "F001",
            name: "Add Task",
            goal: "Allow users to add task items",
            acceptanceCriteria: ["User can type task and add it"]
          }
        ],
        requirements: {
          whatExists: "Tasks exist",
          whatUsersCanDo: "Add tasks",
          whoCanDoIt: "All users",
          whatIsForbidden: "Empty tasks",
          failureHandling: "Show error dialog"
        }
      });
    }
    if (sysPrompt.includes('Architect in a strict')) {
      return JSON.stringify({
        modules: [
          {
            name: "TodoModule",
            featureId: "F001",
            pages: ["src/pages/TodoPage.tsx"],
            components: ["src/components/TodoItem.tsx"],
            services: ["src/services/TodoService.ts"],
            apis: ["src/routes/todos.ts"]
          }
        ],
        techStack: ["react", "typescript", "vite"]
      });
    }
    if (sysPrompt.includes('System Engineer in a')) {
      return JSON.stringify({
        entities: [
          {
            name: "Task",
            fields: [
              { name: "id", type: "string", required: true },
              { name: "title", type: "string", required: true }
            ]
          }
        ],
        businessRules: ["Title cannot be empty"],
        services: ["TodoService"],
        endpoints: ["POST /api/todos"]
      });
    }
    if (sysPrompt.includes('UI/UX Designer in a')) {
      return JSON.stringify({
        navigationMap: ["/todos"],
        entityToViewMapping: { "Task": "TodoItem" },
        uxFlows: ["User visits /todos to view tasks"],
        components: [
          { "name": "TodoItem", "props": ["task"], "consumes": "Task" }
        ],
        styleTokens: {
          colors: { "primary": "#6366f1" },
          spacing: { "md": "16px" },
          typography: { "body": "Inter" }
        }
      });
    }
    if (sysPrompt.includes('Design Reviewer in a')) {
      return JSON.stringify({
        issues: []
      });
    }
    if (sysPrompt.includes('Blueprinter in a strict')) {
      return JSON.stringify({
        blueprints: [
          {
            file: "src/pages/TodoPage.tsx",
            purpose: "Render tasks list",
            imports: [],
            exports: ["TodoPage"],
            dependencies: [],
            interfaces: [],
            functions: ["render"],
            apiUsage: [],
            componentRelationships: [],
            acceptanceCriteria: []
          }
        ]
      });
    }
    if (sysPrompt.includes('Implementation Coder in a')) {
      return JSON.stringify({
        code: "export function TodoPage() { return <div>Todo Page</div>; }"
      });
    }
    if (sysPrompt.includes('Tester agent in a')) {
      return JSON.stringify({
        testFiles: { "src/__tests__/TodoPage.test.tsx": "describe('TodoPage', () => {})" },
        failureReport: []
      });
    }
    if (sysPrompt.includes('Debugger agent in a')) {
      return JSON.stringify({
        repairDiffs: []
      });
    }
    if (sysPrompt.includes('Security agent in a')) {
      return JSON.stringify({
        securityReport: {
          issues: [],
          scannedAt: Date.now()
        }
      });
    }
    if (sysPrompt.includes('Reviewer agent in a')) {
      return JSON.stringify({
        qualityScore: 95,
        annotations: []
      });
    }
    if (sysPrompt.includes('Refiner agent in a')) {
      return JSON.stringify({
        scoreBefore: 95,
        scoreExpected: 98,
        optimizations: []
      });
    }
    throw new Error(`UAT Mock Inference: unknown agent prompt matching: ${sysPrompt.slice(0, 100)}`);
  }

  const config = await getLLMConfig();
  const temp = options.temperature ?? 0.2;
  const isJson = options.format === 'json';

  if (config.provider === 'ollama') {
    const host = config.ollamaHost;
    const isAlive = await checkOllamaConnection(host);
    if (!isAlive) {
      throw new Error(`Ollama is not running at ${host}. Please start Ollama before executing.`);
    }

    const payload: any = {
      model: config.ollamaModel,
      messages: messages,
      options: {
        temperature: temp,
      },
      stream: false,
    };

    if (isJson) {
      payload.format = 'json';
    }

    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama inference failed: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    return data.message.content;
  } else if (config.provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key is not configured.');
    }

    const payload: any = {
      model: config.openaiModel,
      messages: messages,
      temperature: temp,
    };

    if (isJson) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API failed: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } else if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API Key is not configured.');
    }

    // Split system prompt from messages for Anthropic
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const payload: any = {
      model: config.anthropicModel,
      messages: userMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      max_tokens: 4096,
      temperature: temp,
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API failed: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    return data.content[0].text;
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
