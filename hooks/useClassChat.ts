import { useEffect, useState, useCallback, useRef } from 'react';
import { ClassCommunicationClient, ClassMessage } from '@/lib/websocket';
import { addMessage, getMessagesByClassId, initDB, IMessage } from '@/lib/indexeddb';

export interface UseClassChatOptions {
  classId: string;
  userId: string;
  userName: string;
}

export function useClassChat({ classId, userId, userName }: UseClassChatOptions) {
  const [messages, setMessages] = useState<ClassMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const clientRef = useRef<ClassCommunicationClient | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await initDB();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
        setIsLoading(false);
      }
    };

    initializeDB();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (isLoading) return;

    // Guard: Prevent connection if parameters are invalid
    if (!classId || classId === 'undefined' || !userId || userId === 'undefined') {
      console.warn('Skipping WebSocket connection: missing valid classId or userId');
      return;
    }

    const client = new ClassCommunicationClient(classId, userId, userName);
    clientRef.current = client;

    client.onMessage((message: ClassMessage) => {
      setMessages((prev) => {
        const messageExists = prev.some((m) => m.id === message.id);
        if (messageExists) return prev;
        return [...prev, message];
      });

      // Store in IndexedDB for this session
      addMessage({
        id: message.id,
        classId: message.classId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        createdAt: message.createdAt,
        synced: true,
      }).catch((error) => console.error('Error storing message:', error));
    });

    client.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });

    client.onTyping((data) => {
      if (data.userId !== userId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.add(data.userId);
          return next;
        });

        // Remove typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
        }, 3000);
      }
    });

    client.connect().catch((error) => {
      console.error('Error connecting to WebSocket:', error);
      setIsConnected(false);
    });

    return () => {
      client.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [classId, userId, userName, isLoading]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!clientRef.current || !isConnected) {
        console.error('WebSocket not connected');
        return;
      }

      clientRef.current.sendMessage(content);

      // Add local message optimistically
      const localMessage: ClassMessage = {
        id: `local-${Date.now()}`,
        classId,
        senderId: userId,
        senderName: userName,
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, localMessage]);

      // Store locally
      addMessage({
        ...localMessage,
        synced: false,
      }).catch((error) => console.error('Error storing local message:', error));
    },
    [classId, userId, userName, isConnected]
  );

  const sendTypingIndicator = useCallback(() => {
    if (clientRef.current && isConnected) {
      clientRef.current.sendTyping();
    }
  }, [isConnected]);

  return {
    messages,
    sendMessage,
    sendTypingIndicator,
    isConnected,
    isLoading,
    typingUsers,
  };
}
