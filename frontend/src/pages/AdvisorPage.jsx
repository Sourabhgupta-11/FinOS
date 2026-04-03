import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { Send, Bot, User, Plus, MessageCircle } from 'lucide-react';

const QUICK_CHIPS = [
  'How should I start my first SIP?',
  'Best tax saving options under 80C?',
  'How much emergency fund do I need?',
  'Index fund vs active mutual fund?',
  'How to plan for early retirement in India?',
  'Is it better to pay off home loan or invest?',
  'What is NPS and should I invest in it?',
  'How to invest ₹10,000 per month?',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-blue-600" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2.5 chat-message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-blue-600' : 'bg-blue-100'}`}>
        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-blue-600" />
        }
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
        {content}
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Namaste! 👋 I\'m FinBot, your AI financial advisor specialised in Indian personal finance.\n\nI can help you with SIPs, mutual funds, tax saving (80C, 80D), emergency funds, insurance, salary allocation, and more.\n\nWhat would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    api.get('/advisor/history').then(r => setSessions(r.data.sessions || [])).catch(() => {});
  }, []);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await api.post('/advisor/chat', { message: msg, sessionId });
      if (!sessionId) setSessionId(res.data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.response?.status === 429
          ? 'I\'m getting too many requests right now. Please wait a moment and try again.'
          : 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Starting a new conversation! What financial question can I help you with today?',
    }]);
    setSessionId(null);
    setInput('');
    setShowSessions(false);
  };

  const loadSession = async (sid) => {
    try {
      const res = await api.get(`/advisor/history/${sid}`);
      setMessages(res.data.messages);
      setSessionId(sid);
      setShowSessions(false);
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI Advisor</h1>
          <p className="text-gray-400 text-sm mt-0.5">Ask anything about Indian personal finance</p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              onClick={() => setShowSessions(p => !p)}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <MessageCircle size={15} />
              History
            </button>
          )}
          <button onClick={newChat} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Plus size={15} />
            New chat
          </button>
        </div>
      </div>

      {/* Session history dropdown */}
      {showSessions && sessions.length > 0 && (
        <div className="card mb-4 max-h-48 overflow-y-auto space-y-1">
          {sessions.map(s => (
            <button key={s.id} onClick={() => loadSession(s.id)}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <span className="truncate text-gray-700">{s.title || 'Conversation'}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{s.message_count} msgs</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 card overflow-y-auto space-y-4 p-4" style={{ minHeight: 0 }}>
        {messages.map((m, i) => <ChatMessage key={i} {...m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips — only show at start */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_CHIPS.slice(0, 4).map(chip => (
            <button key={chip} onClick={() => sendMessage(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600
                         hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors">
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Ask about SIP, tax saving, mutual funds, insurance..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          disabled={loading}
        />
        <button
          className="btn-primary px-4 flex items-center gap-2"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          <Send size={16} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}
