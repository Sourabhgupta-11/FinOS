import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Check, X, ArrowRight, Shield, Flame, ChevronDown, Plus, Minus } from "lucide-react";

/* ═══════════════════════════════
   SCROLL PROGRESS
═══════════════════════════════ */
function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const fn = () => {
      const d = document.documentElement;
      setP((d.scrollTop / (d.scrollHeight - d.clientHeight)) * 100);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,height:"2px",zIndex:9999,background:"rgba(255,255,255,0.05)" }}>
      <div style={{ height:"100%",width:`${p}%`,background:"linear-gradient(90deg,#F5A623,#FFD580,#F5A623)",backgroundSize:"200% 100%",animation:"shimmer 2s linear infinite",borderRadius:"0 2px 2px 0",transition:"width 0.08s linear" }} />
    </div>
  );
}

/* ═══════════════════════════════
   LIVE WAVE DIVIDER (canvas) — flowing animated separator
═══════════════════════════════ */
function WaveDivider({ toColor, variant = "wave" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let t = 0;
    let dpr = Math.max(window.devicePixelRatio || 1, 1);

    const resize = () => {
      dpr = Math.max(window.devicePixelRatio || 1, 1);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const yAt = (x, W, H) => {
      if (variant === "wave") return H*0.45 + Math.sin((x/W)*Math.PI*2.2+t)*H*0.18 + Math.sin((x/W)*Math.PI*3.8+t*1.3)*H*0.09 + Math.sin((x/W)*Math.PI*1.1+t*0.7)*H*0.06;
      if (variant === "ripple") return H*0.5 + Math.sin((x/W)*Math.PI*4+t*1.5)*H*0.14 + Math.cos((x/W)*Math.PI*2+t*0.9)*H*0.10;
      return H*0.4 + Math.sin((x/W)*Math.PI*1.5+t*0.8)*H*0.22 + Math.sin((x/W)*Math.PI*3+t*1.2)*H*0.08;
    };

    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Fill area under the wave with toColor (next section's bg)
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) ctx.lineTo(x, yAt(x, W, H));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = toColor;
      ctx.fill();

      // Gold shimmer line along the crest
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = yAt(x, W, H);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(245,166,35,0)");
      g.addColorStop(0.3, "rgba(245,166,35,0.45)");
      g.addColorStop(0.6, "rgba(255,213,128,0.6)");
      g.addColorStop(1, "rgba(245,166,35,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      t += 0.008;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [toColor, variant]);

  return (
    <div className="wave-divider">
      <canvas ref={canvasRef} className="wave-canvas" />
    </div>
  );
}

/* ═══════════════════════════════
   HERO PARTICLES
═══════════════════════════════ */
function HeroParticles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      vx: (Math.random()-0.5)*0.22, vy: (Math.random()-0.5)*0.22,
      r: Math.random()*1.8+0.4, a: Math.random()*0.3+0.07,
    }));
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(245,166,35,${p.a})`; ctx.fill();
      });
      pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<100){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle=`rgba(245,166,35,${0.08*(1-d/100)})`; ctx.lineWidth=0.5; ctx.stroke(); }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0 }} />;
}

/* ═══════════════════════════════
   TYPEWRITER
═══════════════════════════════ */
function Typewriter({ words }) {
  const [idx,setIdx]=useState(0); const [txt,setTxt]=useState(""); const [del,setDel]=useState(false);
  useEffect(() => {
    const w = words[idx % words.length];
    const id = setTimeout(() => {
      if (!del) { setTxt(w.slice(0,txt.length+1)); if(txt.length+1===w.length) setTimeout(()=>setDel(true),1900); }
      else { setTxt(w.slice(0,txt.length-1)); if(txt.length===0){setDel(false); setIdx(i=>i+1);} }
    }, del?36:82);
    return () => clearTimeout(id);
  }, [txt,del,idx,words]);
  return <span className="tw">{txt}<span className="tw-c"/></span>;
}

/* ═══════════════════════════════
   REVEAL
═══════════════════════════════ */
function Reveal({ children, delay=0, className="" }) {
  const ref=useRef(null); const [v,setV]=useState(false);
  useEffect(() => {
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);obs.disconnect();}},{threshold:0.07});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  }, []);
  return <div ref={ref} className={`rv ${v?"rv-in":""} ${className}`} style={{transitionDelay:`${delay}ms`}}>{children}</div>;
}

/* ═══════════════════════════════
   HERO CARD
═══════════════════════════════ */
function HeroCard() {
  const circ = 2*Math.PI*20;
  return (
    <div className="hcard-wrap">
      <div className="hcard-notif">
        <span className="hcard-notif-dot"/><span>FinBot: Your SIP of ₹5,000 is now active 🎉</span>
      </div>
      <div className="hcard">
        <div className="hcard-top">
          <div>
            <div className="hcard-eyebrow">NET WORTH</div>
            <div className="hcard-val">₹25,00,000</div>
            <div className="hcard-sub">Assets ₹50L · Liabilities ₹25L</div>
          </div>
          <div className="hcard-score-wrap">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5"/>
              <circle cx="26" cy="26" r="20" fill="none" stroke="#F5A623" strokeWidth="3.5"
                strokeDasharray={`${circ*0.72} ${circ*0.28}`} strokeLinecap="round" transform="rotate(-90 26 26)"/>
              <text x="26" y="30" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Sora,sans-serif">72</text>
            </svg>
            <div className="hcard-score-lbl">Score</div>
          </div>
        </div>
        <div className="hcard-grid">
          {[["Liquid assets","₹0","dim"],["Investments","₹0","dim"],["Physical assets","₹50,00,000","gld"],["Total debt","₹25,00,000","red"]].map(([l,v,t])=>(
            <div key={l} className="hcard-cell">
              <div className="hcard-cell-lbl">{l}</div>
              <div className={`hcard-cell-val hcv-${t}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="hcard-spark">
          <svg viewBox="0 0 220 36" style={{width:"100%",height:"36px"}}>
            <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25"/><stop offset="100%" stopColor="#F5A623" stopOpacity="0"/>
            </linearGradient></defs>
            <polygon points="0,32 25,28 55,30 85,18 115,22 150,10 185,6 220,2 220,36 0,36" fill="url(#spg)"/>
            <polyline points="0,32 25,28 55,30 85,18 115,22 150,10 185,6 220,2" fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hcard-spark-lbl">↑ +8.4% this month</span>
        </div>
      </div>
      <div className="hcard-chat">
        <div className="hcard-chat-q">How much should I invest in ELSS?</div>
        <div className="hcard-chat-a">🤖 At your bracket, ₹1.5L in ELSS saves ₹46,800 in taxes. I'd spread it across 2 funds.</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   DASHBOARD MOCKUP
