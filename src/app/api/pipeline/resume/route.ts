import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Advance stage if paused there
    let nextStage = conversation.currentStage;
    if (conversation.currentStage === 'Architect') {
      nextStage = 'System';
    } else if (conversation.currentStage === 'Queen') {
      nextStage = 'Planner';
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'Active',
        currentStage: nextStage,
      },
    });

    return NextResponse.json({ success: true, nextStage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
