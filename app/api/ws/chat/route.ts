import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

// Store for active WebSocket connections per class
const classConnections: Map<string, Set<WebSocket>> = new Map();
const userConnections: Map<string, { classId: string; userId: string; userName: string; ws: WebSocket }> = new Map();

// This endpoint handles initial WebSocket upgrade requests
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const userId = searchParams.get('userId');
  const userName = decodeURIComponent(searchParams.get('userName') || '');

  if (!classId || !userId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // In a real implementation, verify the user's authorization to join this class
  const token = req.cookies.get('token')?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return a response indicating WebSocket upgrade is needed
  // Note: Next.js doesn't support WebSocket upgrades directly in the app router
  // You'll need to use a custom server implementation
  return NextResponse.json({
    message: 'WebSocket connection initiated',
    classId,
    userId,
    userName,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { classId, senderId, senderName, content } = body;

  if (!classId || !senderId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {

    let message = {
      classId,
      senderId,
      senderName,
      content,
      createdAt: new Date(),
    }

    // Broadcast to connected clients (when WebSocket support is implemented)
    broadcastToClass(classId, {
      type: 'message',
      payload: message,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

function broadcastToClass(classId: string, message: any) {
  const connections = classConnections.get(classId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}
