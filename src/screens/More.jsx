import { useState, useRef } from 'react';
import { Sheet, toast } from '../components/ui';
import * as db from '../db';

export default function MoreScreen() {
  const [showBackup, setShowBackup] = useState(false);

  return (
    <div className="page" style={{ paddingTop: 26 }}>
      <div className="section-h"><h1>More</h1></div>

      {/* Personal note from child */}
      <div style={{
        marginBottom: 28, padding: '28px 24px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, position: 'relative', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          position: 'absolute', top: 12, left: 18,
          color: 'var(--accent)', fontSize: 44, lineHeight: 1,
          fontFamily: 'Georgia, serif', opacity: .35, fontWeight: 700,
        }}>"</div>
        <div style={{ paddingLeft: 22, paddingTop: 12 }}>
          <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, fontWeight: 500 }}>
            You will be back to who you were earlier, Nanna.
          </p>
          <div className="micro" style={{ marginTop: 22, color: 'var(--accent)' }}>
            — from your child
          </div>
        </div>
      </div>

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

      <Sheet open={showBackup} onClose={() => setShowBackup(false)} title="Backup">
        <BackupSheet onDone={() => setShowBackup(false)} />
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
