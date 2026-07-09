import { NextResponse } from 'next/server';
import { getLLMConfig } from '@/lib/agents/inference';

export async function GET() {
  const config = await getLLMConfig();
  const host = config.ollamaHost || 'http://localhost:11434';
  
  let connected = false;
  let models: string[] = [];

  try {
    const res = await fetch(`${host}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      connected = true;
      const data = await res.json();
      if (data && Array.isArray(data.models)) {
        models = data.models.map((m: any) => m.name);
      }
    }
  } catch (e) {
    // Connection failed
  }

  return NextResponse.json({
    connected,
    provider: config.provider,
    host,
    model: config.ollamaModel,
    models,
  });
}
