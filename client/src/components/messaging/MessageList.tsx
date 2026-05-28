import { formatDistanceToNow, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';

interface Message {
  id: number;
  transactionId: number;
  sender: string;
  receiver: string;
  content: string;
  isSystem: boolean;
  timestamp: string;
  read: boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserAddress: string;
}

export function MessageList({ messages, currentUserAddress }: MessageListProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isFromCurrentUser = message.sender === currentUserAddress;
        const isSystemMessage = message.isSystem;
        
        if (isSystemMessage) {
          return (
            <div 
              key={message.id} 
              className="flex justify-center"
            >
              <div className="bg-muted/50 px-3 py-2 rounded-md text-xs text-center text-muted-foreground max-w-[80%]">
                <div className="flex items-center justify-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{message.content}</span>
                </div>
                {message.timestamp && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(parseISO(message.timestamp), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        return (
          <div 
            key={message.id} 
            className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                isFromCurrentUser 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="text-sm">{message.content}</div>
              {message.timestamp && (
                <div className={`text-[10px] mt-1 ${
                  isFromCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {formatDistanceToNow(parseISO(message.timestamp), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}