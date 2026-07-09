import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch all outputs for the conversation
    const outputs = await prisma.agentOutput.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch all history logs to extract in-progress stats
    const history = await prisma.executionHistory.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    // 1. Calculate Agent Token Usage
    const tokenUsageMap: Record<string, number> = {};
    let totalTokens = 0;

    // Seed from outputs (successful states)
    outputs.forEach((out) => {
      const tokens = out.tokenUsage || 0;
      tokenUsageMap[out.agentName] = tokens;
    });

    // Scan history logs to capture retry tokens and extra log details
    history.forEach((h) => {
      const match = h.logs.match(/(?:Estimated tokens:|Tokens generated: ~)\s*(\d+)/i);
      if (match) {
        const val = parseInt(match[1]);
        if (h.stage !== 'System' && h.stage !== 'Unknown') {
          if (!tokenUsageMap[h.stage] || tokenUsageMap[h.stage] < val) {
            tokenUsageMap[h.stage] = val;
          }
        }
      }
    });

    // Sum total
    Object.keys(tokenUsageMap).forEach((k) => {
      totalTokens += tokenUsageMap[k];
    });

    const tokenUsage = Object.keys(tokenUsageMap).map((name) => ({
      name,
      tokens: tokenUsageMap[name],
      percentage: totalTokens > 0 ? Math.round((tokenUsageMap[name] / totalTokens) * 100) : 0,
    }));

    // 2. Latency Trends (chronological agent run execution times)
    const latencyHistory: Array<{ stage: string; timeMs: number }> = [];
    history.forEach((h) => {
      const match = h.logs.match(/in (\d+)ms/i);
      if (match) {
        latencyHistory.push({
          stage: h.stage,
          timeMs: parseInt(match[1]),
        });
      }
    });

    // Fallback to outputs if history didn't capture latency matches
    if (latencyHistory.length === 0) {
      outputs.forEach((out) => {
        latencyHistory.push({
          stage: out.stage,
          timeMs: out.executionTime || 0,
        });
      });
    }

    const avgLatency = latencyHistory.length > 0 
      ? Math.round(latencyHistory.reduce((sum, item) => sum + item.timeMs, 0) / latencyHistory.length)
      : 0;

    // 3. Tool Execution Frequency (runs by stage)
    const frequencyMap: Record<string, number> = {};
    history.forEach((h) => {
      if (h.logs.includes('started (Attempt') || h.logs.includes('loop started')) {
        frequencyMap[h.stage] = (frequencyMap[h.stage] || 0) + 1;
      }
    });

    // Fallback to outputs frequency
    if (Object.keys(frequencyMap).length === 0) {
      outputs.forEach((out) => {
        frequencyMap[out.agentName] = (frequencyMap[out.agentName] || 0) + 1;
      });
    }

    const toolFrequency = Object.keys(frequencyMap).map((name) => ({
      tool: name,
      count: frequencyMap[name],
    }));

    return NextResponse.json({
      totalTokens,
      avgLatency,
      tokenUsage,
      latencyHistory,
      toolFrequency,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
