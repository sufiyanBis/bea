import { create } from 'zustand';
import { load, save } from '../lib/storage';
import { bus } from '../lib/eventBus';

export interface AuditEntry { id: string; ts: string; actor: string; action: string; detail: string }

const KEY = 'nb.audit';
const SEED: AuditEntry[] = [
  { id: 'a9', ts: '2026-11-02T09:14:00Z', actor: 'Simone Hartley', action: 'Settings changed', detail: 'CSV exports: prototype notice line turned on' },
  { id: 'a8', ts: '2026-10-29T16:02:00Z', actor: 'Rajesh Kanwar', action: 'Export over allowance', detail: 'Companies in the UK (all): 26,400 rows, 1,400 over the allowance' },
  { id: 'a7', ts: '2026-10-21T11:40:00Z', actor: 'Imogen Pryce', action: 'User deactivated', detail: 'Theo Marchetti' },
  { id: 'a6', ts: '2026-10-08T08:55:00Z', actor: 'Simone Hartley', action: 'Role changed', detail: 'Imogen Pryce: Member → Administrator' },
  { id: 'a5', ts: '2026-09-30T13:20:00Z', actor: 'Simone Hartley', action: 'User added', detail: 'Lucy Fairbairn (lucy.fairbairn@example.org) invited as Member' },
  { id: 'a4', ts: '2026-09-30T13:18:00Z', actor: 'Simone Hartley', action: 'User removed', detail: 'Oscar Bellweather (oscar.bellweather@example.org)' },
  { id: 'a3', ts: '2026-07-14T10:05:00Z', actor: 'Rajesh Kanwar', action: 'Invite resent', detail: 'Ibrahim Saleh (ibrahim.saleh@example.org)' },
  { id: 'a2', ts: '2026-03-02T09:00:00Z', actor: 'System', action: 'Settings changed', detail: 'Idle session timeout set to 30 minutes' },
  { id: 'a1', ts: '2025-11-10T09:00:00Z', actor: 'System', action: 'User added', detail: 'Organisation created with 30 licences' },
];

interface State { entries: AuditEntry[]; add: (e: Omit<AuditEntry, 'id' | 'ts'>) => void }
export const useAudit = create<State>((set, get) => ({
  entries: load<AuditEntry[]>(KEY, SEED),
  add: (e) => { const entries = [{ ...e, id: `a${Date.now().toString(36)}`, ts: new Date().toISOString() }, ...get().entries].slice(0, 500); save(KEY, entries); set({ entries }); },
}));

/** Anything can log an audit entry by emitting `audit` on the bus. */
bus.on((name, p) => {
  if (name !== 'audit') return;
  const e = p as { action: string; detail: string; actor?: string };
  import('./authStore').then(({ currentUser }) => useAudit.getState().add({ action: e.action, detail: e.detail, actor: e.actor ?? currentUser()?.name ?? 'System' }));
});
