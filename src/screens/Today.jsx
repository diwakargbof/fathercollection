import { useState, useEffect, useMemo } from 'react';
import { Sheet, Field, Sparks, Spinner, toast, getGreeting, prettyDate } from '../components/ui';
import * as db from '../db';

const FATHERS_NAME = 'Siva Reddy';

export default function TodayScreen({ navigate }) {
  const [borrowers, setBorrowers] = useState(null);
  const [todayPays, setTodayPays] = useState([]);
  const [editing, setEditing]     = useState(null);
  const [celebrated, setCelebrated] = useState(false);
  const [sparkKey, setSparkKey]   = useState(0);
  const today = db.todayISO();

  async function load() {
    try {
      const [bs, ps] = await Promise.all([
        db.listBorrowers(),
        db.listPaymentsByDate(today),
      ]);
      setBorrowers(bs.filter((b) => b.status === 'active'));
      setTodayPays(ps);
    } catch {
      toast("Couldn't load — check connection");
    }
  }
  useEffect(() => { load(); }, []);

  const target = useMemo(
    () => (borrowers || []).reduce((s, b) => s + Number(b.daily_amount || 0), 0),
    [borrowers]
  );
  const collectedTotal = useMemo(
    () => todayPays.reduce((s, p) => s + Number(p.amount || 0), 0),
    [todayPays]
  );
  const paidByBorrower = useMemo(() => {
    const m = {};
    todayPays.forEach((p) => { m[p.borrower_id] = (m[p.borrower_id] || 0) + Number(p.amount || 0); });
    return m;
  }, [todayPays]);

  const pct = target > 0 ? Math.min(100, (collectedTotal / target) * 100) : 0;
  const targetHit = target > 0 && collectedTotal >= target;

  useEffect(() => {
    if (targetHit && !celebrated) {
      setCelebrated(true);
      setSparkKey((k) => k + 1);
    }
  }, [targetHit, celebrated]);

  async function quickPay(b) {
    const already = paidByBorrower[b.id] || 0;
    if (already > 0) { setEditing(b); return; }
    try {
      await db.addPayment({ borrower_id: b.id, date: today, amount: Number(b.daily_amount || 0) });
      toast(`✓ ${b.name} — ${db.fmtINR(b.daily_amount)}`);
      load();
    } catch {
      toast("Couldn't save payment");
    }
  }

  const greeting = getGreeting();

  return (
    <div className="page" style={{ paddingTop: 26, position: 'relative' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 22, position: 'relative' }}>
        <div className="micro" style={{ color: 'var(--accent)' }}>{prettyDate(today)}</div>
        <h1 style={{ marginTop: 8, lineHeight: 1.1 }}>
          {greeting},<br />
          <span className="ital" style={{ fontWeight: 500 }}>{FATHERS_NAME}.</span>
        </h1>
        <Sparks trigger={sparkKey} />
      </div>

      {/* Collection card */}
      <div className="card" style={{
        marginBottom: 18,
        borderColor: targetHit ? 'var(--gold)' : 'var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="col">
            <span className="micro">Today's collection</span>
            <div className="num" style={{
              fontSize: 38, fontWeight: 600, lineHeight: 1.05, marginTop: 4,
              color: targetHit ? 'var(--gold)' : 'var(--ink)',
            }}>
              {db.fmtINR(collectedTotal)}
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
            <span className="micro">Target</span>
            <div className="num soft" style={{ fontSize: 18, marginTop: 4 }}>{db.fmtINR(target)}</div>
          </div>
        </div>

        <div className="bar" style={{ marginTop: 14 }}>
          <span style={{ width: pct + '%', background: targetHit ? 'var(--gold)' : 'var(--ink)' }} />
        </div>

        {targetHit ? (
          <div className="row" style={{ marginTop: 12, gap: 8, color: 'var(--gold)', fontStyle: 'italic', fontSize: 15 }}>
            <span>✦</span>
            <span>Target hit. Beautiful day, Nanna.</span>
          </div>
        ) : target > 0 ? (
          <div className="small" style={{ marginTop: 10 }}>
            <span className="num">{db.fmtINR(target - collectedTotal)}</span> to go
          </div>
        ) : null}
      </div>

      {/* Borrower list */}
      <div className="section-h">
        <h2>To collect today</h2>
        <span style={{ flex: 1 }} />
        <span className="small num">
          {borrowers ? `${Object.keys(paidByBorrower).length}/${borrowers.length}` : ''}
        </span>
      </div>

      {borrowers === null ? (
        <Spinner label="Loading borrowers…" />
      ) : borrowers.length === 0 ? (
        <div className="empty">
          <div className="glyph">∅</div>
          <div>No active loans yet.</div>
          <div style={{ marginTop: 14 }}>
            <button onClick={() => navigate('loans')}>Add a borrower</button>
          </div>
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {borrowers.map((b) => (
            <BorrowerTodayCard
              key={b.id} b={b}
              paidToday={paidByBorrower[b.id] || 0}
              onQuickPay={() => quickPay(b)}
              onEdit={() => setEditing(b)}
              onOpen={() => navigate('loan:' + b.id)}
            />
          ))}
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)}
             title={editing ? `Payment · ${editing.name}` : ''}>
        {editing ? (
          <PaymentSheet
            borrower={editing} date={today}
            existing={todayPays.filter((p) => p.borrower_id === editing.id)}
            onDone={() => { setEditing(null); load(); }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function BorrowerTodayCard({ b, paidToday, onQuickPay, onEdit, onOpen }) {
  const isPaid    = paidToday > 0;
  const fullyPaid = paidToday >= Number(b.daily_amount || 0);

  return (
    <div className="card" style={{
      padding: 14,
      borderColor: fullyPaid ? 'var(--success)' : 'var(--border)',
      background: fullyPaid ? 'var(--success-soft)' : 'var(--surface)',
    }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{b.name}</div>
          <div className="small" style={{ marginTop: 2 }}>
            <span className="num">{db.fmtINR(b.daily_amount)}</span> / day
            {b.phone ? <span className="fade"> · {b.phone}</span> : null}
          </div>
        </div>
        <div style={{ marginLeft: 10 }}>
          {isPaid ? (
            <button className="ghost tiny" onClick={onEdit}
              style={{ color: 'var(--success)', borderColor: 'var(--success)', background: 'rgba(74,124,89,.08)' }}>
              ✓ {db.fmtINR(paidToday)}
            </button>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <button className="green tiny" onClick={onQuickPay}>Paid</button>
              <button className="ghost tiny" onClick={onEdit}>⋯</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentSheet({ borrower, date, existing, onDone }) {
  const default0 = existing && existing[0];
  const [amount, setAmount] = useState(default0 ? String(default0.amount) : String(borrower.daily_amount || ''));
  const [note, setNote]     = useState(default0?.note || '');
  const [busy, setBusy]     = useState(false);

  async function save() {
    const n = Number(amount);
    if (!(n > 0)) return toast('Enter an amount');
    setBusy(true);
    try {
      if (default0) await db.deletePayment(default0.id);
      await db.addPayment({ borrower_id: borrower.id, date, amount: n, note: note || null });
      onDone();
    } catch {
      toast("Couldn't save");
    } finally { setBusy(false); }
  }

  async function removeToday() {
    if (!default0) return onDone();
    setBusy(true);
    try {
      await db.deletePayment(default0.id);
      onDone();
    } catch { toast("Couldn't delete"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 10 }}>
        for <strong>{borrower.name}</strong> · {prettyDate(date)}
      </div>
      <Field label="Amount">
        <input type="number" inputMode="numeric" value={amount}
               onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="Note" hint="optional">
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
               placeholder="e.g. promised to pay tomorrow too" />
      </Field>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button onClick={save} disabled={busy} style={{ flex: 1 }}>
          {default0 ? 'Update' : 'Save payment'}
        </button>
        {default0 ? <button className="ghost" onClick={removeToday} disabled={busy}>Remove</button> : null}
      </div>
    </div>
  );
}
