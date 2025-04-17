import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hi there! I\'m DateAI, your date planning assistant. How can I help you today? You can ask me for date ideas, recommendations for activities, or help planning your perfect date.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { 
      sender: 'user', 
      text: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // In the future, this will call a Supabase Edge Function
      // const { data, error } = await supabase.functions.invoke('ask-date-ai', {
      //   body: { prompt: inputValue },
      // });
      // if (error) throw error;

      // --- Placeholder Response ---
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      
      // Generate a contextual response based on the user's message
      let aiResponseText = '';
      const userMessageLower = userMessage.text.toLowerCase();
      
      if (userMessageLower.includes('restaurant') || userMessageLower.includes('dinner') || userMessageLower.includes('eat')) {
        aiResponseText = `I'd be happy to help you find a great restaurant! Based on your message about "${userMessage.text}", I'd recommend checking out the map view where you can filter for food and restaurant events. In the future, I'll be able to make personalized recommendations based on your preferences and location.`;
      } 
      else if (userMessageLower.includes('movie') || userMessageLower.includes('theatre') || userMessageLower.includes('show')) {
        aiResponseText = `Looking for entertainment like "${userMessage.text}"? Great choice! You can find movies, shows, and performances by using the map view and filtering for arts & theatre events. I'll be able to suggest specific shows based on your interests in future updates.`;
      }
      else if (userMessageLower.includes('outdoor') || userMessageLower.includes('park') || userMessageLower.includes('hike')) {
        aiResponseText = `Outdoor activities are perfect for dates! For "${userMessage.text}", I suggest checking out parks, hiking trails, or outdoor events in your area. Use the map view to explore what's happening nearby. In the future, I'll provide more tailored outdoor recommendations.`;
      }
      else if (userMessageLower.includes('plan') || userMessageLower.includes('itinerary') || userMessageLower.includes('schedule')) {
        aiResponseText = `I'd love to help you plan a date itinerary! In the current version, you can create your own itinerary by selecting events from the map and adding them to your plan. Soon, I'll be able to generate complete date plans based on your preferences, time available, and budget.`;
      }
      else {
        aiResponseText = `Thanks for your message about "${userMessage.text}". I'm still under development, but I can help you discover events on the map view. Try searching for a location and exploring what's happening there. In future updates, I'll be able to provide more personalized recommendations and detailed answers.`;
      }
      
      const aiMessage: Message = { 
        sender: 'ai', 
        text: aiResponseText,
        timestamp: new Date()
      };
      // --- End Placeholder ---

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error calling AI function:", error);
      const errorMessage: Message = { 
        sender: 'ai', 
        text: 'Sorry, I encountered an error processing your request. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col p-4 pt-20 max-w-3xl mx-auto w-full">
        {/* Chat header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Chat with DateAI</h1>
          <p className="text-muted-foreground">Ask for date ideas, recommendations, or planning help</p>
        </div>
        
        {/* Message display area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 backdrop-blur-sm">
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-lg ${
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {msg.text}
                  <div className={`text-xs mt-1 ${
                    msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              className="flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-lg bg-muted flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask for date ideas..."
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !inputValue.trim()}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
