import { NextRequest, NextResponse } from 'next/server';
import { getLLMConfig } from '@/lib/agents/inference';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const config = await getLLMConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settingsPath = path.join(process.cwd(), 'settings.json');

    // Filter properties to prevent writing arbitrary keys
    const settings = {
      provider: body.provider,
      ollamaHost: body.ollamaHost,
      ollamaModel: body.ollamaModel,
      openaiApiKey: body.openaiApiKey,
      openaiModel: body.openaiModel,
      anthropicApiKey: body.anthropicApiKey,
      anthropicModel: body.anthropicModel,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
