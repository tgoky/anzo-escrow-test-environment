import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface MessageComposerProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageComposer({ 
  onSend, 
  placeholder = 'Type a message...', 
  disabled = false 
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || disabled || isSending) return;
    
    try {
      setIsSending(true);
      await onSend(message);
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Ctrl+Enter or Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="resize-none"
        disabled={disabled || isSending}
        rows={1}
      />
      <Button 
        size="icon" 
        onClick={handleSend} 
        disabled={!message.trim() || disabled || isSending}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}