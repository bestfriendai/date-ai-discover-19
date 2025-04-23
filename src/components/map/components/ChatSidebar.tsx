import React, { useRef, useEffect } from 'react';
import { XIcon, SendIcon, BotIcon, UserIcon, Loader2Icon, Trash2Icon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/services/perplexityService';
import { motion, AnimatePresence } from 'framer-motion';
import { Event } from '@/types';

interface ChatSidebarProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  extractedEvents: Event[];
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  isLoading,
  onClose,
  onSendMessage,
  onClearChat,
  extractedEvents
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue);
    setInputValue('');
  };
  
  const formatMessageContent = (content: string) => {
    const formattedContent = content.replace(
      /```json([\s\S]*?)```/g, 
      '<div class="bg-muted/50 p-2 rounded text-xs mt-2">Events extracted and displayed on map</div>'
    );
    
    const withCodeBlocks = formattedContent.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-muted/50 p-2 rounded text-xs mt-2 overflow-x-auto">$1</pre>'
    );
    
    const withBold = withCodeBlocks.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );
    
    const withItalic = withBold.replace(
      /\*(.*?)\*/g,
      '<em>$1</em>'
    );
    
    const withLinks = withItalic.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" class="text-blue-400 hover:underline">$1</a>'
    );
    
    const withLineBreaks = withLinks.replace(/\n/g, '<br>');
    
    return withLineBreaks;
  };
  
  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-xl border-r border-border/50">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center">
          <BotIcon className="h-5 w-5 mr-2 text-primary" />
          <h2 className="text-lg font-semibold">Event Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            title="Clear chat history"
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close sidebar"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {message.role === 'user' ? <UserIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} 
                    className={`${message.role === 'user' ? 'text-primary-foreground' : 'text-foreground'}`}
                  />
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <BotIcon className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </AnimatePresence>
      </div>
      
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about events..."
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !inputValue.trim()}
            size="icon"
          >
            {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </div>
        
        {extractedEvents.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {extractedEvents.length} events found and displayed on map
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
