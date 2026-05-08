// Supabase data layer.
// Tables: borrowers, payments, chits, chit_members, chit_payments
// Run schema.sql once in Supabase SQL Editor before using.

import { supabase } from './supabase';

function raise(error) { if (error) throw new Error(error.message); }

// ── Borrowers ────────────────────────────────────────────────────
export async function listBorrowers() {
  const { data, error } = await supabase
    .from('borrowers')
    .select('*')
    .order('created_at', { ascending: false });
  raise(error);
  return data;
}
export async function createBorrower(b) {
  const { data, error } = await supabase.from('borrowers').insert(b).select().single();
  raise(error);
  return data;
}
export async function updateBorrower(id, patch) {
  const { data, error } = await supabase
    .from('borrowers').update(patch).eq('id', id).select().single();
  raise(error);
  return data;
}
export async function deleteBorrower(id) {
  const { error } = await supabase.from('borrowers').delete().eq('id', id);
  raise(error);
}

// ── Payments ─────────────────────────────────────────────────────
export async function listPayments(borrowerId) {
  let q = supabase.from('payments').select('*').order('date', { ascending: false });
  if (borrowerId) q = q.eq('borrower_id', borrowerId);
  const { data, error } = await q;
  raise(error);
  return data;
}
export async function listPaymentsByDate(date) {
  const { data, error } = await supabase
    .from('payments').select('*').eq('date', date);
  raise(error);
  return data;
}
export async function addPayment(p) {
  const { data, error } = await supabase.from('payments').insert(p).select().single();
  raise(error);
  return data;
}
export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  raise(error);
}

// ── Chits ────────────────────────────────────────────────────────
export async function getActiveChit() {
  const { data, error } = await supabase
    .from('chits').select('*').order('created_at', { ascending: false }).limit(1);
  raise(error);
  return data?.[0] ?? null;
}
export async function createChit(c) {
  const { data, error } = await supabase.from('chits').insert(c).select().single();
  raise(error);
  return data;
}
export async function updateChit(id, patch) {
  const { data, error } = await supabase
    .from('chits').update(patch).eq('id', id).select().single();
  raise(error);
  return data;
}
export async function deleteChit(id) {
  await supabase.from('chit_payments').delete().eq('chit_id', id);
  await supabase.from('chit_members').delete().eq('chit_id', id);
  const { error } = await supabase.from('chits').delete().eq('id', id);
  raise(error);
}

// ── Chit members ─────────────────────────────────────────────────
export async function listMembers(chitId) {
  const { data, error } = await supabase
    .from('chit_members').select('*').eq('chit_id', chitId).order('payout_month');
  raise(error);
  return data;
}
export async function upsertMember(m) {
  const { id, ...rest } = m;
  if (id) {
    const { data, error } = await supabase
      .from('chit_members').update(rest).eq('id', id).select().single();
    raise(error);
    return data;
  }
  const { data, error } = await supabase.from('chit_members').insert(rest).select().single();
  raise(error);
  return data;
}
export async function deleteMember(id) {
  const { error } = await supabase.from('chit_members').delete().eq('id', id);
  raise(error);
}

// ── Chit payments ────────────────────────────────────────────────
export async function listChitPayments(chitId) {
  const { data, error } = await supabase
    .from('chit_payments').select('*').eq('chit_id', chitId);
  raise(error);
  return data;
}
export async function setChitPayment(p) {
  const { member_id, month, ...rest } = p;
  const { error } = await supabase
    .from('chit_payments')
    .upsert({ member_id, month, ...rest }, { onConflict: 'member_id,month' });
  raise(error);
}

// ── Audit log ────────────────────────────────────────────────────
export async function listAuditLog(limit = 150) {
  const { data, error } = await supabase
    .from('audit_log').select('*')
    .order('ts', { ascending: false })
    .limit(limit);
  raise(error);
  return data || [];
}

export async function restoreFromAuditLog() {
  const { data: events, error } = await supabase
    .from('audit_log').select('*').order('ts', { ascending: true });
  raise(error);
  if (!events?.length) return 0;

  // Compute the final intended state of every record from the log
  const final = {};
  for (const e of events) {
    const key = `${e.tbl}:${e.rec_id}`;
    if (e.op === 'DELETE') {
      final[key] = { tbl: e.tbl, rec_id: e.rec_id, deleted: true };
    } else {
      final[key] = { tbl: e.tbl, rec_id: e.rec_id, data: e.after };
    }
  }

  const toUpsert = {};
  const toDelete = {};
  for (const v of Object.values(final)) {
    if (v.deleted) {
      (toDelete[v.tbl] ??= []).push(v.rec_id);
    } else {
      (toUpsert[v.tbl] ??= []).push(v.data);
    }
  }

  // Upsert surviving records in FK-safe order
  for (const tbl of ['borrowers', 'chits', 'payments', 'chit_members', 'chit_payments']) {
    if (toUpsert[tbl]?.length) {
      const { error } = await supabase.from(tbl).upsert(toUpsert[tbl], { onConflict: 'id' });
      raise(error);
    }
  }
  // Delete removed records in reverse FK order (children first)
  for (const tbl of ['chit_payments', 'chit_members', 'payments', 'chits', 'borrowers']) {
    if (toDelete[tbl]?.length) {
      const { error } = await supabase.from(tbl).delete().in('id', toDelete[tbl]);
      raise(error);
    }
  }

  return Object.keys(final).length;
}

// ── Backup / restore ──────────────────────────────────────────────
export async function exportAll() {
  const [borrowers, payments, chits, members, chitPayments] = await Promise.all([
    listBorrowers(),
    listPayments(),
    supabase.from('chits').select('*').then(({ data }) => data || []),
    supabase.from('chit_members').select('*').then(({ data }) => data || []),
    supabase.from('chit_payments').select('*').then(({ data }) => data || []),
  ]);
  return { borrowers, payments, chits, members, chitPayments, _exported_at: new Date().toISOString() };
}
export async function importAll(data) {
  const tables = [
    ['borrowers',     data.borrowers],
    ['payments',      data.payments],
    ['chits',         data.chits],
    ['chit_members',  data.members],
    ['chit_payments', data.chitPayments],
  ];
  for (const [table, rows] of tables) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    raise(error);
  }
}
export async function clearAll() {
  for (const table of ['chit_payments', 'chit_members', 'chits', 'payments', 'borrowers']) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    raise(error);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
export const fmtINR = (n) => {
  if (n == null || isNaN(+n)) return '—';
  return '₹' + Math.round(+n).toLocaleString('en-IN');
};
export const fmtINRshort = (n) => {
  if (n == null || isNaN(+n)) return '—';
  const x = Math.abs(+n);
  if (x >= 10000000) return '₹' + (x / 10000000).toFixed(2) + 'Cr';
  if (x >= 100000)   return '₹' + (x / 100000).toFixed(2) + 'L';
  if (x >= 1000)     return '₹' + (x / 1000).toFixed(1) + 'k';
  return '₹' + Math.round(x).toLocaleString('en-IN');
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const ymToLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m-1]} ${y}`;
};
export const addMonths = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  return `${Math.floor(total/12)}-${String((total%12)+1).padStart(2,'0')}`;
};
export const daysBetween = (a, b) => {
  return Math.round(
    (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / (1000 * 60 * 60 * 24)
  );
};