═══════════════════════════════ */
function DashboardMockup() {
  const [ci,setCi]=useState(0); const [fading,setFading]=useState(false);
  const CHATS = [
    {q:"How do I start a SIP with ₹5,000/month?",a:"Open a demat on Zerodha or Kuvera. Start with UTI Nifty 50 Index Fund — low cost, market returns, zero guesswork."},
    {q:"Where does my salary go each month?",a:"34% on food & transport. Trimming ₹3K/month adds ₹36,000/year to savings — want a revised budget?"},
    {q:"Old or new tax regime — which saves more?",a:"With 80C + HRA at your bracket, old regime saves ₹18,200 more. Here's the full breakdown."},
  ];
  useEffect(() => {
    const t = setInterval(() => { setFading(true); setTimeout(()=>{setCi(i=>(i+1)%CHATS.length); setFading(false);},380); }, 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mock">
      <div className="mock-bar">
        <div className="mock-dots"><span/><span/><span/></div>
        <span className="mock-url">fin-os-ten.vercel.app · AI Advisor</span>
        <div className="mock-bar-right"><span className="mock-live-dot"/>Live</div>
      </div>
      <div className="mock-body">
        <div className="mock-side">
          <div className="mock-logo">F<span>inOS</span></div>
          {[["⊞","Dashboard",false],["◎","AI Advisor",true],["◈","Allocator",false],["◉","Expenses",false],["◍","Portfolio",false]].map(([ic,lb,a])=>(
            <div key={lb} className={`mock-nav ${a?"mock-a":""}`}><span className="mock-ic">{ic}</span><span>{lb}</span></div>
          ))}
          <div className="mock-sep"/>
          <div className="mock-nav mock-dim"><span className="mock-ic">◐</span><span>Simulator</span><span className="mock-pro-tag">PRO</span></div>
          <div className="mock-side-foot">
            <div className="mock-av">S</div>
            <div><div className="mock-uname">Sourabh</div><div className="mock-plan">Free plan</div></div>
          </div>
        </div>
        <div className="mock-main">
          <div className="mock-disclaimer">⚠ FinBot provides educational information — not personalised financial advice.</div>
          <div className="mock-intro">
            <span className="mock-bot-ic">🤖</span>
            <div className="mock-intro-msg"><strong>Namaste! I'm FinBot, your AI financial advisor.</strong><br/>Ask me about SIPs, mutual funds, tax saving (80C, 80D), salary planning — all for India.</div>
          </div>
          <div className={`mock-exchange ${fading?"mock-fade":""}`}>
            <div className="mock-user-row"><div className="mock-ubub">{CHATS[ci].q}</div><div className="mock-uav">S</div></div>
            <div className="mock-ai-row"><span className="mock-bic">🤖</span><div className="mock-abub">{CHATS[ci].a}</div></div>
          </div>
          <div className="mock-input-row">
            <input readOnly placeholder="Ask about SIP, taxes, mutual funds…" className="mock-input"/>
            <button className="mock-send-btn">Send ↗</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   NAVBAR — FIXED MOBILE LAYOUT
═══════════════════════════════ */
function Navbar() {
  const [sc,setSc]=useState(false); const [open,setOpen]=useState(false);
  useEffect(() => {
    const fn=()=>setSc(window.scrollY>24);
    window.addEventListener("scroll",fn,{passive:true});
    return ()=>window.removeEventListener("scroll",fn);
  }, []);
  const NAV=[["Features","#features"],["How it works","#how"],["Pricing","#pricing"],["FAQ","#faq"],["Contact","/contact"]];
  return (
    <nav className={`nav ${sc?"nav-sc":""}`}>
      <div className="nav-in">
        <Link to="/" className="nav-brand"><Logo size={30}/><span>FinOS</span></Link>
        <div className="nav-links">{NAV.map(([l,h])=>h.startsWith("#")?<a key={l} href={h} className="nav-lnk">{l}</a>:<Link key={l} to={h} className="nav-lnk">{l}</Link>)}</div>
        <div className="nav-right">
          <Link to="/login" className="nav-si">Sign in</Link>
          <Link to="/register" className="btn-gold btn-sm">Get started free</Link>
        </div>
        <button className="hb" onClick={()=>setOpen(v=>!v)} aria-label="Toggle menu" aria-expanded={open}>
          <span className={open?"o":""}/><span className={open?"o m":""}/><span className={open?"o":""}/>
        </button>
      </div>
      {open&&(
        <div className="mob">
          {NAV.map(([l,h])=>h.startsWith("#")?<a key={l} href={h} className="mob-lnk" onClick={()=>setOpen(false)}>{l}</a>:<Link key={l} to={h} className="mob-lnk" onClick={()=>setOpen(false)}>{l}</Link>)}
          <div className="mob-ctas">
            <Link to="/login" className="btn-ghost btn-sm" onClick={()=>setOpen(false)}>Sign in</Link>
            <Link to="/register" className="btn-gold btn-sm" onClick={()=>setOpen(false)}>Get started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════
   STICKY MOBILE CTA
═══════════════════════════════ */
function MobileStickyCTA() {
  const [show,setShow]=useState(false);
  useEffect(() => {
    const fn=()=>setShow(window.scrollY>520);
    window.addEventListener("scroll",fn,{passive:true});
    return ()=>window.removeEventListener("scroll",fn);
  }, []);
  return (
    <div className={`mcta ${show?"mcta-show":""}`}>
      <div className="mcta-text"><strong>Start free</strong><span>No card needed</span></div>
      <Link to="/register" className="btn-gold btn-sm mcta-btn">Get started <ArrowRight size={14}/></Link>
    </div>
  );
}

/* ═══════════════════════════════
   HERO
═══════════════════════════════ */
function Hero() {
  return (
    <section className="hero">
      <HeroParticles/>
      <div className="hero-orb hero-o1"/><div className="hero-orb hero-o2"/><div className="hero-orb hero-o3"/>
      <div className="C hero-in">
        <div className="hero-text">
          <div className="hero-badge"><span className="badge-dot"/><Flame size={11} style={{color:"#F5A623"}}/>Early access · Special pricing live</div>
          <h1 className="hero-h1">Stop guessing.<br/>Start&nbsp;<Typewriter words={["investing.","saving.","growing.","planning."]}/></h1>
          <p className="hero-sub">FinOS is an AI-powered finance OS built for India. It understands your salary, goals, and tax system — and tells you exactly what to do next.</p>
          <div className="hero-acts">
            <Link to="/register" className="btn-gold btn-lg">Start free — no card needed <ArrowRight size={15}/></Link>
            <a href="#features" className="btn-ghost btn-lg">See what's inside <ChevronDown size={15}/></a>
          </div>
          <div className="hero-trust">
            {[[<Shield size={12}/>,"Bank-grade security"],[<Check size={12}/>,"Free forever plan"],[<Check size={12}/>,"Cancel anytime"]].map(([ic,t],i)=>(
              <div key={i} className="trust-item">{ic}<span>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="hero-vis"><HeroCard/></div>
      </div>
      <div className="stats-bar C-full">
        {[["₹0","Free forever"],["10+","Finance tools"],["AI","Advisor built-in"],["India","Made for ₹"]].map(([v,l])=>(
          <div key={l} className="stat"><div className="stat-v">{v}</div><div className="stat-l">{l}</div></div>
        ))}
      </div>
      <WaveDivider toColor="#0F1829" variant="wave"/>
    </section>
  );
}

/* ═══════════════════════════════
   PRODUCT PREVIEW
═══════════════════════════════ */
/* ═══════════════════════════════
   QUICK CALCULATOR — new interactive widget
   Lets a visitor see a real number before signing up
═══════════════════════════════ */
function QuickCalculator() {
  const [salary, setSalary] = useState(60000);
  const recommended = Math.round(salary * 0.2);
  const yearly = recommended * 12;
  const tenYear = Math.round(yearly * 10 * 1.8); // rough compounding illustration

  return (
    <section className="sec" style={{background:"#0F1829", paddingTop:"64px", paddingBottom:"64px"}}>
      <div className="C">
        <Reveal>
          <div className="calc-card">
            <div className="calc-left">
              <div className="eyebrow">Try it now — no signup</div>
              <h3 className="calc-h3">What should you be investing?</h3>
              <p className="calc-p">Move the slider to your monthly take-home salary. This is the same logic FinOS uses on day one.</p>
              <div className="calc-slider-wrap">
                <div className="calc-slider-label">
                  <span>Monthly salary</span>
                  <span className="calc-slider-val">₹{salary.toLocaleString("en-IN")}</span>
                </div>
                <input
                  type="range" min="15000" max="300000" step="5000" value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="calc-slider"
                />
              </div>
            </div>
            <div className="calc-right">
              <div className="calc-result-row">
                <div className="calc-result-lbl">Recommended monthly investment</div>
                <div className="calc-result-val">₹{recommended.toLocaleString("en-IN")}</div>
              </div>
              <div className="calc-result-row">
                <div className="calc-result-lbl">That's per year</div>
                <div className="calc-result-val calc-result-val--sm">₹{yearly.toLocaleString("en-IN")}</div>
              </div>
              <div className="calc-result-row calc-result-row--highlight">
                <div className="calc-result-lbl">Potential value in 10 years*</div>
                <div className="calc-result-val calc-result-val--gold">₹{tenYear.toLocaleString("en-IN")}</div>
              </div>
              <p className="calc-disclaimer">*Illustrative estimate assuming average equity returns. Not a guarantee — actual returns vary with market conditions.</p>
              <Link to="/register" className="btn-gold btn-lg calc-cta">Get my full plan <ArrowRight size={15}/></Link>
            </div>
          </div>
        </Reveal>
      </div>
      <WaveDivider toColor="#111B2E" variant="ripple"/>
    </section>
  );
}
/* ═══════════════════════════════
   PRODUCT PREVIEW
═══════════════════════════════ */
function ProductPreview() {
  return (
    <section className="sec" style={{background:"#0F1829",paddingTop:"72px",paddingBottom:"64px"}}>
      <div className="C">
        <Reveal>
          <div className="sec-hd">
            <div className="eyebrow">See it in action</div>
            <h2 className="sec-h2">This is your dashboard from day one.</h2>
            <p className="sec-sub">Real conversations. Real advice. Not a prototype — this is the live product you get the moment you sign up.</p>
          </div>
        </Reveal>
        <Reveal delay={70}><DashboardMockup/></Reveal>
      </div>
      <WaveDivider toColor="#111B2E" variant="ripple"/>
    </section>
  );
}

/* ═══════════════════════════════
   FEATURES
═══════════════════════════════ */
const FEATS = [
  {e:"🤖",t:"AI Financial Advisor",d:"Ask anything — SIPs, 80C, tax regime, loan EMI. Advice tuned to your income and India's rules.",tag:"Free",tc:"em"},
  {e:"📊",t:"Salary Allocator",d:"Enter your salary. FinOS splits it optimally across needs, investments, and savings.",tag:"Free",tc:"em"},
  {e:"🧮",t:"Decision Simulator",d:"Model any financial decision before you commit — loans, job changes, big purchases.",tag:"Pro",tc:"bl"},
  {e:"💳",t:"Expense Tracker",d:"Log and categorise spending. See patterns, find waste, export to CSV anytime.",tag:"Pro",tc:"bl"},
  {e:"📈",t:"Portfolio Tracker",d:"Mutual funds, stocks, FDs — unified with live NSE prices and net worth dashboard.",tag:"Premium",tc:"gd"},
  {e:"📑",t:"Tax Calculator",d:"Old vs new regime side by side. Find every deduction you're missing instantly.",tag:"Premium",tc:"gd"},
  {e:"🎯",t:"Budget Manager",d:"Set limits by category. Alerts at 80% and 100% — never silently overshoot.",tag:"Premium",tc:"gd"},
  {e:"🏦",t:"Bank Linking",d:"Connect your bank via Setu Account Aggregator. Auto-import transactions — no manual entry.",tag:"Pro",tc:"bl",soon:true},
];

function Features() {
  return (
    <section id="features" className="sec" style={{background:"#111B2E"}}>
      <div className="C">
        <Reveal>
          <div className="sec-hd">
            <div className="eyebrow">Everything you need</div>
            <h2 className="sec-h2">One dashboard.<br/>Your entire financial life.</h2>
            <p className="sec-sub">Each tool works alone. Together they give you something a spreadsheet never can — full picture with AI context.</p>
          </div>
        </Reveal>
        <div className="feats-grid">
          {FEATS.map((f,i)=>(
            <Reveal key={f.t} delay={i*38}>
              <div className={`feat ${f.soon?"feat-soon":""}`}>
                {f.soon&&<span className="soon-badge">Coming soon</span>}
                <div className="feat-top"><span className="feat-ic">{f.e}</span><span className={`tag tag-${f.tc}`}>{f.tag}</span></div>
                <h3 className="feat-title">{f.t}</h3>
                <p className="feat-desc">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <WaveDivider toColor="#0B1120" variant="peak"/>
    </section>
  );
}

/* ═══════════════════════════════
   HOW IT WORKS
═══════════════════════════════ */
const STEPS = [
  {n:"01",t:"Create your account",d:"Sign up with Google or email in 30 seconds. No payment details, no KYC.",note:"Google Sign-In means one click and you're straight to your dashboard."},
  {n:"02",t:"Tell FinOS about yourself",d:"Monthly income, savings rate, goals. Just a few numbers — no forms.",note:"The AI uses this to personalise every recommendation from day one."},
  {n:"03",t:"Get your financial plan",d:"FinOS immediately shows where your money should go and what you're missing.",note:"Salary split, investment mix, tax optimisation — ready instantly."},
  {n:"04",t:"Track, ask, improve",d:"Log expenses, chat with your advisor, run simulations whenever you need clarity.",note:"Most users spot their first financial blind spot within 10 minutes."},
];

function HowItWorks() {
  return (
    <section id="how" className="sec" style={{background:"#0B1120"}}>
      <div className="C">
        <Reveal><div className="sec-hd"><div className="eyebrow">Simple to start</div><h2 className="sec-h2">From sign-up to clarity<br/>in under 5 minutes.</h2></div></Reveal>
        <div className="how-grid">
          {STEPS.map((s,i)=>(
            <Reveal key={s.n} delay={i*85}>
              <div className="how-card">
                <div className="how-num">{s.n}</div>
                <h3 className="how-title">{s.t}</h3>
                <p className="how-desc">{s.d}</p>
                <p className="how-note">{s.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <WaveDivider toColor="#111B2E" variant="wave"/>
    </section>
  );
}

/* ═══════════════════════════════
   PRICING
═══════════════════════════════ */
const PLANS = [
  {key:"free",name:"Free",price:"₹0",period:"forever",tl:"Genuinely useful — not a teaser.",
   feats:["Salary Allocator","AI Advisor (3 chats/day)","Financial Health Score","Net Worth Dashboard","Goals & Liabilities tracker"],
   miss:["Decision Simulator","Expense Tracker","Tax Calculator","Budget Manager","Portfolio Tracker"],
   cta:"Start for free",s:"ghost"},
  {key:"pro",name:"Pro",price:"₹99",orig:"₹199",period:"/month",tl:"For people getting serious about money.",
   badge:"50% off · Launch offer",rec:true,
   feats:["Everything in Free","AI Advisor (50 chats/day)","Decision Simulator","Expense Tracker + CSV","Allocation history","Push notifications","Bank account linking"],
   miss:["Tax Calculator","Budget Manager","Portfolio Tracker"],
   cta:"Start Pro",s:"blue"},
  {key:"premium",name:"Premium",price:"₹199",orig:"₹399",period:"/month",tl:"The full picture, nothing held back.",
   badge:"50% off · Launch offer",
   feats:["Everything in Pro","Unlimited AI Advisor","Tax Calculator (old vs new)","Budget Manager + alerts","Portfolio Tracker (live NSE)","Priority support"],
   miss:[],
   cta:"Start Premium",s:"gold"},
];

function Pricing() {
  return (
    <section id="pricing" className="sec" style={{background:"#111B2E"}}>
      <div className="C">
        <Reveal>
          <div className="sec-hd">
            <div className="eyebrow">Honest pricing</div>
            <h2 className="sec-h2">Start free.<br/>Upgrade when it earns it.</h2>
            <p className="sec-sub">No trials that expire. No hidden fees. The free plan is genuinely useful — not a teaser.</p>
          </div>
        </Reveal>
        <div className="price-grid">
          {PLANS.map((p,i)=>(
            <Reveal key={p.key} delay={i*55}>
              <div className={`plan plan-${p.s} ${p.rec?"plan-rec":""}`}>
                {p.rec&&<div className="rec-badge">Most popular</div>}
                <div className="plan-hd">
                  <div className="plan-name">{p.name}</div>
                  <div className="plan-pr-row"><span className="plan-pr">{p.price}</span>{p.orig&&<span className="plan-orig">{p.orig}</span>}<span className="plan-period">{p.period}</span></div>
                  {p.badge&&<div className="plan-badge">{p.badge}</div>}
                  <p className="plan-tl">{p.tl}</p>
                </div>
                <ul className="plan-list">
                  {p.feats.map(f=><li key={f} className="pl pl-y"><Check size={12}/>{f}</li>)}
                  {p.miss.map(f=><li key={f} className="pl pl-n"><X size={12}/>{f}</li>)}
                </ul>
                <Link to="/register" className={`plan-cta plan-cta-${p.s}`}>{p.cta} <ArrowRight size={13}/></Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="price-note">Launch pricing applies to your first 6 months. Cancel any time — no questions asked.</p></Reveal>
      </div>
      <WaveDivider toColor="#060D1A" variant="ripple"/>
    </section>
  );
}

/* ═══════════════════════════════
   WHY FINOS — with comparison
═══════════════════════════════ */
function WhyFinOS() {
  return (
    <section className="sec" style={{background:"#060D1A"}}>
      <div className="C">
        <div className="why-grid">
          <Reveal>
            <div className="eyebrow">Why we built this</div>
            <h2 className="why-h2">Most Indians earn well.<br/><span className="gold-text">Few invest right.</span></h2>
            <p className="why-p">We kept seeing the same pattern — smart, employed people with savings sitting idle because finance felt complicated. Advisors are expensive. Spreadsheets are tedious. Apps are shallow.</p>
            <p className="why-p">FinOS is what we wished existed. A tool that understands your income, your goals, India's rules — and tells you what to do next, clearly.</p>

            {/* Before/After comparison strip */}
            <div className="compare-strip">
              <div className="compare-col compare-without">
                <div className="compare-head">Without FinOS</div>
                <div className="compare-row"><X size={13}/>Savings idle in a bank account</div>
                <div className="compare-row"><X size={13}/>No idea how taxes actually work</div>
                <div className="compare-row"><X size={13}/>Guessing at every big decision</div>
              </div>
              <div className="compare-col compare-with">
                <div className="compare-head compare-head-g">With FinOS</div>
                <div className="compare-row compare-row-g"><Check size={13}/>Money allocated with a clear plan</div>
                <div className="compare-row compare-row-g"><Check size={13}/>Tax regime optimised automatically</div>
                <div className="compare-row compare-row-g"><Check size={13}/>AI models the decision before you make it</div>
              </div>
            </div>

            <Link to="/register" className="btn-gold btn-lg" style={{marginTop:"28px",display:"inline-flex"}}>Try it free <ArrowRight size={15}/></Link>
          </Reveal>
          <div className="why-cards">
            {[
              {e:"💸",s:"₹2.1L",l:"Average Indian loses per year by leaving savings in a low-yield account"},
              {e:"📉",s:"68%",l:"Of salaried Indians have zero equity exposure in their investment portfolio"},
              {e:"🧾",s:"₹40K+",l:"Average tax overpayment annually due to choosing the wrong tax regime"},
            ].map(({e,s,l},i)=>(
              <Reveal key={s} delay={i*75}>
                <div className="why-card"><span className="why-ic">{e}</span><div><div className="why-stat">{s}</div><div className="why-lbl">{l}</div></div></div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider toColor="#101828" variant="peak"/>
    </section>
  );
}

/* ═══════════════════════════════
   FAQ — new section
═══════════════════════════════ */
const FAQS = [
  { q:"Is my financial data actually safe?", a:"Yes. We use bank-grade encryption for all data in transit and at rest. We never sell your data, and bank linking (when live) uses RBI-licensed Account Aggregators — the same framework banks use to share data with each other. You can delete your account and all data anytime." },
  { q:"Is the free plan really free forever?", a:"Yes, genuinely. No trial period, no credit card required, no auto-charge after 14 days. The Free plan includes the Salary Allocator, AI Advisor, Financial Health Score, and Net Worth Dashboard — permanently, at ₹0." },
  { q:"How is the AI advisor different from ChatGPT?", a:"FinBot is trained specifically on Indian financial rules — Section 80C, HRA exemptions, old vs new tax regime, SEBI-registered fund categories. It also has context on your actual income, goals, and existing investments, so advice is personalised, not generic." },
  { q:"Can I cancel my paid plan anytime?", a:"Yes. Cancel anytime from your account settings — no phone calls, no retention forms. You keep access until the end of your billing period, and we don't charge cancellation fees." },
  { q:"Do I need to link my bank account to use FinOS?", a:"No. Bank linking is optional and currently rolling out. You can use the Salary Allocator, AI Advisor, and most tools by simply entering your numbers manually — nothing is gated behind bank access." },
  { q:"Is this financial advice or just educational content?", a:"FinOS provides educational information based on your data and general financial principles — it is not personalised investment advice from a SEBI-registered advisor. For investment decisions, we always recommend doing your own research or consulting a registered advisor." },
];

function FAQItem({ q, a, isOpen, onClick }) {
  return (
    <div className={`faq-item ${isOpen ? "faq-open" : ""}`}>
      <button className="faq-q" onClick={onClick} aria-expanded={isOpen}>
        <span>{q}</span>
        <span className="faq-icon">{isOpen ? <Minus size={16}/> : <Plus size={16}/>}</span>
      </button>
      <div className="faq-a-wrap" style={{ maxHeight: isOpen ? "200px" : "0px" }}>
        <p className="faq-a">{a}</p>
      </div>
    </div>
  );
}

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="sec" style={{background:"#101828"}}>
      <div className="C">
        <Reveal>
          <div className="sec-hd">
            <div className="eyebrow">Questions, answered</div>
            <h2 className="sec-h2">Before you sign up,<br/>here's what people ask.</h2>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <FAQItem key={f.q} q={f.q} a={f.a} isOpen={openIdx === i} onClick={() => setOpenIdx(openIdx === i ? -1 : i)} />
            ))}
          </div>
        </Reveal>
      </div>
      <WaveDivider toColor="#101828" variant="ripple"/>
    </section>
  );
}

/* ═══════════════════════════════
   CTA
═══════════════════════════════ */
function CTA() {
  return (
    <section className="cta-sec">
      <div className="cta-glow"/>
      <div className="C cta-in">
        <Reveal>
          <div className="cta-badge"><Flame size={12}/>Early access · Special pricing live now</div>
          <h2 className="cta-h2">Your money deserves<br/>better than a savings account.</h2>
          <p className="cta-sub">Create your free account. No credit card. No commitment. See your financial picture in 5 minutes.</p>
          <Link to="/register" className="btn-gold btn-xl">Get started free <ArrowRight size={17}/></Link>
          <div className="cta-trust">
            {["No card required","Free plan always available","Cancel premium anytime"].map(t=>(
              <span key={t} className="cta-ti"><Check size={12}/>{t}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════
   FOOTER
═══════════════════════════════ */
function Footer() {
  return (
    <footer className="ft">
      <div className="C">
        <div className="ft-grid">
          <div>
            <div className="ft-brand"><Logo size={26}/><span>FinOS</span></div>
            <p className="ft-tag">AI-powered financial OS built for India.<br/>Manage, grow, and understand your money.</p>
          </div>
          <div>
            <div className="ft-col-h">Product</div>
            <ul className="ft-links">
              {[["Features","#features"],["Pricing","#pricing"],["How it works","#how"],["FAQ","#faq"],["Sign up free","/register"]].map(([l,h])=>(
                <li key={l}>{h.startsWith("#")?<a href={h}>{l}</a>:<Link to={h}>{l}</Link>}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="ft-col-h">Legal</div>
            <ul className="ft-links">
              {[["Privacy Policy","/privacy"],["Terms & Conditions","/terms"],["Refund Policy","/refund"],["Contact Us","/contact"]].map(([l,h])=>(
                <li key={l}><Link to={h}>{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="ft-bot">
          <span>© {new Date().getFullYear()} FinOS. Made with ♥ in India.</span>
          <div className="ft-status"><span className="st-dot"/>All systems operational</div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════
   CSS
═══════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior:smooth; font-size:16px; }
body { overflow-x:hidden; }

:root {
  --g:#F5A623; --gd:#E09515; --ga:rgba(245,166,35,0.12); --gb:rgba(245,166,35,0.22);
  --b:#3B7BFF; --bd:#2563EB; --ba:rgba(59,123,255,0.12);
  --gr:#10B981; --rd:#EF4444;
  --w:#EEF3FF; --mu:#7A859A; --mu2:rgba(122,133,154,0.4);
  --br:rgba(255,255,255,0.07); --card:rgba(255,255,255,0.04);
  --r:12px; --rs:8px;
}

.lp { background:#0B1120; color:var(--w); font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden; min-height:100vh; }

@keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }

/* ─ Wave divider (canvas, animated) ─ */
.wave-divider { position:relative; height:64px; margin-top:-1px; margin-bottom:-1px; overflow:hidden; }
.wave-canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }

.rv { opacity:0; transform:translateY(20px); transition:opacity 0.6s cubic-bezier(.16,1,.3,1),transform 0.6s cubic-bezier(.16,1,.3,1); width:100%; display:flex; flex-direction:column; align-items:inherit; }
.rv-in { opacity:1; transform:translateY(0); }
.cta-in .rv, .sec-hd { align-items:center; }

.tw { color:var(--g); }
.tw-c { display:inline-block; width:3px; height:0.82em; background:var(--g); margin-left:2px; vertical-align:middle; border-radius:1px; animation:blink 1s step-end infinite; }
@keyframes blink { 50%{opacity:0} }

.btn-gold { display:inline-flex; align-items:center; gap:8px; background:var(--g); color:#0B1120; font-family:'Sora',sans-serif; font-weight:700; border:none; cursor:pointer; border-radius:var(--rs); text-decoration:none; transition:all 0.18s; white-space:nowrap; }
.btn-gold:hover { background:var(--gd); transform:translateY(-2px); box-shadow:0 10px 32px rgba(245,166,35,0.32); }
.btn-ghost { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); color:var(--w); border:1px solid var(--br); font-weight:600; cursor:pointer; border-radius:var(--rs); text-decoration:none; transition:all 0.18s; white-space:nowrap; }
.btn-ghost:hover { background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.15); }
.btn-sm { font-size:13px; padding:8px 16px; }
.btn-lg { font-size:15px; padding:13px 24px; }
.btn-xl { font-size:17px; padding:15px 38px; border-radius:var(--r); }

.C { max-width:1200px; margin:0 auto; padding:0 24px; width:100%; }
.C-full { max-width:1200px; margin:0 auto; padding:0 24px; width:100%; }
.sec { padding:88px 0 72px; position:relative; }
.sec-hd { text-align:center; margin-bottom:52px; display:flex; flex-direction:column; align-items:center; }
.sec-h2 { font-family:'Sora',sans-serif; font-size:clamp(28px,3.6vw,46px); font-weight:800; line-height:1.15; color:var(--w); margin-bottom:14px; }
.sec-sub { color:var(--mu); font-size:17px; max-width:500px; line-height:1.65; }
.eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--g); background:var(--ga); border:1px solid var(--gb); padding:5px 12px; border-radius:100px; margin-bottom:18px; }
.gold-text { color:var(--g); }
.tag { font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px; }
.tag-em { background:rgba(16,185,129,0.12); color:var(--gr); border:1px solid rgba(16,185,129,0.22); }
.tag-bl { background:var(--ba); color:#93B4FF; border:1px solid rgba(59,123,255,0.22); }
.tag-gd { background:var(--ga); color:var(--g); border:1px solid var(--gb); }

/* ─ NAV — mobile fix: space-between forces hamburger to far right ─ */
.nav { position:fixed; top:0; inset-inline:0; z-index:100; transition:all 0.3s; border-bottom:1px solid transparent; }
.nav-sc { background:rgba(11,17,32,0.96); backdrop-filter:blur(20px); border-color:var(--br); }
.nav-in { max-width:1200px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
.nav-brand { display:flex; align-items:center; gap:10px; font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:var(--w); text-decoration:none; flex-shrink:0; }
.nav-links { display:flex; gap:26px; flex:1; justify-content:center; }
.nav-lnk { font-size:14px; color:var(--mu); text-decoration:none; font-weight:500; transition:color 0.18s; position:relative; padding-bottom:2px; white-space:nowrap; }
.nav-lnk::after { content:''; position:absolute; bottom:0; left:0; width:0; height:1px; background:var(--g); transition:width 0.2s; }
.nav-lnk:hover { color:var(--w); }
.nav-lnk:hover::after { width:100%; }
.nav-right { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.nav-si { font-size:14px; font-weight:600; color:var(--mu); text-decoration:none; transition:color 0.18s; }
.nav-si:hover { color:var(--w); }
.hb { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:6px; flex-shrink:0; margin-left:auto; }
.hb span { display:block; width:22px; height:2px; background:var(--w); border-radius:2px; transition:all 0.25s; transform-origin:center; }
.hb .o:nth-child(1) { transform:translateY(7px) rotate(45deg); }
.hb .m.o { opacity:0; }
.hb .o:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }
.mob { background:#111828; border-top:1px solid var(--br); padding:16px 24px 20px; display:flex; flex-direction:column; gap:12px; }
.mob-lnk { font-size:15px; color:var(--mu); text-decoration:none; padding:4px 0; transition:color 0.18s; }
.mob-lnk:hover { color:var(--w); }
.mob-ctas { display:flex; gap:10px; margin-top:8px; }

/* ─ Mobile sticky CTA ─ */
.mcta { position:fixed; bottom:-100px; left:0; right:0; z-index:90; background:rgba(11,17,32,0.97); backdrop-filter:blur(16px); border-top:1px solid var(--br); padding:12px 18px; display:none; align-items:center; justify-content:space-between; gap:12px; transition:bottom 0.3s cubic-bezier(.16,1,.3,1); box-shadow:0 -8px 30px rgba(0,0,0,0.4); }
.mcta-show { bottom:0; }
.mcta-text { display:flex; flex-direction:column; line-height:1.3; }
.mcta-text strong { font-size:14px; color:var(--w); font-family:'Sora',sans-serif; }
.mcta-text span { font-size:11px; color:var(--mu); }
.mcta-btn { flex-shrink:0; }

/* ─ Hero ─ */
.hero { min-height:100vh; display:flex; flex-direction:column; padding-top:64px; position:relative; background:#0B1120; overflow:hidden; }
.hero-orb { position:absolute; border-radius:50%; pointer-events:none; }
.hero-o1 { width:560px; height:560px; background:rgba(59,123,255,0.07); top:-180px; left:-200px; filter:blur(90px); animation:orb1 15s ease-in-out infinite; }
.hero-o2 { width:440px; height:440px; background:rgba(245,166,35,0.055); bottom:-100px; right:-150px; filter:blur(80px); animation:orb2 17s ease-in-out infinite; }
.hero-o3 { width:300px; height:300px; background:rgba(16,185,129,0.04); top:40%; left:40%; filter:blur(70px); animation:orb3 20s ease-in-out infinite; }
@keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,50px)} }
@keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-40px)} }
@keyframes orb3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-30px,20px)} 66%{transform:translate(20px,-30px)} }
.hero-in { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; padding-top:72px; padding-bottom:56px; position:relative; z-index:1; }
.hero-badge { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:var(--g); background:var(--ga); border:1px solid var(--gb); padding:6px 14px; border-radius:100px; margin-bottom:24px; }
.badge-dot { width:7px; height:7px; border-radius:50%; background:var(--gr); flex-shrink:0; animation:bdot 2s ease-in-out infinite; }
@keyframes bdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
.hero-h1 { font-family:'Sora',sans-serif; font-size:clamp(34px,4vw,56px); font-weight:800; line-height:1.1; letter-spacing:-0.02em; color:var(--w); margin-bottom:20px; }
.hero-sub { font-size:17px; color:var(--mu); line-height:1.7; max-width:430px; margin-bottom:34px; }
.hero-acts { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:28px; }
.hero-trust { display:flex; gap:20px; flex-wrap:wrap; }
.trust-item { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--mu); }
.trust-item svg { color:var(--gr); flex-shrink:0; }

.hcard-wrap { position:relative; display:flex; flex-direction:column; gap:12px; }
.hcard-notif { display:inline-flex; align-items:center; gap:7px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.22); padding:7px 14px; border-radius:100px; font-size:12px; font-weight:600; color:var(--gr); width:fit-content; animation:floatup 3.5s ease-in-out infinite; align-self:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.hcard-notif-dot { width:7px; height:7px; border-radius:50%; background:var(--gr); flex-shrink:0; animation:bdot 2s infinite; }
@keyframes floatup { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
.hcard { background:linear-gradient(135deg,#1a3aad 0%,#2563eb 55%,#1a3aad 100%); border-radius:16px; padding:22px 24px; box-shadow:0 24px 72px rgba(37,99,235,0.3),0 0 0 1px rgba(255,255,255,0.1); }
.hcard-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.hcard-eyebrow { font-size:10px; font-weight:700; letter-spacing:0.1em; color:rgba(255,255,255,0.55); text-transform:uppercase; margin-bottom:4px; }
.hcard-val { font-family:'Sora',sans-serif; font-size:34px; font-weight:800; color:#fff; margin-bottom:3px; }
.hcard-sub { font-size:11px; color:rgba(255,255,255,0.5); }
.hcard-score-wrap { display:flex; flex-direction:column; align-items:center; gap:2px; }
.hcard-score-lbl { font-size:10px; color:rgba(255,255,255,0.5); }
.hcard-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
.hcard-cell { background:rgba(0,0,0,0.22); border-radius:8px; padding:10px 12px; }
.hcard-cell-lbl { font-size:10px; color:rgba(255,255,255,0.45); margin-bottom:3px; }
.hcard-cell-val { font-family:'Sora',sans-serif; font-size:15px; font-weight:700; }
.hcv-dim { color:rgba(255,255,255,0.32); }
.hcv-gld { color:#FECD4F; }
.hcv-red { color:#FC8080; }
.hcard-spark { position:relative; }
.hcard-spark-lbl { position:absolute; bottom:3px; right:0; font-size:11px; font-weight:700; color:var(--g); }
.hcard-chat { background:rgba(255,255,255,0.04); border:1px solid var(--br); border-radius:var(--r); padding:14px 16px; display:flex; flex-direction:column; gap:8px; }
.hcard-chat-q { font-size:12px; color:#93B4FF; background:rgba(59,123,255,0.1); border:1px solid rgba(59,123,255,0.18); padding:8px 11px; border-radius:8px 8px 2px 8px; text-align:right; }
.hcard-chat-a { font-size:12px; color:var(--mu); line-height:1.55; }

.stats-bar { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--br); position:relative; z-index:1; }
.stat { padding:26px 0; text-align:center; border-right:1px solid var(--br); }
.stat:last-child { border-right:none; }
.stat-v { font-family:'Sora',sans-serif; font-size:28px; font-weight:800; color:var(--g); margin-bottom:4px; }
.stat-l { font-size:12px; color:var(--mu); }

.mock { background:#1A2235; border:1px solid var(--br); border-radius:14px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.55); }
.mock-bar { display:flex; align-items:center; gap:10px; background:#1E2A42; padding:10px 14px; border-bottom:1px solid var(--br); }
.mock-dots { display:flex; gap:5px; }
.mock-dots span { width:10px; height:10px; border-radius:50%; }
.mock-dots span:nth-child(1){background:#FF5F57} .mock-dots span:nth-child(2){background:#FEBC2E} .mock-dots span:nth-child(3){background:#28C840}
.mock-url { font-size:11px; color:var(--mu); font-family:monospace; flex:1; }
.mock-bar-right { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; color:var(--gr); }
.mock-live-dot { width:6px; height:6px; border-radius:50%; background:var(--gr); animation:bdot 2s infinite; }
.mock-body { display:grid; grid-template-columns:150px 1fr; min-height:380px; }
.mock-side { background:rgba(0,0,0,0.25); border-right:1px solid var(--br); padding:14px 10px; display:flex; flex-direction:column; gap:2px; }
.mock-logo { font-family:'Sora',sans-serif; font-weight:800; font-size:14px; color:var(--g); margin-bottom:14px; padding:0 4px; }
.mock-logo span { color:var(--w); }
.mock-nav { display:flex; align-items:center; gap:7px; font-size:11px; color:var(--mu); padding:6px 7px; border-radius:6px; transition:all 0.15s; }
.mock-a { background:rgba(59,123,255,0.14); color:#93B4FF; font-weight:600; }
.mock-dim { opacity:0.4; }
.mock-ic { font-size:12px; }
.mock-pro-tag { margin-left:auto; font-size:9px; font-weight:700; background:var(--ba); color:#93B4FF; padding:2px 5px; border-radius:4px; }
.mock-sep { height:1px; background:var(--br); margin:8px 0; }
.mock-side-foot { margin-top:auto; display:flex; align-items:center; gap:7px; padding-top:10px; border-top:1px solid var(--br); }
.mock-av { width:26px; height:26px; border-radius:50%; background:var(--b); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
.mock-uname { font-size:11px; font-weight:600; color:var(--w); }
.mock-plan { font-size:10px; color:var(--mu); }
.mock-main { display:flex; flex-direction:column; padding:12px 14px; gap:10px; min-width:0; }
.mock-disclaimer { background:rgba(245,166,35,0.07); border:1px solid rgba(245,166,35,0.16); border-radius:6px; padding:7px 11px; font-size:11px; color:rgba(245,166,35,0.78); line-height:1.5; }
.mock-intro { display:flex; gap:9px; align-items:flex-start; }
.mock-bot-ic { font-size:18px; flex-shrink:0; }
.mock-intro-msg { background:#1E2A42; border:1px solid var(--br); border-radius:10px 10px 10px 0; padding:10px 13px; font-size:11px; color:var(--mu); line-height:1.6; }
.mock-intro-msg strong { color:var(--w); }
.mock-exchange { display:flex; flex-direction:column; gap:8px; transition:opacity 0.38s; }
.mock-fade { opacity:0; }
.mock-user-row { display:flex; align-items:flex-end; gap:7px; justify-content:flex-end; }
.mock-ubub { background:var(--b); color:#fff; font-size:11px; padding:8px 12px; border-radius:12px 12px 0 12px; max-width:72%; line-height:1.5; }
.mock-uav { width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,0.14); color:#fff; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
.mock-ai-row { display:flex; align-items:flex-start; gap:7px; }
.mock-bic { font-size:15px; flex-shrink:0; padding-top:2px; }
.mock-abub { background:#1E2A42; border:1px solid var(--br); color:var(--mu); font-size:11px; padding:8px 12px; border-radius:0 12px 12px 12px; max-width:82%; line-height:1.6; }
.mock-input-row { display:flex; gap:7px; margin-top:auto; }
.mock-input { flex:1; background:#1E2A42; border:1px solid var(--br); border-radius:7px; padding:8px 11px; font-size:11px; color:var(--mu); font-family:'Inter',sans-serif; outline:none; min-width:0; }
.mock-send-btn { background:var(--b); color:#fff; font-size:11px; font-weight:700; padding:8px 13px; border:none; border-radius:7px; cursor:pointer; white-space:nowrap; transition:background 0.18s; }
.mock-send-btn:hover { background:var(--bd); }

.feats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; align-items:stretch; }
.feat { background:var(--card); border:1px solid var(--br); border-radius:var(--r); padding:20px; transition:all 0.22s; position:relative; overflow:hidden; height:100%; display:flex; flex-direction:column; }
.feat::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(245,166,35,0.05) 0%,transparent 55%); opacity:0; transition:opacity 0.28s; pointer-events:none; }
.feat:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.13); transform:translateY(-3px); box-shadow:0 16px 40px rgba(0,0,0,0.35); }
.feat:hover::before { opacity:1; }
.feat-soon { opacity:0.55; }
.soon-badge { position:absolute; top:10px; right:10px; background:var(--ga); color:var(--g); border:1px solid var(--gb); font-size:9px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; padding:3px 8px; border-radius:100px; }
.feat-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
.feat-ic { font-size:24px; }
.feat-title { font-weight:700; font-size:13px; color:var(--w); margin-bottom:7px; line-height:1.3; }
.feat-desc { font-size:12px; color:var(--mu); line-height:1.65; flex:1; }

.how-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; position:relative; }
.how-grid::before { content:''; position:absolute; top:36px; left:calc(12.5%); right:calc(12.5%); height:1px; background:linear-gradient(90deg,transparent,rgba(245,166,35,0.25),rgba(245,166,35,0.25),transparent); }
.how-card { padding:32px 20px; position:relative; }
.how-num { font-family:'Sora',sans-serif; font-size:54px; font-weight:800; color:rgba(245,166,35,0.6); line-height:1; margin-bottom:20px; transition:color 0.3s; letter-spacing:-0.02em; }
.how-card:hover .how-num { color:rgba(245,166,35,0.9); }
.how-title { font-weight:700; font-size:15px; color:var(--w); margin-bottom:8px; }
.how-desc { font-size:13px; color:var(--mu); line-height:1.65; margin-bottom:10px; }
.how-note { font-size:12px; color:rgba(245,166,35,0.68); line-height:1.55; font-style:italic; }

.price-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; align-items:stretch; }
.plan { background:var(--card); border:1px solid var(--br); border-radius:var(--r); padding:26px; display:flex; flex-direction:column; position:relative; overflow:hidden; height:100%; transition:transform 0.2s,box-shadow 0.2s; }
.plan:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(0,0,0,0.4); }
.plan-blue { border-color:rgba(59,123,255,0.4); background:rgba(59,123,255,0.04); }
.plan-gold { border-color:rgba(245,166,35,0.28); background:rgba(245,166,35,0.025); }
.plan-rec { border-color:rgba(59,123,255,0.5)!important; }
.rec-badge { position:absolute; top:0; left:50%; transform:translateX(-50%); background:var(--b); color:#fff; font-size:10px; font-weight:700; padding:4px 16px; border-radius:0 0 9px 9px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; }
.plan-hd { padding-top:8px; margin-bottom:20px; }
.plan-name { font-family:'Sora',sans-serif; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.09em; color:var(--mu); margin-bottom:10px; }
.plan-blue .plan-name { color:#93B4FF; }
.plan-gold .plan-name { color:var(--g); }
.plan-pr-row { display:flex; align-items:baseline; gap:8px; margin-bottom:6px; }
.plan-pr { font-family:'Sora',sans-serif; font-size:42px; font-weight:800; color:var(--w); }
.plan-orig { font-size:15px; color:rgba(122,133,154,0.4); text-decoration:line-through; }
.plan-period { font-size:14px; color:var(--mu); }
.plan-badge { display:inline-block; font-size:10px; font-weight:700; background:rgba(16,185,129,0.12); color:var(--gr); border:1px solid rgba(16,185,129,0.22); padding:3px 10px; border-radius:100px; margin-bottom:9px; }
.plan-tl { font-size:13px; color:var(--mu); line-height:1.5; }
.plan-list { list-style:none; display:flex; flex-direction:column; gap:9px; flex:1; margin-bottom:22px; margin-top:6px; }
.pl { display:flex; align-items:flex-start; gap:8px; font-size:13px; line-height:1.4; }
.pl-y { color:var(--w); }
.pl-y svg { color:var(--gr); flex-shrink:0; margin-top:2px; }
.pl-n { color:rgba(122,133,154,0.32); }
.pl-n svg { color:rgba(122,133,154,0.22); flex-shrink:0; margin-top:2px; }
.plan-cta { display:flex; align-items:center; justify-content:center; gap:6px; padding:13px 18px; border-radius:var(--rs); font-weight:700; font-size:14px; text-decoration:none; transition:all 0.18s; margin-top:auto; }
.plan-cta-ghost { background:rgba(255,255,255,0.06); color:var(--w); border:1px solid var(--br); }
.plan-cta-ghost:hover { background:rgba(255,255,255,0.1); }
.plan-cta-blue { background:var(--b); color:#fff; }
.plan-cta-blue:hover { background:var(--bd); transform:translateY(-1px); box-shadow:0 8px 24px rgba(59,123,255,0.32); }
.plan-cta-gold { background:var(--g); color:#0B1120; }
.plan-cta-gold:hover { background:var(--gd); transform:translateY(-1px); box-shadow:0 8px 24px rgba(245,166,35,0.3); }
.price-note { text-align:center; font-size:13px; color:var(--mu); margin-top:24px; }

.why-grid { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
.why-h2 { font-family:'Sora',sans-serif; font-size:clamp(26px,3.2vw,42px); font-weight:800; line-height:1.2; color:var(--w); margin-bottom:18px; }
.why-p { font-size:15px; color:var(--mu); line-height:1.75; margin-bottom:14px; }
.why-cards { display:flex; flex-direction:column; gap:12px; }
.why-card { background:var(--card); border:1px solid var(--br); border-radius:var(--r); padding:18px 20px; display:flex; align-items:center; gap:16px; transition:border-color 0.2s,transform 0.2s; }
.why-card:hover { border-color:rgba(245,166,35,0.28); transform:translateX(4px); }
.why-ic { font-size:28px; flex-shrink:0; }
.why-stat { font-family:'Sora',sans-serif; font-size:24px; font-weight:800; color:var(--g); margin-bottom:2px; }
.why-lbl { font-size:12px; color:var(--mu); line-height:1.5; }

/* Compare strip */
.compare-strip { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:24px; }
.compare-col { border-radius:var(--r); padding:16px 18px; }
.compare-without { background:rgba(239,68,68,0.04); border:1px solid rgba(239,68,68,0.15); }
.compare-with { background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.18); }
.compare-head { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:rgba(239,68,68,0.8); margin-bottom:12px; }
.compare-head-g { color:var(--gr); }
.compare-row { display:flex; align-items:flex-start; gap:7px; font-size:12px; color:var(--mu); line-height:1.5; margin-bottom:9px; }
.compare-row svg { color:rgba(239,68,68,0.6); flex-shrink:0; margin-top:1px; }
.compare-row-g svg { color:var(--gr); }
.compare-row-g { color:rgba(238,243,255,0.85); }

/* FAQ */
.faq-list { max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:10px; }
.faq-item { background:var(--card); border:1px solid var(--br); border-radius:var(--r); overflow:hidden; transition:border-color 0.2s; }
.faq-open { border-color:rgba(245,166,35,0.3); }
.faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; background:none; border:none; cursor:pointer; padding:18px 20px; text-align:left; font-size:14px; font-weight:600; color:var(--w); font-family:'Inter',sans-serif; }
.faq-icon { color:var(--g); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.faq-a-wrap { overflow:hidden; transition:max-height 0.3s ease; }
.faq-a { padding:0 20px 18px; font-size:13px; color:var(--mu); line-height:1.7; }



.cta-sec { padding:96px 0; background:#101828; border-top:1px solid var(--br); position:relative; overflow:hidden; }
.cta-glow { position:absolute; top:-240px; left:50%; transform:translateX(-50%); width:800px; height:480px; background:radial-gradient(ellipse,rgba(245,166,35,0.08) 0%,transparent 65%); pointer-events:none; }
.cta-in { text-align:center; display:flex; flex-direction:column; align-items:center; position:relative; z-index:1; }
.cta-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:var(--g); background:var(--ga); border:1px solid var(--gb); padding:5px 14px; border-radius:100px; margin-bottom:22px; }
.cta-h2 { font-family:'Sora',sans-serif; font-size:clamp(28px,3.8vw,50px); font-weight:800; line-height:1.15; color:var(--w); margin-bottom:16px; }
.cta-sub { font-size:17px; color:var(--mu); line-height:1.65; max-width:460px; margin-bottom:34px; }
.cta-trust { display:flex; gap:22px; flex-wrap:wrap; justify-content:center; margin-top:18px; }
.cta-ti { display:flex; align-items:center; gap:5px; font-size:13px; color:var(--mu); }
.cta-ti svg { color:var(--gr); }

.ft { background:#060D1A; border-top:1px solid var(--br); padding:60px 0 88px; }
.ft-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:48px; margin-bottom:48px; }
.ft-brand { display:flex; align-items:center; gap:8px; font-family:'Sora',sans-serif; font-size:18px; font-weight:800; color:var(--w); margin-bottom:12px; }
.ft-tag { font-size:13px; color:var(--mu); line-height:1.65; }
.ft-col-h { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--mu); margin-bottom:16px; }
.ft-links { list-style:none; display:flex; flex-direction:column; gap:10px; }
.ft-links a { font-size:13px; color:rgba(122,133,154,0.65); text-decoration:none; transition:color 0.18s; }
.ft-links a:hover { color:var(--w); }
.ft-bot { border-top:1px solid var(--br); padding-top:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; font-size:12px; color:rgba(122,133,154,0.4); }
.ft-status { display:flex; align-items:center; gap:7px; }
.st-dot { width:7px; height:7px; border-radius:50%; background:var(--gr); animation:bdot 2s infinite; }

/* ─ Quick calculator ─ */
.calc-card { display:grid; grid-template-columns:1fr 1fr; gap:0; background:var(--card); border:1px solid var(--br); border-radius:18px; overflow:hidden; }
.calc-left { padding:36px 38px; display:flex; flex-direction:column; justify-content:center; }
.calc-h3 { font-family:'Sora',sans-serif; font-size:24px; font-weight:800; color:var(--w); margin-bottom:10px; line-height:1.25; }
.calc-p { font-size:13px; color:var(--mu); line-height:1.6; margin-bottom:26px; }
.calc-slider-wrap { display:flex; flex-direction:column; gap:10px; }
.calc-slider-label { display:flex; justify-content:space-between; align-items:baseline; font-size:13px; color:var(--mu); }
.calc-slider-val { font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:var(--g); }
.calc-slider { width:100%; height:6px; border-radius:3px; background:rgba(255,255,255,0.1); appearance:none; outline:none; cursor:pointer; }
.calc-slider::-webkit-slider-thumb { appearance:none; width:20px; height:20px; border-radius:50%; background:var(--g); border:3px solid #0B1120; box-shadow:0 2px 8px rgba(245,166,35,0.4); cursor:pointer; transition:transform 0.15s; }
.calc-slider::-webkit-slider-thumb:hover { transform:scale(1.15); }
.calc-slider::-moz-range-thumb { width:20px; height:20px; border-radius:50%; background:var(--g); border:3px solid #0B1120; cursor:pointer; }
.calc-right { background:linear-gradient(135deg,rgba(245,166,35,0.06),rgba(59,123,255,0.04)); padding:36px 38px; display:flex; flex-direction:column; gap:16px; border-left:1px solid var(--br); }
.calc-result-row { display:flex; justify-content:space-between; align-items:baseline; padding-bottom:14px; border-bottom:1px solid var(--br); }
.calc-result-row--highlight { border-bottom:none; padding-bottom:0; }
.calc-result-lbl { font-size:12px; color:var(--mu); }
.calc-result-val { font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:var(--w); }
.calc-result-val--sm { font-size:17px; }
.calc-result-val--gold { font-size:26px; color:var(--g); }
.calc-disclaimer { font-size:10px; color:rgba(122,133,154,0.6); line-height:1.5; }
.calc-cta { margin-top:4px; width:100%; justify-content:center; }
@media (max-width:768px) {
  .calc-card { grid-template-columns:1fr; }
  .calc-right { border-left:none; border-top:1px solid var(--br); }
  .calc-left, .calc-right { padding:26px 22px; }
}


@media (max-width:1100px) {
  .feats-grid { grid-template-columns:repeat(2,1fr); }
  .how-grid { grid-template-columns:repeat(2,1fr); }
  .how-grid::before { display:none; }
}
@media (max-width:768px) {
  .nav-links,.nav-right { display:none; }
  .hb { display:flex; }
  .nav-in { justify-content:space-between; }
  .hero-in { grid-template-columns:1fr; padding-top:48px; padding-bottom:36px; gap:36px; }
  .hero-vis { order:-1; }
  .hero-sub { max-width:100%; }
  .stats-bar { grid-template-columns:repeat(2,1fr); }
  .stat { border-right:none; border-bottom:1px solid var(--br); }
  .stat:nth-child(odd) { border-right:1px solid var(--br); }
  .feats-grid { grid-template-columns:1fr; }
  .how-grid { grid-template-columns:1fr; }
  .how-grid::before { display:none; }
  .how-card { border-top:1px solid var(--br); padding:24px 16px; }
  .price-grid { grid-template-columns:1fr; }
  .why-grid { grid-template-columns:1fr; gap:36px; }
  .compare-strip { grid-template-columns:1fr; }
  .ft-grid { grid-template-columns:1fr; gap:28px; }
  .ft { padding-bottom:100px; }
  .hero-acts { flex-direction:column; }
  .btn-lg,.btn-xl { width:100%; justify-content:center; }
  .mock-body { grid-template-columns:88px 1fr; }
  .hcard-notif { font-size:11px; }
  .mcta { display:flex; }
  .faq-q { font-size:13px; padding:16px; }
  .sec { padding:64px 0 56px; }
}
@media (prefers-reduced-motion:reduce) {
  .rv { transition:none; opacity:1; transform:none; }
  *,*::before,*::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important; }
}
`;

export default function LandingPage() {
  return (
    <>
      <style>{CSS}</style>
      <div className="lp">
        <ScrollProgress/>
        <Navbar/>
        <Hero/>
        <ProductPreview/>
        <Features/>
        <HowItWorks/>
        <Pricing/>
        <WhyFinOS/>
        <FAQ/>
        <CTA/>
        <Footer/>
        <MobileStickyCTA/>
      </div>
    </>
  );
}