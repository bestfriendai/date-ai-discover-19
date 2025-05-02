
import { useState, useCallback, useEffect, useRef } from 'react';
import { callPerplexityAPI, ChatMessage, extractEventsFromResponse } from '@/services/perplexityService';
import { Event } from '@/types';
import { toast } from '@/hooks/use-toast';

// Define the system prompt for Perplexity
const SYSTEM_PROMPT = `You are an AI assistant that helps users find events and activities.
When users ask about events, provide detailed information about relevant events including:
- Event title
- Date and time
- Location/venue
- Description
- Category (e.g., concert, sports, food, etc.)

If you know specific events that match the user's request, format them as JSON inside a code block like this:
\`\`\`json
[
  {
    "title": "Event Name",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "location": "Venue Name, City, State",
    "description": "Brief description of the event",
    "category": "event category",
    "coordinates": [longitude, latitude]
  }
]
\`\`\`

Always include coordinates when you know them. The coordinates should be in the format [longitude, latitude].
If you don't know the exact coordinates, you can provide approximate coordinates for the city or venue.

For example, here are some approximate coordinates for major cities:
- New York City: [-74.006, 40.7128]
- Los Angeles: [-118.2437, 34.0522]
- Chicago: [-87.6298, 41.8781]
- Washington DC: [-77.0369, 38.9072]
- San Francisco: [-122.4194, 37.7749]

When the user asks about events in a specific location, always try to include at least 3-5 events with coordinates.

Remember the user's preferences and previous questions during this conversation.
Be helpful, concise, and focus on providing accurate event information.`;

export const useChatWithEvents = () => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      content: "Hi there! I'm your event discovery assistant. Ask me about events, activities, or things to do in any location, and I'll help you find them. What are you looking for today?",
      timestamp: new Date()
    }
  ]);

  // Events state
  const [extractedEvents, setExtractedEvents] = useState<Event[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Session storage for chat history
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  // Load chat history from session storage on initial load
  useEffect(() => {
    const savedHistory = sessionStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          // Convert string timestamps back to Date objects
          const formattedHistory = parsedHistory.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedHistory);
          chatHistoryRef.current = formattedHistory;
        }
      } catch (error) {
        console.error('Error parsing chat history from session storage:', error);
      }
    }
  }, []);

  // Save chat history to session storage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('chatHistory', JSON.stringify(messages));
      chatHistoryRef.current = messages;
    }
  }, [messages]);

  // Function to send a message to the Perplexity API
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Add user message to chat
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Convert chat history to Perplexity API format with proper typing
      const perplexityMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistoryRef.current.map(msg => ({
          role: msg.role === 'ai' ? 'assistant' as const : 'user' as const,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Call Perplexity API
      const response = await callPerplexityAPI(perplexityMessages);

      // Extract events from the response
      const events = extractEventsFromResponse(response);

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update extracted events if any were found
      if (events.length > 0) {
        setExtractedEvents(events);
        toast({
          title: `Found ${events.length} events`,
          description: "Events have been added to the map",
        });
      }

    } catch (error) {
      console.error('Error sending message to Perplexity:', error);

      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to clear chat history
  const clearChat = useCallback(() => {
    const initialMessage: ChatMessage = {
      role: 'ai',
      content: "Hi there! I'm your event discovery assistant. Ask me about events, activities, or things to do in any location, and I'll help you find them. What are you looking for today?",
      timestamp: new Date()
    };

    setMessages([initialMessage]);
    setExtractedEvents([]);
    sessionStorage.removeItem('chatHistory');
    chatHistoryRef.current = [initialMessage];
  }, []);

  return {
    messages,
    isLoading,
    extractedEvents,
    sendMessage,
    clearChat
  };
};
