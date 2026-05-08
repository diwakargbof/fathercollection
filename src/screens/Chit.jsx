import { useState, useEffect } from 'react';
import { BL, Sheet, Field, Spinner, toast } from '../components/ui';
import * as db from '../db';

export default function ChitScreen() {
  const [chit, setChit]           = useState(undefined);
  const [members, setMembers]     = useState([]);
  const [pays, setPays]           = useState([]);
  const [openMonth, setOpenMonth] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editChit, setEditChit]   = useState(false);
  const [editMember, setEditMember] = useState(null);

  async function load() {
    try {
      const c = await db.getActiveChit();
      setChit(c);
      if (c) {
        const [ms, ps] = await Promise.all([db.listMembers(c.id), db.listChitPayments(c.id)]);
        setMembers(ms);
        setPays(ps);
      } else {
        setMembers([]); setPays([]);
      }
    } catch { toast("Couldn't load chit"); setChit(null); }
  }
  useEffect(() => { load(); }, []);

  if (chit === undefined) return <div className="page" style={{ paddingTop: 36 }}><Spinner /></div>;

  if (chit === null) {
    return (
      <div className="page" style={{ paddingTop: 26 }}>
        <div className="section-h"><h1><BL en="Chit" te="చిట్టీ" /></h1></div>
        <div className="empty">
          <div className="glyph">◇</div>
          <BL en="No chit set up yet." te="ఇంకా చిట్టీ లేదు." />
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setShowCreate(true)}>
              <BL en="Set up chit" te="చిట్టీ ప్రారంభించు" />
            </button>
          </div>
        </div>
        <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="Set up chit" te="కొత్త చిట్టీ">
          <ChitForm onSaved={() => { setShowCreate(false); load(); }} />
        </Sheet>
      </div>
    );
  }

  const monthsArr = Array.from({ length: chit.num_months }, (_, i) => i + 1);
  const memberByMonth = {};
  members.forEach((m) => { memberByMonth[m.payout_month] = m; });

  const paidIdx = {};
  pays.forEach((p) => { if (p.paid) paidIdx[p.member_id + ':' + p.month] = p; });

  function paidCount(month) {
    return members.reduce((c, m) => c + (paidIdx[m.id + ':' + month] ? 1 : 0), 0);
  }

  const today = new Date();
  const [sy, sm] = chit.start_year_month.split('-').map(Number);
  const monthsElapsed = (today.getFullYear() - sy) * 12 + (today.getMonth() + 1 - sm);
  const currentMonth  = Math.max(1, Math.min(chit.num_months, monthsElapsed + 1));

  const totalPotPerMonth = Number(chit.monthly_amount) * members.length;
  const memberCount      = members.length;
  const completeMonths   = monthsArr.filter((m) => paidCount(m) === memberCount && memberCount > 0).length;

  return (
    <div className="page" style={{ paddingTop: 26 }}>
      <div className="section-h">
        <h1><BL en={chit.name} te="" /></h1>
        <span style={{ flex: 1 }} />
        <button className="ghost tiny" onClick={() => setEditChit(true)}>Edit</button>
      </div>

      {/* Summary card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row between">
          <div className="col">
            <span className="micro"><BL en="Monthly payment" te="నెలవారీ" /></span>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>
              {db.fmtINR(chit.monthly_amount)}
            </div>
          </div>
          <div className="col" style={{ alignItems: 'center' }}>
            <span className="micro"><BL en="Members" te="సభ్యులు" /></span>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>
              {memberCount}<span className="fade" style={{ fontSize: 14 }}> / {chit.num_months}</span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end' }}>
            <span className="micro"><BL en="Pot / month" te="మొత్తం" /></span>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
              {db.fmtINRshort(totalPotPerMonth)}
            </div>
          </div>
        </div>
        <div className="bar gold" style={{ marginTop: 14 }}>
          <span style={{ width: ((completeMonths / chit.num_months) * 100) + '%' }} />
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="small">
            <span className="num">{completeMonths}</span>
            <span className="fade"> of {chit.num_months} months complete</span>
          </span>
          <span className="small num gold">
            {db.ymToLabel(db.addMonths(chit.start_year_month, currentMonth - 1))}
          </span>
        </div>
      </div>

      {/* Month grid */}
      <div className="section-h">
        <h3><BL en="Months" te="నెలలు" /></h3>
        <span style={{ flex: 1 }} />
        <span className="small fade">tap to manage</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
        {monthsArr.map((m) => {
          const recipient = memberByMonth[m];
          const paid      = paidCount(m);
          const full      = memberCount > 0 && paid === memberCount;
          const isCurrent = m === currentMonth;
          const payoutDone = recipient?.payout_paid;
          return (
            <button key={m} onClick={() => setOpenMonth(m)} style={{
              background: full ? 'rgba(74,124,89,.12)' : isCurrent ? 'rgba(182,131,64,.12)' : 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid ' + (full ? 'var(--success)' : isCurrent ? 'var(--gold)' : 'var(--border)'),
              borderRadius: 8, padding: '10px 6px', textAlign: 'left',
              cursor: 'pointer', minHeight: 78,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              fontWeight: 400,
            }}>
              <div className="row between" style={{ gap: 4 }}>
                <span className="num" style={{ fontWeight: 600, fontSize: 18 }}>
                  {String(m).padStart(2, '0')}
                </span>
                {full ? <span style={{ color: 'var(--success)', fontSize: 12 }}>✓</span> : null}
              </div>
              <div style={{ fontSize: 11, color: 'var(--soft)', lineHeight: 1.2, marginTop: 4 }}>
                {recipient
                  ? <span style={{ color: payoutDone ? 'var(--success)' : 'var(--ink)' }}>
                      {recipient.name.length > 10 ? recipient.name.slice(0, 9) + '…' : recipient.name}
                    </span>
                  : <span className="fade ital">unset</span>}
              </div>
              <div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                {paid}/{memberCount}
              </div>
            </button>
          );
        })}
      </div>

      {/* Members list */}
      <div className="section-h">
        <h3><BL en="Members" te="సభ్యులు" /></h3>
        <span style={{ flex: 1 }} />
        <button className="ghost tiny" onClick={() => setShowAddMember(true)}>+ Add</button>
      </div>

      {members.length === 0 ? (
        <div className="empty">
          <BL en="No members yet — add up to" te="సభ్యులను చేర్చండి —" /> {chit.num_months}.
        </div>
      ) : (
        <div className="col" style={{ gap: 6 }}>
          {members.map((m) => {
            const paid    = pays.filter((p) => p.member_id === m.id && p.paid).length;
            const allPaid = paid === chit.num_months;
            return (
              <div key={m.id} className="row between" onClick={() => setEditMember(m)} style={{
                padding: '10px 12px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
              }}>
                <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                  <span className="num" style={{ width: 28, textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>
                    {String(m.payout_month).padStart(2, '0')}
                  </span>
                  <div className="col" style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <span className="small fade">
                      payout <span className="num">{db.fmtINR(m.payout_amount)}</span>
                      {m.payout_paid ? <span className="green"> · received</span> : null}
                    </span>
                  </div>
                </div>
                <span className={'small num ' + (allPaid ? 'green' : 'fade')}>
                  {paid}/{chit.num_months}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheets */}
      <Sheet open={openMonth != null} onClose={() => setOpenMonth(null)}
             title={openMonth ? `Month ${String(openMonth).padStart(2,'0')} · ${db.ymToLabel(db.addMonths(chit.start_year_month, openMonth - 1))}` : ''}
             te="నెల">
        {openMonth ? (
          <MonthSheet
            chit={chit} month={openMonth} members={members}
            pays={pays.filter((p) => p.month === openMonth)}
            recipient={memberByMonth[openMonth]}
            onChange={load}
          />
        ) : null}
      </Sheet>

      <Sheet open={showAddMember} onClose={() => setShowAddMember(false)} title="Add member" te="కొత్త సభ్యులు">
        <MemberForm chit={chit} existingMonths={members.map((m) => m.payout_month)}
                    onSaved={() => { setShowAddMember(false); load(); }} />
      </Sheet>

      <Sheet open={!!editMember} onClose={() => setEditMember(null)}
             title={editMember ? editMember.name : ''} te="మార్చు">
        {editMember ? (
          <MemberForm
            chit={chit} initial={editMember}
            existingMonths={members.filter((m) => m.id !== editMember.id).map((m) => m.payout_month)}
            onSaved={() => { setEditMember(null); load(); }}
            onDeleted={() => { setEditMember(null); load(); }}
          />
        ) : null}
      </Sheet>

      <Sheet open={editChit} onClose={() => setEditChit(false)} title="Edit chit" te="మార్చు">
        <ChitForm initial={chit} onSaved={() => { setEditChit(false); load(); }} />
      </Sheet>
    </div>
  );
}

function MonthSheet({ chit, month, members, pays, recipient, onChange }) {
  const paidIdx = {};
  pays.forEach((p) => { if (p.paid) paidIdx[p.member_id] = p; });

  async function toggle(m) {
    const cur = paidIdx[m.id];
    try {
      await db.setChitPayment({
        chit_id: chit.id, member_id: m.id, month,
        paid: !cur,
        amount: cur ? null : Number(chit.monthly_amount),
        date: cur ? null : db.todayISO(),
      });
      onChange();
    } catch { toast("Couldn't update"); }
  }

  async function togglePayout() {
    if (!recipient) return;
    try {
      await db.upsertMember({
        id: recipient.id, chit_id: recipient.chit_id,
        name: recipient.name, payout_month: recipient.payout_month,
        payout_amount: recipient.payout_amount,
        payout_paid: !recipient.payout_paid,
        payout_paid_date: recipient.payout_paid ? null : db.todayISO(),
      });
      onChange();
    } catch { toast("Couldn't update"); }
  }

  const collected    = members.reduce((s, m) => s + (paidIdx[m.id] ? Number(paidIdx[m.id].amount || chit.monthly_amount) : 0), 0);
  const totalNeeded  = members.length * Number(chit.monthly_amount);

  return (
    <div>
      {recipient ? (
        <div className="card" style={{
          marginBottom: 14,
          background: recipient.payout_paid ? 'rgba(74,124,89,.08)' : 'var(--surface)',
          borderColor: recipient.payout_paid ? 'var(--success)' : 'var(--gold)',
        }}>
          <span className="micro" style={{ color: 'var(--gold)' }}>
            <BL en="This month's recipient" te="ఈ నెల పేకాలువారు" />
          </span>
          <div className="row between" style={{ marginTop: 4 }}>
            <div className="col">
              <div style={{ fontSize: 20, fontWeight: 600 }}>{recipient.name}</div>
              <div className="small">
                <BL en="receives" te="పొందుతారు" />{' '}
                <span className="num gold" style={{ fontWeight: 600 }}>{db.fmtINR(recipient.payout_amount)}</span>
              </div>
            </div>
            <button onClick={togglePayout} className={recipient.payout_paid ? 'ghost' : ''} style={{
              ...(recipient.payout_paid
                ? { color: 'var(--success)', borderColor: 'var(--success)' }
                : { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#FFF' }),
            }}>
              {recipient.payout_paid ? '✓ Paid out' : 'Mark paid out'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card ital small" style={{ marginBottom: 14, color: 'var(--soft)' }}>
          No member assigned to month {month}. Set one in the members list.
        </div>
      )}

      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="small">
          <BL en="Collected" te="వసూలు" />:{' '}
          <span className="num" style={{ fontWeight: 600 }}>{db.fmtINR(collected)}</span>
          <span className="fade"> / {db.fmtINR(totalNeeded)}</span>
        </span>
        <span className="small num">{Object.keys(paidIdx).length}/{members.length}</span>
      </div>

      <div className="col" style={{ gap: 0 }}>
        {members.map((m) => {
          const paid = !!paidIdx[m.id];
          return (
            <div key={m.id} className="row between" style={{ padding: '10px 4px', borderBottom: '1px dashed var(--border)' }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                <span className="num fade" style={{ width: 24 }}>{String(m.payout_month).padStart(2, '0')}</span>
                <span style={{ fontWeight: paid ? 500 : 400 }}>{m.name}</span>
              </div>
              <button onClick={() => toggle(m)} className={paid ? '' : 'ghost'} style={{
                ...(paid ? { background: 'var(--success)' } : {}),
                padding: '6px 12px', fontSize: 13,
              }}>
                {paid ? '✓ Paid' : 'Mark paid'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChitForm({ initial, onSaved }) {
  const [name,    setName]    = useState(initial?.name || 'Main chit');
  const [monthly, setMonthly] = useState(initial ? String(initial.monthly_amount) : '5000');
  const [num,     setNum]     = useState(initial ? String(initial.num_months) : '20');
  const defaultYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
  const [start,   setStart]   = useState(initial?.start_year_month || defaultYM());
  const [busy,    setBusy]    = useState(false);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return toast('Name?');
    setBusy(true);
    try {
      const data = { name: name.trim(), monthly_amount: Number(monthly), num_months: Number(num), start_year_month: start };
      if (initial) await db.updateChit(initial.id, data);
      else         await db.createChit(data);
      onSaved();
    } catch { toast("Couldn't save"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <Field label="Name" te="పేరు">
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Monthly amount" te="నెలవారీ">
          <input type="number" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} required />
        </Field>
        <Field label="Months" te="నెలలు">
          <input type="number" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} required />
        </Field>
      </div>
      <Field label="Start month" te="ప్రారంభం" hint="YYYY-MM">
        <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2024-01" required />
      </Field>
      <button type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Saving…' : initial ? 'Save' : 'Create chit'}
      </button>
    </form>
  );
}

function MemberForm({ chit, initial, existingMonths, onSaved, onDeleted }) {
  const [name,   setName]   = useState(initial?.name || '');
  const [phone,  setPhone]  = useState(initial?.phone || '');
  const [month,  setMonth]  = useState(initial ? String(initial.payout_month) : '');
  const [payout, setPayout] = useState(initial ? String(initial.payout_amount) : '');
  const [notes,  setNotes]  = useState(initial?.notes || '');
  const [busy,   setBusy]   = useState(false);

  const allMonths  = Array.from({ length: chit.num_months }, (_, i) => i + 1);
  const freeMonths = allMonths.filter((m) => !existingMonths.includes(m));

  async function save(e) {
    e.preventDefault();
    const monthNum = Number(month);
    if (!name.trim() || !monthNum) return toast('Name and month?');
    if (existingMonths.includes(monthNum)) return toast('Month already taken');
    setBusy(true);
    try {
      await db.upsertMember({
        id: initial?.id, chit_id: chit.id,
        name: name.trim(), phone: phone.trim() || null,
        payout_month: monthNum, payout_amount: Number(payout) || 0,
        payout_paid: initial?.payout_paid || false,
        payout_paid_date: initial?.payout_paid_date || null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch { toast("Couldn't save"); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!initial) return;
    if (!confirm(`Remove ${initial.name} from the chit?`)) return;
    setBusy(true);
    try { await db.deleteMember(initial.id); onDeleted?.(); }
    catch { toast("Couldn't delete"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <Field label="Name" te="పేరు">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
      </Field>
      <Field label="Phone" te="ఫోన్" hint="optional">
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Payout month" te="నెల">
          <select value={month} onChange={(e) => setMonth(e.target.value)} required>
            <option value="">—</option>
            {initial ? <option value={initial.payout_month}>{initial.payout_month} (current)</option> : null}
            {freeMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Payout ₹" te="మొత్తం">
          <input type="number" inputMode="numeric" value={payout} onChange={(e) => setPayout(e.target.value)} required />
        </Field>
      </div>
      <Field label="Notes" te="గమనికలు" hint="optional">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" disabled={busy} style={{ flex: 1 }}>
          {busy ? 'Saving…' : initial ? 'Save' : 'Add member'}
        </button>
        {initial ? (
          <button type="button" className="ghost" onClick={del} disabled={busy}
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
