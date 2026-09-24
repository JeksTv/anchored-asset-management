'use client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
const when = (v: string) => (v ? new Date(v).toLocaleString() : '—');
const localInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
async function api(body?: unknown) {
  const r = await fetch('/api/borrowing', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d: any = await r.json();
  if (!r.ok) throw Error(d.error || 'Request failed.');
  return d;
}
export function Borrowing({
  employeeId = '',
  assetId = '',
  employees = [],
  assets = [],
  refresh,
  version,
  summary = false,
  onOpen,
}: {
  employeeId?: string;
  assetId?: string;
  employees?: any[];
  assets?: any[];
  refresh?: () => unknown;
  version?: string;
  summary?: boolean;
  onOpen?: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [canEdit, setCanEdit] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All'),
    [page, setPage] = useState(1),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState(''),
    [action, setAction] = useState(''),
    [itemId, setItemId] = useState(''),
    [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const q = new URLSearchParams({ employeeId, assetId });
    const r = await fetch('/api/borrowing?' + q);
    const d: any = await r.json();
    if (!r.ok) throw Error(d.error);
    setRows(d.rows);
    setCanEdit(d.canEdit);
    setReady(true);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const t = setInterval(() => load().catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [employeeId, assetId, version]);
  const active = rows.filter((r) =>
    ['Reserved', 'Borrowed'].includes(r.status),
  );
  const chosen = rows.find((r) => r.id === selected);
  async function submit(body: any) {
    setBusy(true);
    setError('');
    try {
      await api(body);
      await load();
      await refresh?.();
      setCreating(false);
      setAction('');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.currentTarget));
    submit({
      ...b,
      action: 'create',
      starts_at: new Date(String(b.starts_at)).toISOString(),
      due_at: new Date(String(b.due_at)).toISOString(),
      items,
    });
  }
  function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.currentTarget));
    submit({
      ...b,
      action,
      id: chosen.id,
      version: chosen.version,
      item_id: itemId,
      confirmed: b.confirmed === 'on',
    });
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = new FormData(form);
    body.set('id', chosen.id);
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/borrowing', { method: 'POST', body });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (summary)
    return (
      <section className="panel">
        <h2>Temporary borrowing</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p>
            {active.filter((r) => r.display_status === 'Overdue').length}{' '}
            overdue ·{' '}
            {active.filter((r) => r.display_status === 'Due today').length} due
            today · {active.filter((r) => r.status === 'Reserved').length}{' '}
            reservations
          </p>
        )}
        <button className="secondary" onClick={onOpen}>
          View borrowing tracker
        </button>
      </section>
    );
  const filtered = rows.filter(
    (r) =>
      (filter === 'All' || r.display_status === filter) &&
      `${r.name} ${r.code} ${r.purpose} ${r.id} ${r.items.map((i: any) => i.asset.name + ' ' + i.asset.tag).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages);
  return (
    <section className="panel borrowing-module">
      <div className="section-head">
        <h2>Temporary borrowing</h2>
        {canEdit && !employeeId && !assetId && (
          <button
            className="primary"
            onClick={() => {
              setItems([]);
              setError('');
              setCreating(true);
            }}
          >
            New borrowing
          </button>
        )}
        <button
          className="secondary"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh borrowings
        </button>
      </div>
      <p>
        Track short-term hardware loans separately from permanent assignments.
        All displayed times use this device’s local time.
      </p>
      {active.length > 0 && (
        <p className="notice">
          {active.length} outstanding loan(s). Return borrowed items or cancel
          reservations before clearance.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="toolbar">
        <label className="field">
          Search borrowings
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Employee, item, tag or reference"
          />
        </label>
        <label className="field">
          Borrowing status
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            {[
              'All',
              'Reserved',
              'Borrowed',
              'Due today',
              'Overdue',
              'Returned',
              'Cancelled',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="access-table">
        <table>
          <thead>
            <tr>
              <th>Employee / reference</th>
              <th>Items</th>
              <th>Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((current - 1) * 8, current * 8).map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}
                  <small>{r.id.slice(0, 8)}</small>
                </td>
                <td>
                  {r.items.map((i: any) => i.asset.tag).join(', ')}
                  <small>
                    {r.items.filter((i: any) => i.returned_at).length} /{' '}
                    {r.items.length} returned
                  </small>
                </td>
                <td>{when(r.due_at)}</td>
                <td>
                  <span className="badge">{r.display_status}</span>
                </td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSelected(r.id);
                      setAction('');
                      setError('');
                    }}
                  >
                    Details / forms
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p>{ready ? 'No matching borrowings.' : 'Loading borrowings…'}</p>
      )}
      <div className="form-actions">
        <button
          className="secondary"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <span>
          Page {current} of {pages} · {filtered.length} loans
        </span>
        <button
          className="secondary"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      <Dialog
        open={creating}
        onOpenChange={(v) => {
          if (!busy) setCreating(v);
        }}
      >
        <DialogContent className="!max-w-3xl">
          <DialogTitle>New temporary borrowing</DialogTitle>
          <DialogDescription>
            Reserve items now, then record their release when handed to the
            employee. Reservations hold equipment immediately.
          </DialogDescription>
          <form onSubmit={create}>
            <div className="form-grid">
              <label className="field full">
                Employee
                <select name="employee_id" required>
                  <option value="">Choose employee</option>
                  {employees
                    .filter((e) => ['Active', 'Onboarding'].includes(e.status))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.code}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Borrowing starts
                <input
                  name="starts_at"
                  type="datetime-local"
                  required
                  defaultValue={localInput()}
                />
              </label>
              <label className="field">
                Expected return
                <input name="due_at" type="datetime-local" required />
              </label>
              <label className="field full">
                Purpose
                <textarea name="purpose" required maxLength={2000} />
              </label>
            </div>
            <label className="field">
              Add hardware
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    setItems([
                      ...items,
                      {
                        asset_id: e.target.value,
                        condition_out: 'Good',
                        accessories: '',
                      },
                    ]);
                }}
              >
                <option value="">Choose available hardware</option>
                {assets
                  .filter(
                    (a) =>
                      a.kind === 'Hardware' &&
                      a.state === 'Ready' &&
                      !a.borrow_status &&
                      !items.some((i) => i.asset_id === a.id),
                  )
                  .map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.tag} · {a.name}
                    </option>
                  ))}
              </select>
            </label>
            {items.map((i, index) => (
              <fieldset className="borrowing-item" key={i.asset_id}>
                <legend>
                  {assets.find((a) => a.id === i.asset_id)?.tag} ·{' '}
                  {assets.find((a) => a.id === i.asset_id)?.name}
                </legend>
                <label className="field">
                  Condition at issue
                  <input
                    required
                    maxLength={2000}
                    value={i.condition_out}
                    onChange={(e) =>
                      setItems(
                        items.map((x, n) =>
                          n === index
                            ? { ...x, condition_out: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  Included accessories / quantities
                  <textarea
                    maxLength={2000}
                    placeholder="e.g. 1 charger, 1 bag"
                    value={i.accessories}
                    onChange={(e) =>
                      setItems(
                        items.map((x, n) =>
                          n === index
                            ? { ...x, accessories: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setItems(items.filter((_, n) => n !== index))}
                >
                  Remove item
                </button>
              </fieldset>
            ))}
            {error && <p role="alert">{error}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy || !items.length}>
                Reserve items
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!chosen}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setSelected('');
            setAction('');
          }
        }}
      >
        <DialogContent className="!max-w-3xl">
          <DialogTitle>Borrowing details & forms</DialogTitle>
          <DialogDescription>
            Review release, returns, signed documents and history.
          </DialogDescription>
          {chosen && (
            <>
              <p>
                <strong>{chosen.name}</strong> · {chosen.code}
                <br />
                Reference: {chosen.id}
                <br />
                {chosen.display_status} · Due {when(chosen.due_at)}
              </p>
              <p>{chosen.purpose}</p>
              <a
                className="secondary"
                href={'/api/borrowing?print=' + encodeURIComponent(chosen.id)}
                target="_blank"
                rel="noreferrer"
              >
                Print borrowing / return form
              </a>
              <p>
                Print, obtain signatures, then attach the signed copy below.
              </p>
              {chosen.items.map((i: any) => (
                <div className="borrowing-item" key={i.id}>
                  <strong>
                    {i.asset.name} · {i.asset.tag}
                  </strong>
                  <p>
                    Issued condition: {i.condition_out}
                    <br />
                    Accessories: {i.accessories || 'None recorded'}
                  </p>
                  {i.returned_at ? (
                    <p>
                      Returned {when(i.returned_at)} · {i.condition_in}
                      <br />
                      Received by {i.received_by} · {i.return_note}
                    </p>
                  ) : (
                    <>
                      <p>{chosen.status==='Reserved'?'Reserved — not issued':chosen.status==='Cancelled'?'Cancelled — not issued':'Outstanding'}</p>
                      {canEdit && chosen.status === 'Borrowed' && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            setAction('return');
                            setItemId(i.id);
                          }}
                        >
                          Return {i.asset.tag}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {canEdit && chosen.status === 'Reserved' && (
                <div className="form-actions">
                  <button
                    className="primary"
                    onClick={() => setAction('release')}
                  >
                    Release items
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setAction('cancel')}
                  >
                    Cancel reservation
                  </button>
                </div>
              )}
              {canEdit && action && (
                <form onSubmit={change} className="borrowing-item">
                  <h3>
                    {action === 'return'
                      ? 'Receive ' +
                        chosen.items.find((i: any) => i.id === itemId)?.asset
                          .tag
                      : action === 'release'
                        ? 'Confirm release'
                        : 'Cancel reservation'}
                  </h3>
                  {action === 'return' && (
                    <label className="field">
                      Return condition
                      <select name="condition_in">
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Damaged</option>
                      </select>
                    </label>
                  )}
                  {action !== 'release' && (
                    <label className="field">
                      {action === 'cancel'
                        ? 'Cancellation reason'
                        : 'Return notes (required for damage)'}
                      <textarea
                        name="note"
                        maxLength={2000}
                        required={action === 'cancel'}
                      />
                    </label>
                  )}
                  {action !== 'cancel' && (
                    <label>
                      <input type="checkbox" name="confirmed" required />{' '}
                      {action === 'release'
                        ? 'I confirm these items and listed accessories were handed to this employee.'
                        : 'IT received this item and all listed accessories. Leave it outstanding if anything is missing.'}
                    </label>
                  )}
                  <p>
                    {action === 'return'
                      ? 'Damaged returns are placed under maintenance for inspection.'
                      : ''}
                  </p>
                  <button className="primary" disabled={busy}>
                    Confirm {action}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setAction('')}
                  >
                    Back
                  </button>
                </form>
              )}
              <h3>Signed forms</h3>
              {chosen.files.map((f: any) => (
                <p key={f.id}>
                  <a href={'/api/borrowing?file=' + encodeURIComponent(f.id)}>
                    {f.kind} · {f.name}
                  </a>
                  <small>
                    Uploaded by {f.uploaded_by} · {when(f.created_at)}
                  </small>
                </p>
              ))}
              {!chosen.files.length && <p>No signed copies attached yet.</p>}
              {canEdit && (
                <form onSubmit={upload}>
                  <label className="field">
                    Form type
                    <select name="kind">
                      <option>Borrowing</option>
                      <option>Return</option>
                    </select>
                  </label>
                  <label className="field">
                    Signed copy (PDF, PNG, JPEG; up to 5 MB)
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf,image/png,image/jpeg"
                      required
                    />
                  </label>
                  <button className="secondary" disabled={busy}>
                    Attach signed form
                  </button>
                </form>
              )}
              <h3>History</h3>
              {chosen.history.map((h: any, n: number) => (
                <p key={n}>
                  {h.action} · {h.actor}
                  <small>{when(h.created_at)}</small>
                </p>
              ))}
              {error && <p role="alert">{error}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
