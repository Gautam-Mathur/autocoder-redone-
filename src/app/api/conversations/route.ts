import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const list = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Autocoder Project',
        status: 'Idle',
        currentStage: 'Queen',
      },
    });
    return NextResponse.json(conversation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
