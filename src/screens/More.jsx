import { useState, useEffect, useRef } from 'react';
import { Sheet, Spinner, toast } from '../components/ui';
import * as db from '../db';

export default function MoreScreen() {
  const [showBackup, setShowBackup] = useState(false);
  const [showAudit,  setShowAudit]  = useState(false);

  return (
    <div className="page" style={{ paddingTop: 26 }}>
      <div className="section-h"><h1>More</h1></div>

      {/* About */}
      <div className="section-h"><h3>About</h3></div>
      <div className="card small" style={{ marginBottom: 18, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          A small ledger for Nanna's daily lending and chit work.
          Every payment you tap syncs to the server.
        </p>
      </div>

      {/* Backup */}
      <div className="section-h"><h3>Backup</h3></div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between">
          <div className="col">
            <span style={{ fontWeight: 500 }}>Save / restore your data</span>
            <span className="small">Download a JSON backup, or restore from one.</span>
          </div>
          <button className="ghost tiny" onClick={() => setShowBackup(true)}>Open</button>
        </div>
      </div>

      {/* Audit log */}
      <div className="section-h"><h3>Audit log</h3></div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between">
          <div className="col">
            <span style={{ fontWeight: 500 }}>Every change, recorded</span>
            <span className="small">View or replay the full operation history.</span>
          </div>
          <button className="ghost tiny" onClick={() => setShowAudit(true)}>View</button>
        </div>
      </div>

      <Sheet open={showBackup} onClose={() => setShowBackup(false)} title="Backup">
        <BackupSheet onDone={() => setShowBackup(false)} />
      </Sheet>

      <Sheet open={showAudit} onClose={() => setShowAudit(false)} title="Audit log">
        <AuditLogSheet />
      </Sheet>
    </div>
  );
}

function BackupSheet({ onDone }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const data = await db.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `nanna-ledger-${db.todayISO()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
    } catch { toast("Couldn't export"); }
    finally { setBusy(false); }
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('Merge this backup into the current data?')) return;
        setBusy(true);
        await db.importAll(data);
        toast('Restored ✓');
        onDone();
      } catch { toast("Couldn't restore — invalid file"); }
      finally { setBusy(false); }
    };
    reader.readAsText(f);
  }

  async function clearAll() {
    if (!confirm("Delete ALL data? This cannot be undone.")) return;
    setBusy(true);
    try {
      await db.clearAll();
      toast('All data cleared');
      onDone();
    } catch { toast("Couldn't clear data"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Download a backup file once in a while and keep it safe.
      </div>
      <div className="col" style={{ gap: 10 }}>
        <button onClick={download} disabled={busy}>Download backup</button>
        <button className="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>Restore from file…</button>
        <input ref={fileRef} type="file" accept="application/json"
               onChange={handleFile} style={{ display: 'none' }} />
        <hr className="rule" />
        <button className="ghost" onClick={clearAll} disabled={busy}
          style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)' }}>
          Erase all data
        </button>
      </div>
    </div>
  );
}

function AuditLogSheet() {
  const [entries, setEntries] = useState(null);
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    db.listAuditLog(150)
      .then(setEntries)
      .catch(() => toast("Couldn't load audit log"));
  }, []);

  async function restore() {
    if (!confirm('Replay the audit log to resync the database?\nThis will upsert all surviving records and remove deleted ones.')) return;
    setBusy(true);
    try {
      const count = await db.restoreFromAuditLog();
      toast(`Resynced ${count} records ✓`);
    } catch { toast("Restore failed"); }
    finally { setBusy(false); }
  }

  function describe(e) {
    const d = e.after || e.before || {};
    switch (e.tbl) {
      case 'borrowers':     return d.name || '—';
      case 'payments':      return `₹${d.amount ?? '?'} · ${d.date ?? ''}`;
      case 'chits':         return d.name || '—';
      case 'chit_members':  return `${d.name || '—'} · month ${d.payout_month ?? '?'}`;
      case 'chit_payments': return `month ${d.month ?? '?'} · ${d.paid ? 'paid' : 'unpaid'}`;
      default:              return d.id || '—';
    }
  }

  function fmtTs(ts) {
    const d = new Date(ts);
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())} ${mo} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const opColor = { INSERT: 'var(--success)', UPDATE: 'var(--gold)', DELETE: 'var(--accent)' };
  const tblLabel = { borrowers: 'borrower', payments: 'payment', chits: 'chit', chit_members: 'member', chit_payments: 'chit pay' };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14, gap: 8 }}>
        <span className="small fade">Last 150 operations · newest first</span>
        <button className="ghost tiny" onClick={restore} disabled={busy}>
          {busy ? 'Resyncing…' : 'Restore DB from log'}
        </button>
      </div>

      {entries === null ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <div className="empty"><div className="glyph">·</div>No entries yet — run schema_audit.sql first.</div>
      ) : (
        <div className="col" style={{ gap: 0 }}>
          {entries.map((e) => (
            <div key={e.id} className="row between" style={{
              padding: '9px 4px', borderBottom: '1px dashed var(--border)', gap: 10,
            }}>
              <div className="col" style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                    color: opColor[e.op] || 'var(--ink)',
                  }}>{e.op}</span>
                  <span className="micro fade">{tblLabel[e.tbl] ?? e.tbl}</span>
                </div>
                <span className="small" style={{
                  color: 'var(--soft)', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {describe(e)}
                </span>
              </div>
              <span className="micro fade" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {fmtTs(e.ts)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
