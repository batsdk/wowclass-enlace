'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useClassChat } from '@/hooks/useClassChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Loader2 } from 'lucide-react';

interface ClassChatProps {
  classId: string;
  userId: string;
  userName: string;
  className?: string;
}

export function ClassChat({ classId, userId, userName, className }: ClassChatProps) {
  const { messages, sendMessage, sendTypingIndicator, isConnected, isLoading, typingUsers } =
    useClassChat({
      classId,
      userId,
      userName,
    });

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !isConnected || isSending) {
      return;
    }

    setIsSending(true);
    try {
      sendMessage(inputValue.trim());
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Send typing indicator
    sendTypingIndicator();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-4 p-4">
        <div className="space-y-2 flex-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{className || 'Class Chat'}</h2>
          <p className="text-sm text-gray-500">
            {isConnected ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Disconnected
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.senderId === userId ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-1 max-w-xs ${message.senderId === userId
                    ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg'
                    : 'bg-gray-200 text-gray-800 rounded-r-lg rounded-tl-lg'
                  } p-3`}
              >
                {message.senderId !== userId && (
                  <p className="text-xs font-semibold mb-1 opacity-70">{message.senderName}</p>
                )}
                <p className="text-sm break-words">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${message.senderId === userId ? 'text-blue-100' : 'text-gray-500'
                    }`}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="text-sm text-gray-500 italic">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        {!isConnected && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            Connecting... Messages will be sent when connection is restored.
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!isConnected || isSending || !inputValue.trim()}
            size="icon"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ClassChat;
