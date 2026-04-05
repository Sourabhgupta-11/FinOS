import { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { Send, Bot, User, Plus, MessageCircle, Crown, AlertTriangle, Info } from 'lucide-react';
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
  'Old vs new tax regime — which is better?',
];

const INITIAL_MSG = {
  role: 'assistant',
  content: `Namaste! 👋 I'm FinBot, your AI financial advisor.\n\nI can help you with SIPs, mutual funds, tax saving (80C, 80D), emergency funds, insurance, salary planning, and more — all personalised for India.\n\nWhat would you like to know today?\n\n---\n⚠️ *Disclaimer: I am an AI. All information is for educational purposes only. Please do your own research and consult a SEBI-registered advisor before making financial decisions.*`,
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 chat-message-enter">
      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <Bot size={14} className="text-blue-600 dark:text-blue-400" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="typing-dot text-gray-400" /><span className="typing-dot text-gray-400" /><span className="typing-dot text-gray-400" />
      </div>
    </div>
  );
}

function Message({ role, content }) {
  const isUser = role === 'user';
  // Render disclaimer in italic
  const parts = content.split('---');
  return (
    <div className={`flex items-end gap-2.5 chat-message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-blue-600' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-600 dark:text-blue-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl text-sm leading-relaxed
        ${isUser ? 'bg-blue-600 text-white rounded-br-sm px-4 py-3' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm overflow-hidden'}`}>
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div>
            <div className="px-4 py-3 whitespace-pre-wrap">{parts[0]}</div>
            {parts[1] && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                <span>{parts[1].replace(/[*⚠️]/g, '').trim()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const { plan, aiLimit } = usePremium();
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [usage, setUsage] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { api.get('/advisor/history').then(r => setSessions(r.data.sessions || [])).catch(() => {}); }, []);

  const limitLabel = aiLimit === -1 ? 'Unlimited' : `${aiLimit}/day`;
  const usedToday  = usage?.used || 0;
  const showBar    = aiLimit !== -1;

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading || rateLimited) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/advisor/chat', { message: msg, sessionId });
      if (!sessionId) setSessionId(res.data.sessionId);
      if (res.data.usage) setUsage(res.data.usage);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'RATE_LIMIT') {
        setRateLimited(true);
        setMessages(prev => [...prev, { role: 'assistant', content: `You've used all ${data.limit} daily messages on the ${data.plan} plan.\n\n${plan === 'free' ? 'Upgrade to Pro for 50 messages/day or Premium for unlimited.' : 'Upgrade to Premium for unlimited messages.'}` }]);
        setUsage({ used: data.used, limit: data.limit, plan: data.plan });
      } else if (err.response?.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm a little busy right now. Please try again in a moment." }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => {
    setMessages([INITIAL_MSG]);
    setSessionId(null);
    setInput('');
    setRateLimited(false);
    setShowSessions(false);
  };

  const loadSession = async (sid) => {
    try {
      const res = await api.get(`/advisor/history/${sid}`);
      setMessages(res.data.messages?.length ? res.data.messages : [INITIAL_MSG]);
      setSessionId(sid);
      setShowSessions(false);
    } catch { setShowSessions(false); }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Advisor</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {usedToday}/{limitLabel === 'Unlimited' ? '∞' : aiLimit} messages today
            </span>
            {plan !== 'premium' && (
              <Link to="/subscription" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                <Crown size={10} /> Upgrade for more
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {sessions.length > 0 && (
            <button onClick={() => setShowSessions(p => !p)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <MessageCircle size={12} /> History
            </button>
          )}
          <button onClick={newChat} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      {/* Usage bar */}
      {showBar && (
        <div className="mb-2 progress-bar" style={{ height: 3 }}>
          <div className="progress-fill" style={{
            width: `${Math.min((usedToday / aiLimit) * 100, 100)}%`,
            background: usedToday >= aiLimit ? '#ef4444' : usedToday >= aiLimit * 0.8 ? '#f59e0b' : '#3b82f6',
          }} />
        </div>
      )}

      {/* AI disclaimer banner */}
      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl">
        <Info size={13} className="text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>AI Disclaimer:</strong> FinBot uses historical data and general principles. Results are not personalised financial advice. Always verify and consult a SEBI-registered advisor before investing.
        </p>
      </div>

      {/* Rate limit upgrade */}
      {rateLimited && (
        <div className="mb-3 card border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-amber-500" />
            <span className="text-sm text-amber-800 dark:text-amber-300">Daily limit reached ({plan} plan)</span>
          </div>
          <Link to="/subscription" className="btn-primary text-xs py-1.5 px-3 bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
            <Crown size={11} /> Upgrade
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

      {/* Quick chips */}
      {messages.length <= 1 && !rateLimited && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_CHIPS.slice(0, 4).map(chip => (
            <button key={chip} onClick={() => send(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700
                         text-gray-600 dark:text-gray-400
                         hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400
                         hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input ref={inputRef} className="input flex-1"
          placeholder={rateLimited ? 'Upgrade to continue chatting…' : 'Ask about SIP, taxes, mutual funds, insurance…'}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading || rateLimited} />
        <button className="btn-primary px-4 flex items-center gap-2 flex-shrink-0"
          onClick={() => send()} disabled={loading || !input.trim() || rateLimited}>
          <Send size={15} />
          <span className="hidden sm:inline text-sm">Send</span>
        </button>
      </div>
    </div>
  );
}
