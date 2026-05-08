import { useState, useEffect, useMemo } from 'react';
import { BL, Sheet, Field, Spinner, toast, prettyDate } from '../components/ui';
import * as db from '../db';

export default function LoansScreen({ focusId, clearFocus }) {
  const [borrowers, setBorrowers] = useState(null);
  const [allPayments, setAllPayments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId]   = useState(focusId || null);

  async function load() {
    try {
      const [bs, ps] = await Promise.all([db.listBorrowers(), db.listPayments()]);
      setBorrowers(bs);
      setAllPayments(ps);
    } catch { toast("Couldn't load loans"); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (focusId) setOpenId(focusId); }, [focusId]);

  const paidByBorrower = useMemo(() => {
    const m = {};
    allPayments.forEach((p) => { m[p.borrower_id] = (m[p.borrower_id] || 0) + Number(p.amount || 0); });
    return m;
  }, [allPayments]);

  const opened = borrowers && openId ? borrowers.find((b) => b.id === openId) : null;

  const sorted = useMemo(() => {
    if (!borrowers) return [];
    return [...borrowers].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [borrowers]);

  return (
    <div className="page" style={{ paddingTop: 26 }}>
      <div className="section-h">
        <h1><BL en="Loans" te="అప్పులు" /></h1>
        <span style={{ flex: 1 }} />
        {borrowers ? (
          <span className="small num">{borrowers.filter((b) => b.status === 'active').length} active</span>
        ) : null}
      </div>

      {borrowers === null ? (
        <Spinner />
      ) : borrowers.length === 0 ? (
        <div className="empty">
          <div className="glyph">∅</div>
          <BL en="No loans recorded yet." te="ఇంకా అప్పులు లేవు." />
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setShowAdd(true)}>
              <BL en="Add first borrower" te="మొదటి అప్పు" />
            </button>
          </div>
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {sorted.map((b) => (
            <LoanCard key={b.id} b={b} paidTotal={paidByBorrower[b.id] || 0}
                      onClick={() => setOpenId(b.id)} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add">+</button>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add borrower" te="కొత్త అప్పు">
        <BorrowerForm onSaved={() => { setShowAdd(false); load(); }} />
      </Sheet>

      <Sheet open={!!opened} onClose={() => { setOpenId(null); clearFocus?.(); }}
             title={opened ? opened.name : ''} te={opened ? 'వివరాలు' : ''}>
        {opened ? (
          <LoanDetail
            b={opened}
            paidTotal={paidByBorrower[opened.id] || 0}
            payments={allPayments.filter((p) => p.borrower_id === opened.id)}
            onChange={load}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function LoanCard({ b, paidTotal, onClick }) {
  const total     = Number(b.total_to_repay || 0);
  const remaining = Math.max(0, total - paidTotal);
  const pct       = total > 0 ? Math.min(100, (paidTotal / total) * 100) : 0;
  const completed = b.status === 'completed' || (total > 0 && paidTotal >= total);

  return (
    <div className="card" onClick={onClick} style={{
      padding: 14, cursor: 'pointer',
      borderColor: completed ? 'var(--success)' : 'var(--border)',
    }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.2 }}>
            {b.name}
            {completed ? <span className="pill green" style={{ marginLeft: 10 }}>Cleared</span> : null}
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            <span className="num">{db.fmtINR(b.amount_given)}</span>
            <span className="fade"> given · </span>
            <span className="num">{db.fmtINR(b.total_to_repay)}</span>
            <span className="fade"> total</span>
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
          <span className="micro"><BL en="Remaining" te="రావాల్సింది" /></span>
          <div className="num" style={{
            fontSize: 20, fontWeight: 600, marginTop: 2,
            color: completed ? 'var(--success)' : 'var(--accent)',
          }}>
            {db.fmtINR(remaining)}
          </div>
        </div>
      </div>
      <div className={'bar' + (completed ? ' green' : '')} style={{ marginTop: 12 }}>
        <span style={{ width: pct + '%' }} />
      </div>
      <div className="row between" style={{ marginTop: 6 }}>
        <span className="small num">{db.fmtINR(paidTotal)} <span className="fade">paid</span></span>
        <span className="small num fade">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function LoanDetail({ b, paidTotal, payments, onChange, onClose }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const total     = Number(b.total_to_repay || 0);
  const remaining = Math.max(0, total - paidTotal);
  const pct       = total > 0 ? Math.min(100, (paidTotal / total) * 100) : 0;
  const dailyAmt  = Number(b.daily_amount || 0);
  const expectedDays = dailyAmt > 0 ? Math.ceil(total / dailyAmt) : null;
  const daysSince    = b.start_date ? db.daysBetween(b.start_date, db.todayISO()) : null;

  const ascending = [...payments].sort((a, b) => (a.date < b.date ? -1 : 1));

  async function markCompleted() {
    if (!confirm('Mark this loan as cleared?')) return;
    try { await db.updateBorrower(b.id, { status: 'completed' }); toast('✓ Cleared'); onChange(); onClose(); }
    catch { toast('Failed'); }
  }
  async function reopen() {
    try { await db.updateBorrower(b.id, { status: 'active' }); toast('Re-opened'); onChange(); }
    catch { toast('Failed'); }
  }
  async function deleteBorrower() {
    if (!confirm(`Delete ${b.name} and all their payments?`)) return;
    try { await db.deleteBorrower(b.id); toast('Deleted'); onChange(); onClose(); }
    catch { toast('Failed'); }
  }
  async function deletePayment(p) {
    if (!confirm('Delete this payment?')) return;
    try { await db.deletePayment(p.id); onChange(); }
    catch { toast('Failed'); }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between">
          <div className="col">
            <span className="micro"><BL en="Given" te="ఇచ్చింది" /></span>
            <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{db.fmtINR(b.amount_given)}</div>
          </div>
          <div className="col" style={{ alignItems: 'center' }}>
            <span className="micro"><BL en="Total due" te="మొత్తం" /></span>
            <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{db.fmtINR(b.total_to_repay)}</div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end' }}>
            <span className="micro"><BL en="Remaining" te="రావాల్సింది" /></span>
            <div className="num red" style={{ fontSize: 18, fontWeight: 600 }}>{db.fmtINR(remaining)}</div>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 12 }}><span style={{ width: pct + '%' }} /></div>
        <div className="small" style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {dailyAmt > 0 && <span><span className="num">{db.fmtINR(dailyAmt)}</span><span className="fade"> / day</span></span>}
          {expectedDays != null && <span><span className="num">{expectedDays}</span><span className="fade"> days planned</span></span>}
          {daysSince != null && daysSince >= 0 && <span><span className="num">{daysSince}</span><span className="fade"> days in</span></span>}
          {b.phone && <a href={`tel:${b.phone}`} className="num" style={{ color: 'var(--ink)' }}>☎ {b.phone}</a>}
        </div>
        {b.notes ? <div className="small ital" style={{ marginTop: 10, color: 'var(--soft)' }}>"{b.notes}"</div> : null}
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setShowAdd(true)} style={{ flex: 1, minWidth: 140 }}>
          + <BL en="Add payment" te="చెల్లింపు" />
        </button>
        <button className="ghost" onClick={() => setShowEdit(true)}>Edit</button>
        {b.status === 'active'
          ? <button className="ghost" onClick={markCompleted}>Mark cleared</button>
          : <button className="ghost" onClick={reopen}>Re-open</button>}
      </div>

      <div className="section-h">
        <h3><BL en="Payment history" te="చెల్లింపుల చరిత్ర" /></h3>
        <span style={{ flex: 1 }} />
        <span className="small num">{payments.length}</span>
      </div>

      {payments.length === 0 ? (
        <div className="empty"><div className="glyph">·</div>No payments yet</div>
      ) : (
        <div className="col" style={{ gap: 0 }}>
          {[...ascending].reverse().map((p) => (
            <div key={p.id} className="row between" style={{ padding: '10px 4px', borderBottom: '1px dashed var(--border)' }}>
              <div className="col">
                <span style={{ fontSize: 14 }}>{prettyDate(p.date)}</span>
                {p.note ? <span className="small fade ital">{p.note}</span> : null}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="num" style={{ fontWeight: 600 }}>{db.fmtINR(p.amount)}</span>
                <button className="ghost tiny" onClick={() => deletePayment(p)} style={{ padding: '2px 6px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="rule" />
      <button onClick={deleteBorrower} className="ghost"
        style={{ color: 'var(--accent)', borderColor: 'var(--accent)', width: '100%' }}>
        <BL en="Delete borrower" te="తొలగించు" />
      </button>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add payment" te="చెల్లింపు">
        <PaymentSheet borrower={b} date={db.todayISO()} existing={[]}
                      onDone={() => { setShowAdd(false); onChange(); }} />
      </Sheet>
      <Sheet open={showEdit} onClose={() => setShowEdit(false)} title="Edit borrower" te="మార్చు">
        <BorrowerForm initial={b} onSaved={() => { setShowEdit(false); onChange(); }} />
      </Sheet>
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
    } catch { toast("Couldn't save"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 10 }}>
        <BL en="for" te="వారికి" /> <strong>{borrower.name}</strong> · {prettyDate(date)}
      </div>
      <Field label="Amount" te="మొత్తం">
        <input type="number" inputMode="numeric" value={amount}
               onChange={(e) => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="Note" te="గమనిక" hint="optional">
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button onClick={save} disabled={busy} style={{ width: '100%', marginTop: 8 }}>
        {default0 ? 'Update' : 'Save payment'}
      </button>
    </div>
  );
}

export function BorrowerForm({ initial, onSaved }) {
  const [name,  setName]  = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [given, setGiven] = useState(initial ? String(initial.amount_given) : '');
  const [total, setTotal] = useState(initial ? String(initial.total_to_repay) : '');
  const [daily, setDaily] = useState(initial ? String(initial.daily_amount) : '');
  const [start, setStart] = useState(initial?.start_date || db.todayISO());
  const [notes, setNotes] = useState(initial?.notes || '');
  const [busy,  setBusy]  = useState(false);

  function autoDaily() {
    const t = Number(total);
    if (t > 0 && !daily) setDaily(String(Math.round(t / 100)));
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return toast('Name?');
    if (!(Number(given) >= 0) || !(Number(total) > 0)) return toast('Enter valid amounts');
    setBusy(true);
    try {
      const data = {
        name: name.trim(), phone: phone.trim() || null,
        amount_given: Number(given), total_to_repay: Number(total),
        daily_amount: Number(daily) || 0, start_date: start,
        notes: notes.trim() || null,
      };
      if (initial) await db.updateBorrower(initial.id, data);
      else         await db.createBorrower(data);
      onSaved();
    } catch { toast("Couldn't save"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <Field label="Name" te="పేరు">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </Field>
      <Field label="Phone" te="ఫోన్" hint="optional">
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Given" te="ఇచ్చింది" hint="₹">
          <input type="number" inputMode="numeric" value={given}
                 onChange={(e) => setGiven(e.target.value)} required />
        </Field>
        <Field label="Total to repay" te="మొత్తం" hint="₹">
          <input type="number" inputMode="numeric" value={total}
                 onChange={(e) => setTotal(e.target.value)} onBlur={autoDaily} required />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Daily" te="రోజువారీ" hint="₹">
          <input type="number" inputMode="numeric" value={daily}
                 onChange={(e) => setDaily(e.target.value)} />
        </Field>
        <Field label="Start" te="ప్రారంభం">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" te="గమనికలు" hint="optional">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
        {busy ? 'Saving…' : initial ? 'Save changes' : 'Add borrower'}
      </button>
    </form>
  );
}
