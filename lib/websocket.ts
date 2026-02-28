// WebSocket client utilities for real-time class communication

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'connection' | 'history';
  payload: any;
}

export interface ClassMessage {
  id: string;
  classId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export class ClassCommunicationClient {
  private ws: WebSocket | null = null;
  private classId: string;
  private userId: string;
  private userName: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: ((message: ClassMessage) => void)[] = [];
  private statusHandlers: ((status: 'connected' | 'disconnected') => void)[] = [];
  private typingHandlers: ((data: { userId: string; userName: string }) => void)[] = [];

  constructor(classId: string, userId: string, userName: string) {
    this.classId = classId;
    this.userId = userId;
    this.userName = userName;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/api/ws/chat?classId=${this.classId}&userId=${this.userId}&userName=${encodeURIComponent(this.userName)}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`WebSocket connected to ${wsUrl}`);
          this.reconnectAttempts = 0;
          this.notifyStatusChange('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket client error:', error);
          // Don't reject if we're already connected, onclose will handle it
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
          this.notifyStatusChange('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'message':
        this.messageHandlers.forEach((handler) => handler(data.payload));
        break;
      case 'typing':
        this.typingHandlers.forEach((handler) => handler(data.payload));
        break;
      case 'history':
        // Handle history if needed
        break;
    }
  }

  public sendMessage(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const message: WebSocketMessage = {
      type: 'message',
      payload: {
        classId: this.classId,
        senderId: this.userId,
        senderName: this.userName,
        content,
        createdAt: new Date().toISOString(),
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  public sendTyping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WebSocketMessage = {
      type: 'typing',
      payload: {
        classId: this.classId,
        userId: this.userId,
        userName: this.userName,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  public onMessage(handler: (message: ClassMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  public onStatusChange(handler: (status: 'connected' | 'disconnected') => void): void {
    this.statusHandlers.push(handler);
  }

  public onTyping(handler: (data: { userId: string; userName: string }) => void): void {
    this.typingHandlers.push(handler);
  }

  private notifyStatusChange(status: 'connected' | 'disconnected'): void {
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnect attempts reached');
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
