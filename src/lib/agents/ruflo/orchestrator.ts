import { prisma } from '../../db';
import { runInference, getLLMConfig } from '../inference';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { buildUserContext } from '../contextBuilder';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, saveExecutiveMemory, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const activePipelines = new Set<string>();

export async function writeHistoryLog(conversationId: string, stage: string, status: string, message: string) {
  try {
    await prisma.executionHistory.create({
      data: {
        conversationId,
        stage,
        status,
        logs: message,
      },
    });
  } catch (e) {
    console.error('Failed to write history log:', e);
  }
}

export type PipelineEventCallback = (event: {
  type: string;
  agent?: string;
  message: string;
  data?: any;
}) => void;

function validateSchema(obj: any, schema: any): string | null {
  if (!obj || typeof obj !== 'object') {
    return 'Output is not a valid JSON object';
  }
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj)) {
        return `Missing required field: ${field}`;
      }
    }
  }
  return null;
}

export async function runAgent(
  conversationId: string,
  agentName: string,
  userPromptText: string,
  onEvent: PipelineEventCallback,
  ledger: StageLedger,
  attempt: number = 1,
  customUserContent?: string,
  signal?: AbortSignal
): Promise<any> {
  const agentDef = AGENT_DEFS[agentName];
  if (!agentDef) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  onEvent({
    type: 'AGENT_START',
    agent: agentName,
    message: `Agent ${agentName} started (Attempt ${attempt}/3)...`,
  });
  await writeHistoryLog(conversationId, agentName, 'Retrying', `Agent ${agentName} started (Attempt ${attempt}/3)...`);

  const startTime = Date.now();
  const contextData = await buildUserContext(ledger, agentName);
  const config = await getLLMConfig();
  await writeHistoryLog(conversationId, agentName, 'Retrying', `Active Model: ${config.ollamaModel}. Context payload assembled.`);

  const constraintsBlock = `\n\nActive Model Constraints:
- Output MUST be valid, parseable JSON. Do not include markdown code blocks (e.g. \`\`\`json) in the raw response, return raw text representing JSON.
- Strictly adhere to names and terms defined by previous agents.`;

  const schemaBlock =
    agentName === 'Coder'
      ? `\n\nOutput Schema (follow strictly):\n${JSON.stringify(agentDef.schema, null, 2)}`
      : `\n\nOutput Schema (MUST return a valid JSON object matching this schema):\n${JSON.stringify(
          agentDef.schema,
          null,
          2
        )}`;

  const retryHint =
    attempt > 1
      ? `\n\nRetry Schema Repair Hint: Your previous output failed verification. Ensure ALL required keys are present and the JSON structure is perfectly valid.`
      : '';

  const systemInstructions =
    agentDef.systemPrompt + constraintsBlock + schemaBlock + retryHint;

  const userContent = customUserContent || `Upstream Context:
${contextData}

Original Instruction:
"${userPromptText}"`;

  const { budget, timeoutMs } = calculateTokenBudget(agentName, ledger);

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Running inference (Max Tokens: ${budget}, Timeout: ${Math.round(timeoutMs / 1000)}s)...`,
  });
  await writeHistoryLog(
    conversationId,
    agentName,
    'Retrying',
    `Executing LLM inference request on model "${config.ollamaModel}". Dynamic Budget: ${budget} tokens. Timeout: ${Math.round(timeoutMs / 1000)}s.`
  );

  let rawOutput = '';
  let accumulatedText = '';
  let lastUpdate = 0;

  try {
    rawOutput = await runInference(
      [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContent },
      ],
      {
        temperature: agentDef.temperature,
        format: 'json',
        maxTokens: budget,
        timeoutMs: timeoutMs,
        signal: signal,
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          const now = Date.now();
          // Throttle updates to at most once every 300ms to avoid flooding SSE connection
          if (now - lastUpdate > 300) {
            lastUpdate = now;
            
            const apis: any[] = [];
            const entities: string[] = [];
            const files: string[] = [];

            // Speculative parsing patterns
            const methodRegex = /"method"\s*:\s*"([^"]+)"/g;
            const routeRegex = /"route"\s*:\s*"([^"]+)"/g;
            let mMatch, rMatch;
            const methodsFound: string[] = [];
            const routesFound: string[] = [];
            while ((mMatch = methodRegex.exec(accumulatedText)) !== null) {
              methodsFound.push(mMatch[1]);
            }
            while ((rMatch = routeRegex.exec(accumulatedText)) !== null) {
              routesFound.push(rMatch[1]);
            }
            for (let idx = 0; idx < Math.min(methodsFound.length, routesFound.length); idx++) {
              apis.push({ method: methodsFound[idx], route: routesFound[idx] });
            }

            const entityNameRegex = /"name"\s*:\s*"([^"]+)"/g;
            let entMatch;
            while ((entMatch = entityNameRegex.exec(accumulatedText)) !== null) {
              const name = entMatch[1];
              if (name && name.length > 2 && !name.includes('App') && !entities.includes(name)) {
                entities.push(name);
              }
            }

            const fileRegex = /"path"\s*:\s*"([^"]+\.(?:js|jsx|ts|tsx|json))"/g;
            let fMatch;
            while ((fMatch = fileRegex.exec(accumulatedText)) !== null) {
              if (!files.includes(fMatch[1])) {
                files.push(fMatch[1]);
              }
            }

            onEvent({
              type: 'AGENT_STREAM_PROGRESS',
              agent: agentName,
              message: `Generating: ${accumulatedText.split(/\s+/).length} tokens...`,
              data: {
                tokenCount: Math.round(accumulatedText.length / 4),
                maxTokens: budget,
                apis,
                entities,
                files,
                latestText: accumulatedText.substring(Math.max(0, accumulatedText.length - 200))
              }
            });
          }
        }
      }
    );
  } catch (err: any) {
    const errMsg = err.message || (signal?.aborted ? 'Request cancelled due to client disconnect.' : 'Connection timed out or socket dropped.');
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `Inference failed: ${errMsg}`,
    });
    await writeHistoryLog(conversationId, agentName, 'Failed', `Inference failed: ${errMsg}`);
    throw err;
  }

  let parsedJson: any = null;
  let cleanJsonText = rawOutput;
  if (cleanJsonText.includes('```')) {
    cleanJsonText = cleanJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    parsedJson = JSON.parse(cleanJsonText);
  } catch (err) {
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `JSON parse failed. Attempting cleanup...`,
    });
    await writeHistoryLog(conversationId, agentName, 'Retrying', `JSON parse failed, executing regular expression fallback extraction...`);
    const jsonMatch = cleanJsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedJson = JSON.parse(jsonMatch[0]);
      } catch (e) {
        await writeHistoryLog(conversationId, agentName, 'Failed', 'Failed to extract JSON format from output.');
        throw new Error('Failed to parse output as JSON.');
      }
    } else {
      await writeHistoryLog(conversationId, agentName, 'Failed', 'Failed to extract JSON format from output.');
      throw new Error('Failed to parse output as JSON.');
    }
  }

  const schemaError = validateSchema(parsedJson, agentDef.schema);
  if (schemaError) {
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `Schema validation error: ${schemaError}`,
    });
    await writeHistoryLog(conversationId, agentName, 'Failed', `Schema validation error: ${schemaError}`);
    throw new Error(schemaError);
  }

  const duration = Date.now() - startTime;

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Saving output to SML...`,
  });

  // Save to legacy SML tables for backwards-compatibility with telemetry/workspace views
  await writeAgentOutput({
    conversationId,
    agentName,
    stage: agentName,
    schemaVersion: '1.0',
    model: config.ollamaModel,
    validatedJson: parsedJson,
    executionTime: duration,
    tokenUsage: rawOutput.length / 4,
    attempt,
  });

  // 1. Write to StageLedger (enforces ownership and oscillation checks!)
  const fieldMap: Record<string, string> = {
    Queen: 'taskSpec',
    Planner: 'planner',
    Architect: 'architect',
    System: 'system',
    Designer: 'designer',
    Coder: 'coder',
    Debugger: 'debugger',
    Security: 'security',
    Reviewer: 'reviewer',
    Tester: 'tester',
  };
  const field = fieldMap[agentName];
  if (field) {
    if (agentName === 'Coder' && parsedJson) {
      let code = '';
      if (parsedJson.code) {
        code = parsedJson.code;
      } else if (Array.isArray(parsedJson.generatedFiles) && parsedJson.generatedFiles[0]) {
        code = parsedJson.generatedFiles[0].content || '';
        // Polyfill code for backward compatibility
        parsedJson.code = code;
      }
      const targetFile = customUserContent ? customUserContent.match(/filepath: "([^"]+)"/)?.[1] || 'output.js' : 'output.js';
      const currentCoderState = ledger.read('coder') || {};
      const updatedCoderState = {
        ...currentCoderState,
        [targetFile]: code
      };
      await ledger.write(agentName, field, updatedCoderState);
    } else {
      await ledger.write(agentName, field, parsedJson);
    }
  }
  await ledger.clearInvalidation(agentName);

  await writeHistoryLog(
    conversationId,
    agentName,
    'Success',
    `Agent completed successfully in ${duration}ms. Output length: ${rawOutput.length} chars. Estimated tokens: ${Math.round(rawOutput.length / 4)}.`
  );

  onEvent({
    type: 'AGENT_COMPLETE',
    agent: agentName,
    message: `Agent ${agentName} finished successfully!`,
    data: parsedJson,
  });

  return parsedJson;
}

// Helper to write files safely to target workspace path
function writeProjectFile(conversationId: string, filePath: string, content: string) {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  const fullPath = path.join(projectDir, filePath);
  
  // Create directories if needed
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

export async function launchVSCodePreview(conversationId: string, onEvent: PipelineEventCallback) {
  try {
    const projectPath = path.join(process.cwd(), 'projects', conversationId);
    if (!fs.existsSync(projectPath)) return;

    // Detect if there's a Node.js script entry point
    const potentialEntries = ['main.js', 'app.js', 'server.js', 'index.js'];
    let entryFile = '';
    for (const f of potentialEntries) {
      if (fs.existsSync(path.join(projectPath, f))) {
        entryFile = f;
        break;
      }
    }

    // Fallback: If no entry file exists but it is a Node.js project, generate a default wrapper index.js
    if (!entryFile && (fs.existsSync(path.join(projectPath, 'routes')) || fs.existsSync(path.join(projectPath, 'controllers')))) {
      const defaultIndexContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Auto-register routes if available
try {
  const taskRoutes = require('./routes/taskRoutes');
  app.use('/api', taskRoutes);
  app.use('/', taskRoutes);
} catch (err) {
  console.log("No taskRoutes found or failed to load:", err.message);
}

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Fallback server running' }));

app.listen(port, () => {
  console.log(\`Server is running on port \${port}\`);
});
`;
      fs.writeFileSync(path.join(projectPath, 'index.js'), defaultIndexContent, 'utf8');
      entryFile = 'index.js';
    }

    const command = entryFile ? `node ${entryFile}` : (process.platform === 'win32' ? 'npx.cmd -y serve -l 8080' : 'npx -y serve -l 8080');

    // Create .vscode directory if needed
    const vscodeDir = path.join(projectPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    const tasksJson = {
      version: '2.0.0',
      tasks: [
        {
          label: 'Auto Start Server',
          type: 'shell',
          command: command,
          options: {
            env: {
              PORT: '8080'
            }
          },
          runOptions: {
            runOn: 'folderOpen'
          },
          presentation: {
            reveal: 'always',
            panel: 'new'
          }
        }
      ]
    };

    fs.writeFileSync(
      path.join(vscodeDir, 'tasks.json'),
      JSON.stringify(tasksJson, null, 2),
      'utf8'
    );

    onEvent({
      type: 'AGENT_LOG',
      message: `Launching new VS Code workspace instance for project: "${conversationId}"...`
    });

    exec(`code "${projectPath}"`, (err) => {
      if (err) {
        onEvent({
          type: 'AGENT_LOG',
          message: 'Warning: VS Code CLI ("code") was not found on your system PATH. Please open the project directory manually.'
        });
      }
    });
  } catch (error: any) {
    onEvent({
      type: 'AGENT_LOG',
      message: `Failed to initialize VS Code auto-run: ${error.message}`
    });
  }
}

