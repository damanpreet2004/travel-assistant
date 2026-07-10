import { useState } from 'react';
import { sendChatMessage } from '../api/chatApi';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message) => {
    setLoading(true);
    const response = await sendChatMessage(message);
    setMessages((prev) => [...prev, { role: 'assistant', content: response.message || 'Done' }]);
    setLoading(false);
  };

  return { messages, loading, sendMessage };
}
