import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { Send, Bot, User, Plus, MessageCircle, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePremium } from '../hooks/usePremium';

const QUICK_CHIPS = [
  'How do I start a SIP with ₹5,000/month?',
  'Best tax saving options under 80C?',
  'How much emergency fund do I need?',
  'Index fund vs active mutual fund?',
  'How to plan for early retirement?',
  'Should I pay off home loan or invest?',
  'What is NPS and should I invest?',
  'Old regime vs new regime — which is better?',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 chat-message-enter">
      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot text-gray-400" />
        <span className="typing-dot text-gray-400" />
        <span className="typing-dot text-gray-400" />
      </div>
    </div>
  );
}

function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2.5 chat-message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-blue-600' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-blue-600 dark:text-blue-400" />}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'}`}>
        {content}
      </div>
    </div>
  );
}

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Namaste! 👋 I\'m FinBot, your AI financial advisor.\n\nI can help you with SIPs, mutual funds, tax saving, emergency funds, insurance, salary planning, and more — all tailored for India.\n\nWhat would you like to know today?',
};

export default function AdvisorPage() {
  const { plan, isFree } = usePremium();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [usage, setUsage] = useState(null); // { used, limit, plan }
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    api.get('/advisor/history').then(r => setSessions(r.data.sessions || [])).catch(() => {});
  }, []);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading || rateLimited) return;
    setInput('');

    // Append user message immediately
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await api.post('/advisor/chat', { message: msg, sessionId });
      if (!sessionId) setSessionId(res.data.sessionId);
      if (res.data.usage) setUsage(res.data.usage);

      // Append assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'RATE_LIMIT') {
        setRateLimited(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `You've used all ${data.limit} daily messages on the ${data.plan} plan.\n\nUpgrade to Pro for 100 messages/day, or Premium for unlimited.`,
        }]);
        setUsage({ used: data.used, limit: data.limit, plan: data.plan });
      } else if (err.response?.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'I\'m a bit busy right now. Please try again in a moment.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setSessionId(null);
    setInput('');
    setRateLimited(false);
    setShowSessions(false);
  };

  const loadSession = async (sid) => {
    try {
      const res = await api.get(`/advisor/history/${sid}`);
      const msgs = res.data.messages;
      // Build alternating message array
      setMessages(msgs.length > 0 ? msgs : [INITIAL_MESSAGE]);
      setSessionId(sid);
      setShowSessions(false);
    } catch { setShowSessions(false); }
  };

  const LIMIT = { free: 5, pro: 100, premium: -1 }[plan] || 5;
  const usedToday = usage?.used || 0;
  const showUsageBar = LIMIT !== -1;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Advisor</h1>
          {showUsageBar && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {usedToday}/{LIMIT} messages used today
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button onClick={() => setShowSessions(p => !p)}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <MessageCircle size={13} /> History
            </button>
          )}
          <button onClick={newChat}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus size={13} /> New chat
          </button>
        </div>
      </div>

      {/* Usage bar */}
      {showUsageBar && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((usedToday / LIMIT) * 100, 100)}%`,
                background: usedToday >= LIMIT ? '#ef4444' : usedToday >= LIMIT * 0.8 ? '#f59e0b' : '#3b82f6',
              }} />
          </div>
        </div>
      )}

      {/* Rate limit upgrade prompt */}
      {rateLimited && (
        <div className="mb-3 card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-amber-500" />
            <span className="text-sm text-amber-800 dark:text-amber-300">Daily limit reached</span>
          </div>
          <Link to="/subscription" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 bg-amber-500 hover:bg-amber-600">
            <Crown size={12} /> Upgrade
          </Link>
        </div>
      )}

      {/* Session history */}
      {showSessions && sessions.length > 0 && (
        <div className="card mb-3 max-h-36 overflow-y-auto space-y-0.5 py-3">
          {sessions.map(s => (
            <button key={s.id} onClick={() => loadSession(s.id)}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between">
              <span className="truncate text-gray-700 dark:text-gray-300">{s.title || 'Conversation'}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{s.message_count} msgs</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 card overflow-y-auto space-y-4 p-4 dark:bg-gray-900" style={{ minHeight: 0 }}>
        {messages.map((m, i) => <Message key={i} {...m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips — only show at start */}
      {messages.length <= 1 && !rateLimited && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_CHIPS.slice(0, 4).map(chip => (
            <button key={chip} onClick={() => sendMessage(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700
                         text-gray-600 dark:text-gray-400
                         hover:border-blue-300 dark:hover:border-blue-600
                         hover:text-blue-700 dark:hover:text-blue-400
                         hover:bg-blue-50 dark:hover:bg-blue-900/20
                         transition-colors">
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
          placeholder={rateLimited ? 'Upgrade to continue chatting…' : 'Ask about SIP, taxes, mutual funds, insurance…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={loading || rateLimited}
        />
        <button
          className="btn-primary px-4 flex items-center gap-2 flex-shrink-0"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim() || rateLimited}
        >
          <Send size={15} />
          <span className="hidden sm:inline text-sm">Send</span>
        </button>
      </div>
    </div>
  );
}
