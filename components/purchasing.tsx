'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { readDetails, type InventoryAsset } from '@/lib/asset-types';
type Supplier = {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  source: string;
  active: number;
  version: number;
};
type Purchase = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  reference: string;
  purchase_date: string;
  description: string;
  amount_cents: number;
  currency: string;
  notes: string;
  status: string;
  version: number;
};
type Arrangement = {
  employee_id: string;
  personal_use: string;
  personal_details: string;
  loan_status: string;
  loan_reference: string;
  loan_date: string;
  loan_details: string;
  notes: string;
  version: number;
};
type Invoice = {
  id: string;
  procurement_id: string;
  name: string;
  size: number;
  created_at: string;
};
type PurchasingData = {
  suppliers: Supplier[];
  procurements: Purchase[];
  links: { procurement_id: string; asset_id: string }[];
  invoices: Invoice[];
  arrangements: Arrangement[];
};
type Employee = {
  id: string;
  name: string;
  code: string;
  department: string;
  status: string;
};
type Assignment = {
  employee_id: string;
  asset_id: string;
  resolved_at: string | null;
};
const initial: PurchasingData = {
  suppliers: [],
  procurements: [],
  links: [],
  invoices: [],
  arrangements: [],
};
type HistoryRow = {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  snapshot: string;
};
async function response<T = Record<string, unknown>>(r: Response): Promise<T> {
  const b = (await r.json()) as T & { error?: string };
  if (!r.ok) throw Error(b.error || 'Unable to complete request.');
  return b;
}
function usePurchasing() {
  const [data, setData] = useState(initial),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function refresh() {
    setData(await response<PurchasingData>(await fetch('/api/purchasing')));
  }
  useEffect(() => {
    const reload = () => {
      refresh()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    };
    reload();
    window.addEventListener('purchasing-changed', reload);
    return () => window.removeEventListener('purchasing-changed', reload);
  }, []);
  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await response(
        await fetch('/api/purchasing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      await refresh();
      window.dispatchEvent(new Event('purchasing-changed'));
      setMessage('Saved successfully.');
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return {
    data,
    error,
    setError,
    loading,
    busy,
    setBusy,
    message,
    setMessage,
    refresh,
    save,
  };
}
function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 8));
  return (
    <div className="detail-actions">
      <button
        className="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {pages} · {total} records
      </span>
      <button
        className="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
function Field({
  name,
  label,
  value = '',
  required = false,
  type = 'text',
  max = 2000,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  type?: string;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      {type === 'text' && (max > 1000 || value.includes('\n')) ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          maxLength={max}
          rows={3}
        />
      ) : (
        <input
          name={name}
          defaultValue={value}
          required={required}
          type={type}
          maxLength={max}
          step={type === 'number' ? '0.01' : undefined}
          min={type === 'number' ? '0' : undefined}
        />
      )}
    </label>
  );
}
function Editor({
  title,
  children,
  onClose,
  busy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="!max-w-3xl max-h-[85vh] overflow-auto">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Save the details below. Changes are retained in history.
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function History({ entity, id }: { entity: string; id: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/purchasing?entity=${entity}&history=${encodeURIComponent(id)}`)
      .then((r) => response<{ history: HistoryRow[] }>(r))
      .then((b) => setRows(b.history))
      .catch((e) => setError(e.message));
  }, [entity, id]);
  return (
    <section>
      <h3>Change history</h3>
      {error && <p role="alert">{error}</p>}
      {rows.map((r) => (
        <details className="purchasing-history" key={r.id}>
          <summary>
            {r.action} · {r.actor} · {new Date(r.created_at).toLocaleString()}
          </summary>
          <dl>
            {Object.entries(JSON.parse(r.snapshot))
              .filter(
                ([k]) =>
                  !['id', 'version', 'employee_id', 'supplier_id'].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replaceAll('_', ' ')}</dt>
                  <dd>
                    {Array.isArray(v)
                      ? v
                          .map((item) =>
                            typeof item === 'object'
                              ? JSON.stringify(item)
                              : String(item),
                          )
                          .join('\n')
                      : String(v ?? '')}
                  </dd>
                </div>
              ))}
          </dl>
        </details>
      ))}
    </section>
  );
}
function InvoiceLinks({ invoices }: { invoices: Invoice[] }) {
  return (
    <>
      {invoices.length ? (
        invoices.map((f) => (
          <p key={f.id}>
            <a
              className="row-link"
              href={`/api/invoices?id=${encodeURIComponent(f.id)}`}
            >
              {f.name} · {Math.ceil(f.size / 1024)} KB
            </a>
          </p>
        ))
      ) : (
        <p>No invoice attached.</p>
      )}
    </>
  );
}

export function Purchasing({
  view,
  assets,
  onAsset,
}: {
  view: 'Suppliers' | 'Procurement';
  assets: InventoryAsset[];
  onAsset: (id: string) => void;
}) {
  const store = usePurchasing(),
    { data, save, error, busy, loading } = store;
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [mode, setMode] = useState(''),
    [selected, setSelected] = useState(''),
    [status, setStatus] = useState('All'),
    [assetSearch, setAssetSearch] = useState(''),
    [assetIds, setAssetIds] = useState<string[]>([]);
  const supplier = data.suppliers.find((s) => s.id === selected),
    purchase = data.procurements.find((p) => p.id === selected);
  const source = view === 'Suppliers' ? data.suppliers : data.procurements;
  const rows = source.filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) &&
      (status === 'All' ||
        ('active' in r ? (r.active ? 'Active' : 'Archived') : r.status) ===
          status),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 8)));
  function open(action: string, id = '') {
    store.setError('');
    setSelected(id);
    setMode(action);
    setAssetSearch('');
    setAssetIds(
      data.links.filter((l) => l.procurement_id === id).map((l) => l.asset_id),
    );
  }
  async function submit(form: HTMLFormElement) {
    const fields = Object.fromEntries(new FormData(form));
    const result = await save({
      ...fields,
      action:
        mode === 'void'
          ? 'voidProcurement'
          : view === 'Suppliers'
            ? 'supplier'
            : 'procurement',
      id: selected,
      version: supplier?.version ?? purchase?.version,
      asset_ids: assetIds,
    });
    if (result) setMode('');
  }
  async function upload(form: HTMLFormElement) {
    store.setBusy(true);
    store.setError('');
    try {
      const fields = new FormData(form);
      fields.set('procurement_id', selected);
      await response(
        await fetch('/api/invoices', { method: 'POST', body: fields }),
      );
      await store.refresh();
      form.reset();
      store.setMessage('Invoice attached.');
    } catch (e) {
      store.setError((e as Error).message);
    } finally {
      store.setBusy(false);
    }
  }
  if (loading) return <p role="status">Loading {view.toLowerCase()}…</p>;
  return (
    <section className="purchasing-module">
      <div className="detail-actions">
        <button className="primary" onClick={() => open('edit')}>
          Add {view === 'Suppliers' ? 'supplier' : 'procurement'}
        </button>
        <button
          className="secondary"
          onClick={() =>
            store.refresh().catch((e) => store.setError(e.message))
          }
        >
          Refresh
        </button>
        <span>
          {source.length} {view.toLowerCase()} records
        </span>
      </div>
      <p>
        {view === 'Suppliers'
          ? 'Supplier contacts and categories. Archive suppliers to retain their procurement history.'
          : 'Purchase records, linked equipment and invoice attachments. Amounts are per procurement record.'}
      </p>
      {store.message && (
        <p className="success" role="status">
          {store.message}
        </p>
      )}
      {error && !mode && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="purchasing-filters">
        <label className="field">
          Search {view.toLowerCase()}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {(view === 'Suppliers'
              ? ['All', 'Active', 'Archived']
              : ['All', 'Recorded', 'Voided']
            ).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="access-table">
        <table>
          <thead>
            <tr>
              {(view === 'Suppliers'
                ? ['Supplier / category', 'Contact', 'Status', 'Actions']
                : [
                    'Date / reference',
                    'Supplier / purchase',
                    'Amount',
                    'Invoices',
                    'Actions',
                  ]
              ).map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * 8, current * 8).map((r) =>
              'active' in r ? (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.category}</small>
                  </td>
                  <td>
                    {r.contact || '—'}
                    <small>{r.email}</small>
                    <small>{r.phone}</small>
                  </td>
                  <td>{r.active ? 'Active' : 'Archived'}</td>
                  <td>
                    <button onClick={() => open('details', r.id)}>
                      Details
                    </button>
                    <button onClick={() => open('edit', r.id)}>Edit</button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        save({
                          action: 'supplierStatus',
                          id: r.id,
                          version: r.version,
                          active: !r.active,
                        })
                      }
                    >
                      {r.active ? 'Archive' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td>
                    {r.purchase_date}
                    <small>
                      {r.reference} · {r.status}
                    </small>
                  </td>
                  <td>
                    {r.supplier_name}
                    <small>{r.description}</small>
                  </td>
                  <td>
                    {r.currency}{' '}
                    {(r.amount_cents / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    {
                      data.invoices.filter((f) => f.procurement_id === r.id)
                        .length
                    }
                  </td>
                  <td>
                    <button onClick={() => open('details', r.id)}>
                      Details / invoices
                    </button>
                    {r.status !== 'Voided' && (
                      <>
                        <button onClick={() => open('edit', r.id)}>Edit</button>
                        <button onClick={() => open('void', r.id)}>Void</button>
                      </>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {!rows.length && <p>No matching records.</p>}
      </div>
      <Pager page={current} total={rows.length} onChange={setPage} />
      {mode && (
        <Editor
          title={
            mode === 'details'
              ? 'Record details'
              : mode === 'void'
                ? 'Void procurement'
                : `${selected ? 'Edit' : 'Add'} ${view === 'Suppliers' ? 'supplier' : 'procurement'}`
          }
          busy={busy}
          onClose={() => setMode('')}
        >
          {mode === 'details' ? (
            <>
              {supplier ? (
                <>
                  <h3>{supplier.name}</h3>
                  <p>{supplier.category}</p>
                  <p className="purchasing-prewrap">{supplier.address}</p>
                  <p>
                    {supplier.contact} · {supplier.email} · {supplier.phone}
                  </p>
                  <p className="purchasing-prewrap">{supplier.notes}</p>
                  <p className="purchasing-prewrap">{supplier.source}</p>
                  <h3>Procurement history</h3>
                  {data.procurements
                    .filter((p) => p.supplier_id === supplier.id)
                    .map((p) => (
                      <div className="purchasing-history" key={p.id}>
                        <strong>
                          {p.purchase_date} · {p.reference} · {p.status}
                        </strong>
                        <p>
                          {p.description} · {p.currency}{' '}
                          {(p.amount_cents / 100).toFixed(2)}
                        </p>
                        <InvoiceLinks
                          invoices={data.invoices.filter(
                            (f) => f.procurement_id === p.id,
                          )}
                        />
                      </div>
                    ))}
                </>
              ) : (
                purchase && (
                  <>
                    <h3>
                      {purchase.reference} · {purchase.supplier_name}
                    </h3>
                    <p>
                      {purchase.purchase_date} · {purchase.status} ·{' '}
                      {purchase.currency}{' '}
                      {(purchase.amount_cents / 100).toFixed(2)}
                    </p>
                    <p>{purchase.description}</p>
                    <p className="purchasing-prewrap">{purchase.notes}</p>
                    <h3>Linked assets</h3>
                    {data.links
                      .filter((l) => l.procurement_id === selected)
                      .map((l) => {
                        const a = assets.find((a) => a.id === l.asset_id);
                        return (
                          <button
                            className="row-link"
                            key={l.asset_id}
                            onClick={() => {
                              setMode('');
                              onAsset(l.asset_id);
                            }}
                          >
                            {a?.tag} · {a?.name}
                          </button>
                        );
                      })}
                    <h3>Invoice attachments</h3>
                    <InvoiceLinks
                      invoices={data.invoices.filter(
                        (f) => f.procurement_id === selected,
                      )}
                    />
                    {purchase.status !== 'Voided' && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void upload(e.currentTarget);
                        }}
                      >
                        <label className="field">
                          Attach invoice (PDF, JPG or PNG; up to 10 MB)
                          <input
                            type="file"
                            name="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            required
                          />
                        </label>
                        <button className="primary" disabled={busy}>
                          {busy ? 'Uploading…' : 'Attach invoice'}
                        </button>
                      </form>
                    )}
                  </>
                )
              )}
              <History
                key={data.invoices.length + selected}
                entity={view === 'Suppliers' ? 'supplier' : 'procurement'}
                id={selected}
              />
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit(e.currentTarget);
              }}
            >
              <div className="form-grid">
                {mode === 'void' ? (
                  <Field
                    name="reason"
                    label="Reason for voiding (record and invoices will be retained)"
                    required
                  />
                ) : view === 'Suppliers' ? (
                  <>
                    {(
                      [
                        'name',
                        'category',
                        'contact',
                        'email',
                        'phone',
                        'address',
                        'notes',
                      ] as const
                    ).map((key) => (
                      <Field
                        key={key}
                        name={key}
                        label={
                          {
                            name: 'Supplier name',
                            category: 'Categories',
                            contact: 'Contact person',
                            email: 'Email address(es)',
                            phone: 'Phone number(s)',
                            address: 'Address',
                            notes: 'Items supplied / notes',
                          }[key]
                        }
                        value={supplier?.[key]}
                        required={key === 'name'}
                        max={
                          key === 'name' || key === 'category'
                            ? 200
                            : key === 'contact' || key === 'phone'
                              ? 300
                              : key === 'email'
                                ? 500
                                : 2000
                        }
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <label className="field">
                      Supplier
                      <select
                        name="supplier_id"
                        required
                        defaultValue={purchase?.supplier_id || ''}
                      >
                        <option value="">Choose a supplier</option>
                        {data.suppliers
                          .filter(
                            (s) => s.active || s.id === purchase?.supplier_id,
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.active ? '' : ' (archived)'}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Field
                      name="reference"
                      label="Invoice / PO reference"
                      value={purchase?.reference}
                      required
                      max={200}
                    />
                    <Field
                      name="purchase_date"
                      label="Purchase date"
                      type="date"
                      value={purchase?.purchase_date}
                      required
                    />
                    <Field
                      name="amount"
                      label="Total amount (including tax)"
                      type="number"
                      value={
                        purchase ? (purchase.amount_cents / 100).toFixed(2) : ''
                      }
                      required
                    />
                    <Field
                      name="currency"
                      label="Currency (e.g. PHP)"
                      value={purchase?.currency || 'PHP'}
                      required
                      max={3}
                    />
                    <Field
                      name="description"
                      label="Purchased items / services"
                      value={purchase?.description}
                      required
                    />
                    <Field name="notes" label="Notes" value={purchase?.notes} />
                    <fieldset className="full purchasing-asset-picker">
                      <legend>
                        Link existing assets ({assetIds.length} selected)
                      </legend>
                      <input
                        aria-label="Find assets to link"
                        placeholder="Search asset tag or name"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                      />
                      <div>
                        {assets
                          .filter(
                            (a) =>
                              a.kind !== 'Account' &&
                              `${a.tag} ${a.name}`
                                .toLowerCase()
                                .includes(assetSearch.toLowerCase()),
                          )
                          .map((a) => (
                            <label key={a.id}>
                              <input
                                type="checkbox"
                                checked={assetIds.includes(a.id)}
                                onChange={(e) =>
                                  setAssetIds((ids) =>
                                    e.target.checked
                                      ? [...ids, a.id]
                                      : ids.filter((id) => id !== a.id),
                                  )
                                }
                              />
                              {a.tag} · {a.name}
                            </label>
                          ))}
                      </div>
                    </fieldset>
                    <p className="full">
                      Save the procurement, then open Details / invoices to
                      attach the invoice.
                    </p>
                  </>
                )}
              </div>
              <div className="form-actions">
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('')}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? 'Saving…'
                    : mode === 'void'
                      ? 'Void and retain history'
                      : 'Save record'}
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Editor>
      )}
    </section>
  );
}

export function LaptopArrangements({
  employees,
  assets,
  assignments,
  onEmployee,
  onAsset,
  fixedEmployee,
}: {
  employees: Employee[];
  assets: InventoryAsset[];
  assignments: Assignment[];
  onEmployee?: (id: string) => void;
  onAsset?: (id: string) => void;
  fixedEmployee?: string;
}) {
  const { data, save, error, setError, busy, loading } = usePurchasing();
  const [selected, setSelected] = useState(''),
    [filter, setFilter] = useState('All employees'),
    [search, setSearch] = useState(''),
    [includeFormer, setIncludeFormer] = useState(false),
    [page, setPage] = useState(1);
  const laptops = assets.filter(
    (a) =>
      a.kind === 'Hardware' &&
      readDetails(a).category?.trim().toLowerCase() === 'laptop',
  );
  const company = (id: string) =>
    laptops.filter((a) =>
      assignments.some(
        (x) => x.asset_id === a.id && x.employee_id === id && !x.resolved_at,
      ),
    );
  const scope = employees.filter((e) =>
    fixedEmployee
      ? e.id === fixedEmployee
      : includeFormer || e.status !== 'Offboarded',
  );
  const matches = (e: Employee, choice: string) => {
    const r = data.arrangements.find((r) => r.employee_id === e.id);
    return choice === 'Company laptop'
      ? company(e.id).length > 0
      : choice === 'Gadget loan'
        ? ['Active', 'Completed'].includes(r?.loan_status || '')
        : choice === 'Personal laptop'
          ? r?.personal_use === 'Yes'
          : choice === 'Needs review'
            ? !company(e.id).length ||
              !r ||
              r.personal_use === 'Unknown' ||
              r.loan_status === 'Unknown'
            : true;
  };
  const rows = scope.filter(
    (e) =>
      matches(e, filter) &&
      `${e.name} ${e.code} ${e.department}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 8))),
    record = data.arrangements.find((r) => r.employee_id === selected),
    person = employees.find((e) => e.id === selected);
  const unlinked = laptops.filter(
    (a) =>
      readDetails(a).custodian &&
      !assignments.some((x) => x.asset_id === a.id && !x.resolved_at),
  );
  if (loading) return <p>Loading laptop arrangements…</p>;
  return (
    <section className="purchasing-module">
      <h2>
        {fixedEmployee ? 'Laptop arrangement' : 'Employee laptop arrangements'}
      </h2>
      <p>
        Company laptops come from current assignments. Gadget loans and personal
        use are recorded separately and may overlap.
      </p>
      {!fixedEmployee && (
        <>
          <div className="inventory-section-stats">
            {[
              'All employees',
              'Company laptop',
              'Gadget loan',
              'Personal laptop',
              'Needs review',
            ].map((label) => (
              <button
                key={label}
                aria-pressed={filter === label}
                onClick={() => {
                  setFilter(label);
                  setPage(1);
                }}
              >
                <span>{label}</span>
                <strong>{scope.filter((e) => matches(e, label)).length}</strong>
              </button>
            ))}
          </div>
          <div className="purchasing-filters">
            <label className="field">
              Search employees
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeFormer}
                onChange={(e) => {
                  setIncludeFormer(e.target.checked);
                  setPage(1);
                }}
              />{' '}
              Include offboarded employees
            </label>
          </div>
          <p>
            Gadget loan includes Active and Completed loans. Needs review
            includes employees without a linked company laptop or with
            unrecorded personal/loan details. {unlinked.length} laptop(s) have
            source custody without an employee link and are excluded from
            employee counts.
          </p>
        </>
      )}
      {error && !selected && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="access-table">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Company laptop</th>
              <th>Gadget loan</th>
              <th>Personal laptop</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * 8, current * 8).map((e) => {
              const r = data.arrangements.find((r) => r.employee_id === e.id),
                issued = company(e.id);
              return (
                <tr key={e.id}>
                  <td>
                    {onEmployee ? (
                      <button
                        className="row-link"
                        onClick={() => onEmployee(e.id)}
                      >
                        {e.name}
                      </button>
                    ) : (
                      e.name
                    )}
                    <small>
                      {e.code} · {e.department} · {e.status}
                    </small>
                  </td>
                  <td>
                    {issued.length
                      ? issued.map((a) => (
                          <div key={a.id}>
                            {onAsset ? (
                              <button
                                className="row-link"
                                onClick={() => onAsset(a.id)}
                              >
                                {a.tag}
                              </button>
                            ) : (
                              a.tag
                            )}
                            <small>
                              {a.name} · {a.state}
                            </small>
                          </div>
                        ))
                      : 'None linked'}
                  </td>
                  <td>
                    {!r || r.loan_status === 'Unknown'
                      ? 'Not recorded'
                      : r.loan_status}
                    <small>{r?.loan_reference}</small>
                  </td>
                  <td>
                    {!r || r.personal_use === 'Unknown'
                      ? 'Not recorded'
                      : r.personal_use}
                    <small>{r?.personal_details}</small>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setError('');
                        setSelected(e.id);
                      }}
                    >
                      Edit arrangement
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p>No employees match this selection.</p>}
      </div>
      {!fixedEmployee && (
        <Pager page={current} total={rows.length} onChange={setPage} />
      )}
      {selected && (
        <Editor
          title={`Laptop arrangement · ${person?.name}`}
          busy={busy}
          onClose={() => setSelected('')}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fields = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await save({
                  ...fields,
                  action: 'laptopArrangement',
                  employee_id: selected,
                  version: record?.version || 0,
                })
              )
                setSelected('');
            }}
          >
            <div className="form-grid">
              <label className="field">
                Uses personal laptop
                <select
                  name="personal_use"
                  defaultValue={record?.personal_use || 'Unknown'}
                >
                  <option value="Unknown">Not recorded</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </label>
              <Field
                name="personal_details"
                label="Personal laptop model / approved use"
                value={record?.personal_details}
              />
              <label className="field">
                Gadget loan status
                <select
                  name="loan_status"
                  defaultValue={record?.loan_status || 'Unknown'}
                >
                  <option value="Unknown">Not recorded</option>
                  {['None', 'Active', 'Completed', 'Cancelled'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <Field
                name="loan_reference"
                label="Gadget loan reference"
                value={record?.loan_reference}
                max={200}
              />
              <Field
                name="loan_date"
                label="Loan date"
                type="date"
                value={record?.loan_date}
              />
              <Field
                name="loan_details"
                label="Loan device / agreement details"
                value={record?.loan_details}
              />
              <Field name="notes" label="IT notes" value={record?.notes} />
            </div>
            <p>
              Company equipment is updated through employee asset provisioning
              and returns. Loan records do not create company assets or payroll
              deductions.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setSelected('')}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save arrangement'}
              </button>
            </div>
          </form>
          <History entity="laptop" id={selected} />
        </Editor>
      )}
    </section>
  );
}

export function AssetProcurement({ assetId }: { assetId: string }) {
  const { data, error, loading } = usePurchasing();
  const ids = data.links
    .filter((l) => l.asset_id === assetId)
    .map((l) => l.procurement_id);
  return (
    <section className="purchasing-module">
      <h3>Procurement history</h3>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading procurement…</p>
      ) : !ids.length ? (
        <p>
          No linked procurement. Add a record in Procurement and link this
          asset.
        </p>
      ) : (
        data.procurements
          .filter((p) => ids.includes(p.id))
          .map((p) => (
            <div className="purchasing-history" key={p.id}>
              <strong>
                {p.purchase_date} · {p.reference} · {p.status}
              </strong>
              <p>
                {p.supplier_name} · {p.description}
              </p>
              <p>
                Record total: {p.currency} {(p.amount_cents / 100).toFixed(2)}
              </p>
              <InvoiceLinks
                invoices={data.invoices.filter(
                  (f) => f.procurement_id === p.id,
                )}
              />
            </div>
          ))
      )}
    </section>
  );
}