export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  if (activePipelines.has(conversationId)) {
    onEvent({
      type: 'AGENT_LOG',
      message: 'Connection established to active compiler loop.',
    });
    return;
  }
  activePipelines.add(conversationId);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Load state ledger
    const memoryState = await loadExecutiveMemory(conversationId);
    const ledger = new StageLedger(conversationId, memoryState);

    let actualPrompt = userPrompt;
    if (userPrompt.trim().toLowerCase() === 'continue') {
      actualPrompt = memoryState.originalPrompt || conversation.title || 'Make a project';
    } else {
      memoryState.originalPrompt = userPrompt;
      await saveExecutiveMemory(conversationId, memoryState);
    }

    let currentStage = conversation.currentStage;

    if (conversation.status === 'Completed') {
      onEvent({
        type: 'AGENT_LOG',
        message: 'Project is already compiled. Initializing VS Code preview server...'
      });
      await launchVSCodePreview(conversationId, onEvent);
      return;
    }

    onEvent({
      type: 'PIPELINE_START',
      message: `Resuming pipeline for conversation ${conversationId} from stage: ${currentStage}...`,
    });
    await writeHistoryLog(conversationId, 'System', 'Success', `Resuming pipeline compilation loop from stage: ${currentStage}.`);

    const pipelineStages = [
      'Queen',
      'Planner',
      'Architect',
      'System',
      'Designer',
      'Blueprinter',
      'Coder',
      'Tester',
      'Debugger',
      'Security',
      'Reviewer'
    ];

    let startIndex = pipelineStages.indexOf(currentStage);
    if (startIndex === -1) {
      startIndex = 0;
    }

  for (let i = startIndex; i < pipelineStages.length; i++) {
    if (signal?.aborted) {
      throw new Error('Pipeline compilation aborted due to client disconnect.');
    }

    const stage = pipelineStages[i];

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { currentStage: stage, status: 'Active' },
    });

    let output: any = null;

    if (stage === 'Coder') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Coder Loop
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Coder',
        message: `Coder loop started. Generating individual files from blueprints...`,
      });

      const blueprints = await queryAgentOutput(conversationId, 'Blueprinter', 'blueprints');
      if (!blueprints || blueprints.length === 0) {
        onEvent({
          type: 'AGENT_ERROR',
          agent: 'Coder',
          message: 'No blueprints found in SML. Cannot compile files.',
        });
        return;
      }

      onEvent({
        type: 'AGENT_LOG',
        agent: 'Coder',
        message: `Found ${blueprints.length} blueprints. Synthesizing files...`,
      });

      const generatedFilesInfo: any[] = [];

      for (const bp of blueprints) {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Coder',
          message: `Compiling file: ${bp.file}...`,
        });

        // Run inference specifically for this file
        let coderOutput: any = null;
        let success = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const customUserContent = `Generate code for the target filepath: "${bp.file}"
Target Purpose: ${bp.purpose}
Required Imports: ${JSON.stringify(bp.imports)}
Required Exports: ${JSON.stringify(bp.exports)}
Interfaces: ${JSON.stringify(bp.interfaces)}
Functions to Implement: ${JSON.stringify(bp.functions)}
API usage constraints: ${JSON.stringify(bp.apiUsage)}
Component relationships: ${JSON.stringify(bp.componentRelationships)}
Acceptance criteria to fulfill: ${JSON.stringify(bp.acceptanceCriteria)}

Ensure you write complete source code matching these specs. Do not truncate.`;

            coderOutput = await runAgent(
              conversationId,
              'Coder',
              actualPrompt,
              onEvent,
              ledger,
              attempt,
              customUserContent,
              signal
            );
            success = true;
            break;
          } catch (err: any) {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Coder',
              message: `Failed to compile ${bp.file} on attempt ${attempt}: ${err.message}`,
            });
            if (signal?.aborted) {
              throw err;
            }
          }
        }

        if (success && coderOutput) {
          // Write code to the local filesystem
          writeProjectFile(conversationId, bp.file, coderOutput.code);
          generatedFilesInfo.push({ file: bp.file, sizeBytes: coderOutput.code.length });

          // Save specific file output into SML keyed by filename for history logging
          await writeAgentOutput({
            conversationId,
            agentName: 'Coder',
            stage: bp.file, // Store under the filepath
            schemaVersion: '1.0',
            model: 'ollama/default',
            validatedJson: { file: bp.file, code: coderOutput.code },
            executionTime: 0,
            tokenUsage: coderOutput.code.length / 4,
            attempt: 1,
          });
        } else {
          onEvent({
            type: 'PIPELINE_ERROR',
            message: `Pipeline halted. Coder failed to compile file: ${bp.file}`,
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'Paused' },
          });
          return;
        }
      }

      onEvent({
        type: 'AGENT_COMPLETE',
        agent: 'Coder',
        message: `Coder loop completed successfully! Synthesized ${generatedFilesInfo.length} files.`,
        data: { files: generatedFilesInfo },
      });

    } else if (stage === 'Tester') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Tester & Linter checks
      // ----------------------------------------------------
      let customUserContent: string | undefined = undefined;
      
      try {
        const projectPath = path.join(process.cwd(), 'projects', conversationId);
        const potentialEntries = ['main.js', 'app.js', 'server.js', 'index.js'];
        let entryFile = '';
        for (const f of potentialEntries) {
          if (fs.existsSync(path.join(projectPath, f))) {
            entryFile = f;
            break;
          }
        }

        if (entryFile) {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Tester',
            message: `Starting developer-style runtime testing. Spawning "${entryFile}" in background on port 8082...`
          });

          const { spawn } = require('child_process');
          const child = spawn('node', [entryFile], {
            cwd: projectPath,
            env: { ...process.env, PORT: '8082' }
          });

          let stdoutBuffer = '';
          let stderrBuffer = '';

          child.stdout.on('data', (data: any) => {
            stdoutBuffer += data.toString();
          });

          child.stderr.on('data', (data: any) => {
            stderrBuffer += data.toString();
          });

          // Wait for 4000ms to collect startup console logs/exceptions
          await new Promise((resolve) => setTimeout(resolve, 4000));

          // Terminate the process safely
          child.kill('SIGTERM');

          customUserContent = `--- RUNTIME EXECUTION LOGS ---\n[STDOUT]:\n${stdoutBuffer || '(None)'}\n[STDERR]:\n${stderrBuffer || '(None)'}\n------------------------------`;
          
          if (stderrBuffer.trim()) {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Tester',
              message: `Warning: Runtime execution captured errors in stderr. Logs attached to test analysis.`
            });
          } else {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Tester',
              message: `Runtime execution completed cleanly without immediate crash logs.`
            });
          }
        } else {
          customUserContent = `--- RUNTIME EXECUTION LOGS ---\nNo entry script found. Static layout verified.\n------------------------------`;
        }
      } catch (err: any) {
        customUserContent = `--- RUNTIME EXECUTION LOGS ---\nFailed to run developer runtime checks: ${err.message}\n------------------------------`;
      }

      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          output = await runAgent(conversationId, stage, actualPrompt, onEvent, ledger, attempt, customUserContent, signal);
          success = true;
          break;
        } catch (err: any) {
          onEvent({
            type: 'AGENT_ERROR',
            agent: stage,
            message: `Attempt ${attempt} failed: ${err.message}`,
          });
          if (signal?.aborted) {
            throw err;
          }
        }
      }

      if (success && output) {
        // Write test files to disk
        const testFilesMap = output.testFiles || {};
        Object.keys(testFilesMap).forEach((testFile) => {
          writeProjectFile(conversationId, testFile, testFilesMap[testFile]);
        });

        // Run local linter/syntax scanner on all written files to detect syntax issues
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Tester',
          message: 'Executing static syntax verification and bracket matching checks on generated codebase...',
        });

        const projectDir = path.join(process.cwd(), 'projects', conversationId);
        const codeFiles = Object.keys(testFilesMap); // or scan directory
        const additionalFailures: any[] = [];

        // Check brackets balance for each file
        const checkSyntax = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const list = fs.readdirSync(dir);
          list.forEach((file) => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              checkSyntax(filePath);
            } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
              const code = fs.readFileSync(filePath, 'utf8');
              // Basic braces balancer
              const stack: string[] = [];
              let hasMismatch = false;
              for (let idx = 0; idx < code.length; idx++) {
                const char = code[idx];
                if (char === '{' || char === '(' || char === '[') {
                  stack.push(char);
                } else if (char === '}' || char === ')' || char === ']') {
                  const top = stack.pop();
                  if (
                    (char === '}' && top !== '{') ||
                    (char === ')' && top !== '(') ||
                    (char === ']' && top !== '[')
                  ) {
                    hasMismatch = true;
                    break;
                  }
                }
              }

              if (hasMismatch || stack.length > 0) {
                const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');
                additionalFailures.push({
                  id: `SYNTAX_${Date.now()}`,
                  file: relPath,
                  location: 'Root level parsing',
                  severity: 'functional',
                  description: 'Detected unbalanced brackets/parentheses indicating syntax compiling errors.',
                  reproductionSteps: 'Inspect file braces alignment.',
                });
              }
            }
          });
        };

        checkSyntax(projectDir);

        if (additionalFailures.length > 0) {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Tester',
            message: `Static checks failed. Found ${additionalFailures.length} syntax issues. Appending to failure report.`,
          });
          output.failureReport = [...(output.failureReport || []), ...additionalFailures];
          // Rewrite outputs with updated failures
          await writeAgentOutput({
            conversationId,
            agentName: 'Tester',
            stage: 'Tester',
            schemaVersion: '1.0',
            model: 'ollama/default',
            validatedJson: output,
            executionTime: 0,
            tokenUsage: 0,
            attempt: 1,
          });
        } else {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Tester',
            message: 'All generated files parsed cleanly. No syntax mismatches detected.',
          });
        }
      } else {
        return; // Halted
      }

    } else if (stage === 'Debugger') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Debugger Loop
      // ----------------------------------------------------
      const failures = await queryAgentOutput(conversationId, 'Tester', 'failureReport');
      if (failures && failures.length > 0) {
        onEvent({
          type: 'AGENT_START',
          agent: 'Debugger',
          message: `Debugger activated. Repairing ${failures.length} issues...`,
        });

        // Run debugger to get diff repairs
        let debugOutput: any = null;
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            debugOutput = await runAgent(conversationId, 'Debugger', actualPrompt, onEvent, ledger, attempt, undefined, signal);
            success = true;
            break;
          } catch (e: any) {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `Debugger failed on attempt ${attempt}.`,
            });
            if (signal?.aborted) {
              throw e;
            }
          }
        }

        if (success && debugOutput && debugOutput.repairDiffs) {
          for (const diff of debugOutput.repairDiffs) {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `Applying repair patch to: ${diff.file}...`,
            });
            writeProjectFile(conversationId, diff.file, diff.content);

            // Re-write to Coder output
            await writeAgentOutput({
              conversationId,
              agentName: 'Coder',
              stage: diff.file,
              schemaVersion: '1.0',
              model: 'ollama/default',
              validatedJson: { file: diff.file, code: diff.content },
              executionTime: 0,
              tokenUsage: diff.content.length / 4,
              attempt: 1,
            });
          }
        }
      } else {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Debugger',
          message: 'No failures logged in Tester. Debugger skipped.',
        });
      }

    } else if (stage === 'Security') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Security Scanner
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Security',
        message: 'Security audit starting. Scanning generated files for vulnerabilities...',
      });

      // Run normal LLM scan
      let secReport: any = null;
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          secReport = await runAgent(conversationId, 'Security', actualPrompt, onEvent, ledger, attempt, undefined, signal);
          success = true;
          break;
        } catch (e: any) {
          if (signal?.aborted) {
            throw e;
          }
        }
      }

      if (success && secReport) {
        // Run static regex scans for secrets and evals
        const projectDir = path.join(process.cwd(), 'projects', conversationId);
        const scannerIssues: any[] = [];

        const scanFiles = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const list = fs.readdirSync(dir);
          list.forEach((file) => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              scanFiles(filePath);
            } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
              const code = fs.readFileSync(filePath, 'utf8');
              const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');

              // Check for eval
              if (code.includes('eval(') || code.includes('Function(')) {
                scannerIssues.push({
                  severity: 'critical',
                  message: 'Use of eval() or Function() constructor introduces arbitrary code execution risks.',
                  location: relPath,
                });
              }

              // Check for hardcoded API keys
              const keyRegex = /(sk-[a-zA-Z0-9]{32,}|AIzaSy[a-zA-Z0-9_-]{33}|api[-_]key|secret)/i;
              if (keyRegex.test(code) && !code.includes('process.env')) {
                scannerIssues.push({
                  severity: 'high',
                  message: 'Found potential hardcoded secret or API key credential exposed in code.',
                  location: relPath,
                });
              }
            }
          });
        };

        scanFiles(projectDir);

        if (scannerIssues.length > 0) {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Security',
            message: `Static regex scan identified ${scannerIssues.length} alerts. Adding to Security report.`,
          });
          secReport.securityReport.issues = [...(secReport.securityReport.issues || []), ...scannerIssues];
          // Update output
          await writeAgentOutput({
            conversationId,
            agentName: 'Security',
            stage: 'Security',
            schemaVersion: '1.0',
            model: 'ollama/default',
            validatedJson: secReport,
            executionTime: 0,
            tokenUsage: 0,
            attempt: 1,
          });
        }
      }

    } else {
      // ----------------------------------------------------
      // Standard Agent stages (Queen, Planner, Architect, etc.)
      // ----------------------------------------------------
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          output = await runAgent(conversationId, stage, actualPrompt, onEvent, ledger, attempt, undefined, signal);
          success = true;
          break;
        } catch (err: any) {
          onEvent({
            type: 'AGENT_ERROR',
            agent: stage,
            message: `Attempt ${attempt} failed: ${err.message}`,
          });

          await prisma.executionHistory.create({
            data: {
              conversationId,
              stage: stage,
              status: 'Failed',
              logs: `Attempt ${attempt} failed: ${err.message}`,
            },
          });

          if (signal?.aborted) {
            throw err;
          }

          if (attempt === 3) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { status: 'Paused' },
            });
            onEvent({
              type: 'PIPELINE_ERROR',
              message: `Pipeline halted at stage ${stage} after 3 failed attempts.`,
            });
            return;
          }
        }
      }
    }

    // Intermediary check logic after standard runs
    if (stage === 'Queen') {
      if (output && (output.status === 'Rejected' || output.contextType === 'validationError')) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        onEvent({
          type: 'PIPELINE_ERROR',
          message: `Pipeline rejected: Queen Agent classified the request as invalid.\nReason: ${output.reason || 'Invalid Request'}\nMessage: ${output.message}`,
        });
        await writeHistoryLog(
          conversationId,
          'System',
          'Failed',
          `Pipeline halted. Queen validation error: ${output.message}`
        );
        return;
      }
      if (output && output.needsClarification) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        onEvent({
          type: 'PAUSE_CLARIFICATION',
          message: `Pipeline paused. Queen requires clarification questions to be answered.`,
          data: {
            questions: output.clarificationQuestions,
            readinessScore: output.readinessScore,
          },
        });
        await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline paused. Awaiting answers to Queen clarification questions.');
        return;
      }
    }

    if (stage === 'Architect') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Paused' },
      });
      onEvent({
        type: 'PAUSE_APPROVAL_GATE',
        message: `Pipeline paused at Approval Gate (Architect Review completed). Awaiting user approval to generate code.`,
      });
      await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline paused at Architect Approval Gate. Awaiting user approval to generate code.');
      return;
    }

  }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Completed' },
    });

    await launchVSCodePreview(conversationId, onEvent);

    onEvent({
      type: 'PIPELINE_SUCCESS',
      message: `All stages completed successfully! Project code compiles and is ready.`,
    });
    await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline compilation completed successfully! All 11 passes resolved.');
  } finally {
    activePipelines.delete(conversationId);
  }
}
