import { prisma } from '../db';

export interface WriteAgentOutputParams {
  conversationId: string;
  agentName: string;
  stage: string;
  schemaVersion: string;
  model: string;
  validatedJson: Record<string, any>;
  executionTime: number;
  tokenUsage: number;
  attempt: number;
}

export async function writeAgentOutput(params: WriteAgentOutputParams) {
  const {
    conversationId,
    agentName,
    stage,
    schemaVersion,
    model,
    validatedJson,
    executionTime,
    tokenUsage,
    attempt,
  } = params;

  const jsonStr = JSON.stringify(validatedJson);

  // 1. Save main output
  const output = await prisma.agentOutput.create({
    data: {
      conversationId,
      agentName,
      stage,
      schemaVersion,
      model,
      validatedJson: jsonStr,
      executionTime,
      tokenUsage,
      attempt,
    },
  });

  // 2. Generate indexes for top-level keys
  const indexPromises = Object.keys(validatedJson).map((key) => {
    const path = `${agentName}.${key}`;
    const value = JSON.stringify(validatedJson[key]);
    return prisma.agentIndex.create({
      data: {
        conversationId,
        outputId: output.id,
        path,
        value,
      },
    });
  });

  await Promise.all(indexPromises);

  // If there are specific nested indexes, we can index them here (e.g. Architect.modules[0].name)
  // But top-level keys cover all requested tools.

  return output;
}

export async function queryAgentOutput(
  conversationId: string,
  agentName: string,
  path: string
): Promise<any | null> {
  const indexPath = `${agentName}.${path}`;
  const index = await prisma.agentIndex.findFirst({
    where: {
      conversationId,
      path: indexPath,
    },
    orderBy: {
      createdAt: 'desc', // get latest version
    },
  });

  if (!index) return null;
  return JSON.parse(index.value);
}

// ----------------------------------------------------
// Section 7.5 JSON-Aware Extraction Tools
// ----------------------------------------------------

export async function getVocabulary(conversationId: string): Promise<string[]> {
  return (await queryAgentOutput(conversationId, 'Planner', 'vocabulary')) || [];
}

export async function getFeatures(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'Planner', 'features')) || [];
}

export async function getRequirements(conversationId: string): Promise<any | null> {
  return await queryAgentOutput(conversationId, 'Planner', 'requirements');
}

export async function getModules(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'Architect', 'modules')) || [];
}

export async function getEntities(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'System', 'entities')) || [];
}

export async function getBusinessRules(conversationId: string): Promise<string[]> {
  return (await queryAgentOutput(conversationId, 'System', 'businessRules')) || [];
}

export async function getEndpoints(conversationId: string): Promise<string[]> {
  return (await queryAgentOutput(conversationId, 'System', 'endpoints')) || [];
}

export async function getNavigation(conversationId: string): Promise<string[]> {
  return (await queryAgentOutput(conversationId, 'Designer', 'navigationMap')) || [];
}

export async function getComponents(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'Designer', 'components')) || [];
}

export async function getBlueprint(conversationId: string, file: string): Promise<any | null> {
  const allBlueprints = (await queryAgentOutput(conversationId, 'Blueprinter', 'blueprints')) || [];
  return allBlueprints.find((b: any) => b.file === file) || null;
}

export async function getSecurityIssues(conversationId: string): Promise<any[]> {
  const report = await queryAgentOutput(conversationId, 'Security', 'securityReport');
  return report?.issues || [];
}

export async function getFailures(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'Tester', 'failureReport')) || [];
}

export async function getQualityAnnotations(conversationId: string): Promise<any[]> {
  return (await queryAgentOutput(conversationId, 'Reviewer', 'annotations')) || [];
}
