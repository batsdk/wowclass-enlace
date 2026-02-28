import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import WebSocket, { WebSocketServer } from 'ws';
import { verifyToken } from './lib/jwt';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

interface ExtendedWebSocket extends WebSocket {
  classId?: string;
  userId?: string;
  userName?: string;
  isAlive?: boolean;
}

const classConnections: Map<string, Set<ExtendedWebSocket>> = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: ExtendedWebSocket, req) => {
    const url = parse(req.url || '', true);
    const classId = url.query.classId as string;
    const userId = url.query.userId as string;
    const userName = decodeURIComponent(url.query.userName as string || 'Unknown');

    console.log(`Connection attempt: classId=${classId}, userId=${userId}, userName=${userName}`);

    if (!classId || !userId) {
      console.warn(`Connection rejected: Missing required parameters. classId=${classId}, userId=${userId}`);
      ws.close(1008, 'Missing required parameters');
      return;
    }

    // Verify token from request headers or query
    const token = req.headers.cookie
      ?.split('; ')
      .find((c) => c.startsWith('token='))
      ?.substring(6);

    if (!token) {
      console.warn(`Connection rejected: No token found for user ${userName}`);
      ws.close(1008, 'Unauthorized: No token');
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn(`Connection rejected: Invalid token for user ${userName}`);
      ws.close(1008, 'Unauthorized: Invalid token');
      return;
    }

    // Assign properties to WebSocket instance
    ws.classId = classId;
    ws.userId = userId;
    ws.userName = userName;
    ws.isAlive = true;

    // Add to class connections
    if (!classConnections.has(classId)) {
      classConnections.set(classId, new Set());
    }
    classConnections.get(classId)!.add(ws);

    console.log(`User ${userName} (${userId}) connected to class ${classId}`);

    // Log headers for debugging
    console.log(`Connection headers:`, JSON.stringify(req.headers));

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connection',
        payload: { status: 'connected', message: `Connected to class chat` },
      })
    );

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'message') {
          const { payload } = message;

          // Broadcast to all clients in this class (no database save)
          const connections = classConnections.get(classId);
          if (connections) {
            const broadcastMessage = JSON.stringify({
              type: 'message',
              payload: {
                id: payload.id,
                classId: payload.classId,
                senderId: payload.senderId,
                senderName: payload.senderName,
                content: payload.content,
                createdAt: payload.createdAt,
              },
            });

            connections.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMessage);
              }
            });
          }
        } else if (message.type === 'typing') {
          // Broadcast typing indicator
          const connections = classConnections.get(classId);
          if (connections) {
            const typingMessage = JSON.stringify({
              type: 'typing',
              payload: {
                userId: message.payload.userId,
                userName: message.payload.userName,
              },
            });

            connections.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client.userId !== userId) {
                client.send(typingMessage);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            payload: { message: 'Failed to process message' },
          })
        );
      }
    });

    ws.on('close', () => {
      const connections = classConnections.get(classId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          classConnections.delete(classId);
        }
      }
      console.log(`User ${userName} disconnected from class ${classId}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Handle server-level errors
  wss.on('error', (error) => {
    console.error('WSS error:', error);
  });

  // Heartbeat interval to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        console.log(`Terminating inactive connection: ${ws.userName || 'unknown'}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (err) {
        console.error('Ping failed, terminating:', err);
        ws.terminate();
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Error preparing Next.js app:', err);
  process.exit(1);
});
