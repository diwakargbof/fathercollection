import { useState, useEffect } from 'react';

export function BL({ en, te, sep = ' · ' }) {
  return (
    <span>
      <span>{en}</span>
      {te ? (
        <>
          <span style={{ color: 'var(--faint)' }}>{sep}</span>
          <span className="te">{te}</span>
        </>
      ) : null}
    </span>
  );
}

export function Sheet({ open, onClose, children, title, te }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog">
        <div className="grip" />
        {title ? (
          <div className="section-h">
            <h2>{title}</h2>
            {te ? <span className="te small">{te}</span> : null}
            <span style={{ flex: 1 }} />
            <button className="ghost tiny" onClick={onClose} aria-label="Close">✕</button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, te, hint, children }) {
  return (
    <label className="field">
      <span className="lbl">
        <span>{label}</span>
        {te ? <span className="te">{te}</span> : null}
        {hint ? <span style={{ color: 'var(--faint)', fontSize: 12 }}>· {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

let _toastSetter = null;
export function ToastHost() {
  const [t, setT] = useState(null);
  useEffect(() => {
    _toastSetter = setT;
    return () => { _toastSetter = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 2200);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return null;
  return <div className="toast">{t}</div>;
}
export function toast(msg) { if (_toastSetter) _toastSetter(msg); }

export function Sparks({ trigger }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const glyphs = ['✦', '✺', '✸', '✷', '❋'];
    const next = Array.from({ length: 12 }, (_, i) => ({
      id: trigger + '-' + i,
      glyph: glyphs[i % glyphs.length],
      dx: (Math.random() - 0.5) * 220,
      dy: -60 - Math.random() * 120,
      dr: (Math.random() - 0.5) * 90,
      color: ['var(--accent)', 'var(--gold)', 'var(--success)', 'var(--ink)'][i % 4],
      left: 50 + (Math.random() - 0.5) * 40,
      top: 50 + (Math.random() - 0.5) * 20,
      delay: Math.random() * 200,
    }));
    setItems(next);
    const id = setTimeout(() => setItems([]), 1600);
    return () => clearTimeout(id);
  }, [trigger]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {items.map((s) => (
        <span key={s.id} className="spark" style={{
          left: s.left + '%', top: s.top + '%', color: s.color,
          '--dx': s.dx + 'px', '--dy': s.dy + 'px', '--dr': s.dr + 'deg',
          animationDelay: s.delay + 'ms',
        }}>
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="empty">
      <div className="glyph">⋯</div>
      <div className="small">{label || 'Loading…'}</div>
    </div>
  );
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { en: 'Good morning', te: 'శుభోదయం' };
  if (h < 17) return { en: 'Namaskaram', te: 'నమస్కారం' };
  return { en: 'Good evening', te: 'శుభ సాయంత్రం' };
}

export function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
