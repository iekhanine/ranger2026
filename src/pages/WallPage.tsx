import { useState } from "react";
import { Heart, Sparkles, Gift, ArrowUpRight } from "lucide-react";
import "./PennyBirthday.css";

const stars = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 41 + 17) % 96 + 2}%`,
  top: `${(i * 29 + 11) % 88 + 6}%`,
  delay: `${(i % 9) * 0.38}s`,
  duration: `${3 + (i % 5) * 0.65}s`,
}));

export default function WallPage() {
  const [opened, setOpened] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  function openCard() {
    setOpened((value) => !value);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 1700);
  }

  return (
    <main className="penny-page">
      <div className="penny-glow penny-glow--a" aria-hidden="true" />
      <div className="penny-glow penny-glow--b" aria-hidden="true" />
      <div className="penny-sky" aria-hidden="true">
        {stars.map((star, i) => (
          <span key={i} className="penny-star" style={{
            left: star.left,
            top: star.top,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }} />
        ))}
      </div>

      <header className="penny-header">
        <span className="penny-monogram">P<span>✦</span></span>
        <span className="penny-header-label">A DAY JUST FOR YOU</span>
      </header>

      <section className="penny-hero" aria-labelledby="penny-title">
        <div className="penny-eyebrow"><span className="penny-eyebrow-line" /> THE WORLD IS BETTER WITH YOU IN IT <span className="penny-eyebrow-line" /></div>
        <div className="penny-decoration" aria-hidden="true"><Sparkles size={29} strokeWidth={1.2}/></div>
        <p className="penny-small-title">Wishing you the happiest</p>
        <h1 id="penny-title">Birthday,<br /><em>Penny.</em></h1>
        <p className="penny-subtitle">Some people make ordinary days feel a little more special.<br className="penny-desktop-break" /> Here's to someone who does exactly that.</p>

        <div className="penny-card-area">
          <button
            className={`penny-gift ${opened ? "penny-gift--opened" : ""}`}
            type="button"
            onClick={openCard}
            aria-expanded={opened}
            aria-controls="penny-card-message"
          >
            <span className="penny-gift-icon">{opened ? <Heart size={19} fill="currentColor" /> : <Gift size={19} strokeWidth={1.7} />}</span>
            {opened ? "Close your birthday note" : "Open your birthday note"}
            <span className="penny-gift-arrow">↗</span>
          </button>
          <div id="penny-card-message" className={`penny-note ${opened ? "penny-note--visible" : ""}`} aria-hidden={!opened}>
            <div className="penny-note-top">A LITTLE SOMETHING FOR PENNY <Heart size={14} /></div>
            <p>May this year bring you more laughter, good surprises, unforgettable moments, and all the little things that make life beautiful.</p>
            <strong>You deserve a wonderful birthday. ♡</strong>
          </div>
        </div>
        <div className="penny-divider" aria-hidden="true"><span>✦</span></div>
        <p className="penny-bottom">MAKE A WISH. MAKE IT A GOOD ONE.</p>
      </section>

      <footer className="penny-footer">
        <span>MADE WITH A LITTLE LOVE</span>
        <Heart size={12} aria-hidden="true" />
        <span>FOR PENNY</span>
      </footer>

      {celebrating && <div className="penny-confetti" aria-hidden="true">{Array.from({length:32},(_,i)=><i key={i} style={{
        left:`${(i*47+13)%100}%`,
        animationDelay:`${(i%8)*0.075}s`,
        backgroundColor:["#eabb83","#e5a8b2","#e9d7ee","#a9c5bd"][i%4],
      }}/>)}</div>}
      <a className="penny-discord" href="https://discord.gg/qr6FTrWsGA" target="_blank" rel="noreferrer" aria-label="Visit the Resort Discord">
        THE RESORT <ArrowUpRight size={13} />
      </a>
    </main>
  );
}
