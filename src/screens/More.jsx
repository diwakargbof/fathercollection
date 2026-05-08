import { useState, useRef } from 'react';
import { BL, Sheet, toast } from '../components/ui';
import * as db from '../db';

export default function MoreScreen() {
  const [showBackup, setShowBackup] = useState(false);

  return (
    <div className="page" style={{ paddingTop: 26 }}>
      <div className="section-h"><h1><BL en="More" te="ఇంకా" /></h1></div>

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
          <p className="te" style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.6, color: 'var(--soft)' }}>
            మీరు మళ్లీ మీలా తయారవుతారు, నాన్న.
          </p>
          <div className="micro" style={{ marginTop: 22, color: 'var(--accent)' }}>
            — <BL en="from your child" te="మీ బిడ్డ" />
          </div>
        </div>
      </div>

      {/* About */}
      <div className="section-h"><h3><BL en="About" te="గురించి" /></h3></div>
      <div className="card small" style={{ marginBottom: 18, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          A small ledger for Nanna's daily lending and chit work.
          Every payment you tap stays on this device.
        </p>
        <p style={{ margin: '8px 0 0' }} className="te">
          నాన్న గారి రోజువారీ అప్పులు, చిట్టీ కోసం.
        </p>
      </div>

      {/* Backup / restore */}
      <div className="section-h"><h3><BL en="Backup" te="బ్యాకప్" /></h3></div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row between">
          <div className="col">
            <span style={{ fontWeight: 500 }}>Save / restore your data</span>
            <span className="small">Download a backup file, or load one in.</span>
          </div>
          <button className="ghost tiny" onClick={() => setShowBackup(true)}>Open</button>
        </div>
      </div>

      <Sheet open={showBackup} onClose={() => setShowBackup(false)} title="Backup" te="బ్యాకప్">
        <BackupSheet onDone={() => setShowBackup(false)} />
      </Sheet>
    </div>
  );
}

function BackupSheet({ onDone }) {
  const fileRef = useRef(null);

  function download() {
    const data = db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `nanna-ledger-${db.todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('Replace current data with this backup?')) return;
        db.importAll(data);
        toast('Restored ✓');
        onDone();
        setTimeout(() => location.reload(), 400);
      } catch { toast("Couldn't read that file"); }
    };
    reader.readAsText(f);
  }

  function clearAll() {
    if (!confirm("Delete ALL data on this device? This can't be undone.")) return;
    db.clearAll();
    toast('Cleared');
    setTimeout(() => location.reload(), 400);
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Data is stored on this device only. Download a backup file once in a while — keep it safe.
      </div>
      <div className="col" style={{ gap: 10 }}>
        <button onClick={download}>Download backup</button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>Restore from file…</button>
        <input ref={fileRef} type="file" accept="application/json"
               onChange={handleFile} style={{ display: 'none' }} />
        <hr className="rule" />
        <button className="ghost" onClick={clearAll}
          style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)' }}>
          Erase all data
        </button>
      </div>
    </div>
  );
}
