
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Chat, type Content } from '@google/genai';
import { Message, Sender } from './types';
import Header from './components/Header';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import { GEMINI_MODE } from './constants';

const IS_PREVIEW_MODE = GEMINI_MODE === 'PREVIEW';
let ai: GoogleGenAI | null = null;
let apiKeyMissing = false;

if (IS_PREVIEW_MODE) {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    console.error("API_KEY environment variable not set for PREVIEW mode.");
    apiKeyMissing = true;
  } else {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (IS_PREVIEW_MODE && apiKeyMissing) {
      return [{
        id: 'api-key-error',
        text: 'Welcome! To use this chatbot in preview mode, please set the `API_KEY` environment variable.',
        sender: Sender.Bot,
      }];
    }
    return [{
      id: 'initial-message',
      text: "Hello! I'm your friendly Gemini assistant. How can I help you today?",
      sender: Sender.Bot,
    }];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<Chat | null>(null);
  const isChatDisabled = IS_PREVIEW_MODE && apiKeyMissing;

  const initializeChat = useCallback(() => {
    if (IS_PREVIEW_MODE && !chatRef.current && ai) {
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a helpful and friendly chatbot. Your name is Gemini.',
        },
      });
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isChatDisabled) return;

    const userMessage: Message = { id: Date.now().toString(), text, sender: Sender.User };
    const currentHistory = [...messages]; // History before adding the new message

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    // Add a placeholder for the bot's response immediately
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: botMessageId, text: '', sender: Sender.Bot },
    ]);

    try {
      let accumulatedText = '';
      if (IS_PREVIEW_MODE) {
        // --- PREVIEW MODE LOGIC (Direct API call) ---
        if (!ai) throw new Error("Gemini AI client not initialized.");
        initializeChat();
        if (!chatRef.current) throw new Error("Chat not initialized.");

        const stream = await chatRef.current.sendMessageStream({ message: text });

        for await (const chunk of stream) {
          accumulatedText += chunk.text;
          setMessages((prev) => prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: accumulatedText } : msg
          ));
        }
      } else {
        // --- VERCEL MODE LOGIC (Proxy serverless function) ---
        const historyForServer: Content[] = currentHistory.map((msg): Content => ({
          role: msg.sender === Sender.User ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: historyForServer,
            message: text,
          }),
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulatedText += decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: accumulatedText } : msg
          ));
        }
      }

      if (accumulatedText.length === 0) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === botMessageId ? { ...msg, text: "I'm sorry, I couldn't generate a response. Please try again." } : msg
        ));
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessageText = error instanceof Error ? error.message : 'Sorry, something went wrong.';
      setMessages((prev) => prev.map((msg) =>
        msg.id === botMessageId ? { ...msg, text: `Error: ${errorMessageText}` } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (IS_PREVIEW_MODE) {
      initializeChat();
    }
  }, [initializeChat]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <Header />
      <MessageList messages={messages} isLoading={isLoading} />
      <div className="px-4 pb-4 sm:px-6 lg:px-8 bg-gray-900">
         <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={isChatDisabled} />
      </div>
    </div>
  );
};

export default App;
