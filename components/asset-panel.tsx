'use client';
import {AssetVerification} from './asset-verification';
import {MovementHistory} from './movement-history';
import {Borrowing} from './borrowing';
import {AssetProcurement} from './purchasing';
import { useState, type FormEvent } from 'react';
import {
  Wrench,
  CheckCircle2,
  Laptop,
  Pencil,
  History,
  CalendarClock,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  detailFields,
  readDetails,
  localDate,
  type InventoryAsset,
  type Maintenance,
  type AssetEvent,
} from '@/lib/asset-types';
function Choice({
  name,
  value,
  onChange,
  values,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  values: string[];
}) {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(v) => onChange(String(v))}
    >
      <SelectTrigger className="w-full min-h-10" aria-label={name}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem value={v} key={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function AssetFields({
  kind,
  asset,
}: {
  kind: string;
  asset?: InventoryAsset;
}) {
  const d = readDetails(asset);
  const [condition, setCondition] = useState(d.condition || 'Good'),
    [state, setState] = useState(asset?.state || 'Ready');
  return (
    <>
      <label className="field">
        Name
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={asset?.name}
          placeholder="e.g. Dell Latitude 5450"
        />
      </label>
      <label className="field">
        Unique asset tag
        <input
          name="tag"
          required
          maxLength={200}
          defaultValue={asset?.tag}
          placeholder="e.g. HW-001"
        />
      </label>
      <label className="field">
        {kind === 'Hardware' ? 'Serial number' : 'Vendor / plan'}
        <input name="serial" maxLength={200} defaultValue={asset?.serial} />
      </label>
      <label className="field">
        {kind === 'Hardware'
          ? 'Capacity (one device)'
          : 'Seats / account capacity'}
        <input
          name="seats"
          type="number"
          min={1}
          max={100000}
          required
          defaultValue={asset?.seats || 1}
          readOnly={kind === 'Hardware'}
        />
      </label>
      {kind === 'Hardware' && (
        <>
          <div className="field full form-section">Hardware profile</div>
          <label className="field">
            Condition
            <Choice
              name="condition"
              value={condition}
              onChange={setCondition}
              values={['New', 'Good', 'Fair', 'Damaged']}
            />
          </label>
          <label className="field">
            Lifecycle status
            <Choice
              name="state"
              value={state}
              onChange={setState}
              values={
                asset?.state === 'Maintenance'
                  ? ['Maintenance']
                  : ['Ready', 'Retired']
              }
            />
          </label>
          {detailFields.map(([name, label, type]) => (
            <label className="field" key={name}>
              {label}
              <input
                name={name}
                type={type}
                maxLength={200}
                min={type === 'number' ? 0 : undefined}
                step={type === 'number' ? '0.01' : undefined}
                defaultValue={d[name]}
                placeholder={
                  name === 'ram'
                    ? 'e.g. 16 GB'
                    : name === 'storage'
                      ? 'e.g. 512 GB SSD'
                      : name === 'category'
                        ? 'e.g. Laptop, Monitor, Printer'
                        : undefined
                }
              />
            </label>
          ))}
          <label className="field">
            Currency code
            <input
              name="currency"
              maxLength={3}
              pattern="[A-Z]{3}"
              defaultValue={d.currency || 'PHP'}
              placeholder="PHP"
            />
          </label>
          <label className="field full">
            Additional specifications
            <Textarea
              name="specs"
              maxLength={4000}
              defaultValue={d.specs}
              placeholder="Graphics, display, network adapters, or other specifications"
            />
          </label>
          <label className="field full">
            Notes
            <Textarea
              name="notes"
              maxLength={4000}
              defaultValue={d.notes}
              placeholder="Accessories, purchase notes, or equipment condition details"
            />
          </label>
        </>
      )}
    </>
  );
}
function Snapshot({ raw }: { raw: string }) {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return (
    <details className="change-details">
      <summary>View recorded details</summary>
      <div>
        {Object.entries(value).map(([key, v]) => (
          <div key={key}>
            <strong>{key.replaceAll('_', ' ')}: </strong>
            {typeof v === 'object' ? (
              <dl>
                {Object.entries(v as Record<string, unknown>)
                  .filter(([, x]) => x !== '' && x !== null)
                  .map(([k, x]) => (
                    <div key={k}>
                      <dt>{k.replaceAll('_', ' ')}</dt>
                      <dd>{String(x)}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              String(v)
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
export function AssetPanel({
  refresh,
  forms,
  formLinks,
  asset,
  maintenance,
  events,
  assignments,
  employees,
  onClose,
  onEmployee,
  save,
  busy,
  error,
}: {
  refresh?: () => unknown;
  forms: { id: string; type: string; status: string; submitted_at: string }[];
  formLinks: { form_id: string; asset_id: string }[];
  asset?: InventoryAsset;
  maintenance: Maintenance[];
  events: AssetEvent[];
  assignments: {
    id: string;
    asset_id: string;
    employee_id: string;
    assigned_at: string;
    resolved_at: string | null;
    resolution: string | null;
    identifier: string;
  }[];
  employees: { id: string; name: string }[];
  onClose: () => void;
  onEmployee: (id: string) => void;
  save: (payload: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
  error: string;
}) {
  const [modal, setModal] = useState(''),
    [serviceId, setServiceId] = useState(''),
    [serviceType, setServiceType] = useState('Repair');
  const d = readDetails(asset),
    records = maintenance.filter((m) => m.asset_id === asset?.id),
    open = records.find((m) => !m.completed_date),
    closed = records.filter((m) => m.completed_date);
  const chosen = records.find((m) => m.id === serviceId);
  const history = assignments.filter((a) => a.asset_id === asset?.id);
  const status = asset?.borrow_status || (
    asset?.state === 'Ready'
      ? history.some((a) => !a.resolved_at)
        ? 'Assigned'
        : 'Available'
      : asset?.state);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!asset) return;
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    if (
      await save({
        ...fields,
        assetId: asset.id,
        action: modal,
        kind: asset.kind,
        type: serviceType,
        maintenanceId: serviceId,
      })
    )
      setModal('');
  }
  return (
    <>
      <Sheet
        open={Boolean(asset)}
        onOpenChange={(v) => {
          if (!v) {
            setModal('');
            onClose();
          }
        }}
      >
        <SheetContent className="!w-full !max-w-3xl !gap-0">
          <div className="detail-header">
            <div className="eyebrow">
              {asset?.kind.toUpperCase()} RECORD · {asset?.tag}
            </div>
            <SheetTitle className="text-2xl">{asset?.name}</SheetTitle>
            <SheetDescription>
              {[d.brand, d.model, asset?.serial].filter(Boolean).join(' · ') ||
                'Specifications, ownership, and service history'}
            </SheetDescription>
          </div>
          {asset && (
            <div className="detail-body">
              <div className="asset-overview">
                <span className={'badge ' + status}>
                  {status === 'Maintenance' ? 'In maintenance' : status}
                </span>
                {asset.kind === 'Hardware' && (
                  <span className="badge">
                    {d.condition || 'Condition not recorded'}
                  </span>
                )}
                {d.location && (
                  <span className="text-sm text-slate-500">{d.location}</span>
                )}
              </div>
              <div className="detail-actions">
                {asset.kind === 'Hardware' && ['Ready','Maintenance'].includes(asset.state) && (
                  <button className="secondary" onClick={() => setModal('retireAsset')}>Retire asset</button>
                )}
                <button
                  className="secondary"
                  onClick={() => setModal('editAsset')}
                >
                  <Pencil size={16} /> Edit details
                </button>
                {asset.kind === 'Hardware' && asset.state === 'Ready' && !asset.borrow_status && (
                  <button
                    className="primary"
                    onClick={() => setModal('maintenance')}
                  >
                    <Wrench size={16} /> Start maintenance
                  </button>
                )}
              </div>
              {error && !modal && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              {open && (
                <div className="notice">
                  <strong>Maintenance in progress</strong>
                  <p>{open.issue}</p>
                  <p>
                    {open.provider || 'Service provider not recorded'}
                    {open.due_date ? ` · Due ${open.due_date}` : ''}
                  </p>
                  <button
                    className="secondary mt-3"
                    onClick={() => {
                      setServiceId(open.id);
                      setModal('completeMaintenance');
                    }}
                  >
                    Record completed service
                  </button>
                </div>
              )}
              <Tabs defaultValue="details" key={asset.id}>
                <TabsList className="employee-profile-nav">
                  <TabsTrigger value="details" className="px-3">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="service" className="px-3">
                    Maintenance ({records.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="px-3">
                    History
                  </TabsTrigger>
                <TabsTrigger value="custody">Location & borrowing</TabsTrigger><TabsTrigger value="procurement">Purchase & warranty</TabsTrigger>{asset.kind==='Hardware'&&<TabsTrigger value="verification">Verification & QR</TabsTrigger>}
                </TabsList>
                <TabsContent value="details">

                  <div className="record-section">
                    <h3>
                      <Laptop size={17} /> Specifications
                    </h3>
                    <dl className="spec-grid">
                      {(
                        [
                          'category',
                          'brand',
                          'model',
                          'cpu',
                          'ram',
                          'storage',
                          'os',
                        ] as const
                      ).map((key) => (
                        <div key={key}>
                          <dt>{detailFields.find((x) => x[0] === key)?.[1]}</dt>
                          <dd>{d[key] || 'Not recorded'}</dd>
                        </div>
                      ))}
                      <div>
                        <dt>Serial number</dt>
                        <dd>{asset.serial || 'Not recorded'}</dd>
                      </div>
                    </dl>
                    {d.specs && (
                      <p className="whitespace-pre-wrap mt-4">{d.specs}</p>
                    )}
                  </div>
                  {d.notes && (
                    <div className="record-section">
                      <h3>Notes</h3>
                      <p className="whitespace-pre-wrap">{d.notes}</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="service">
                  {asset.kind !== 'Hardware' ? (
                    <p className="p-5">
                      Maintenance applies to hardware items.
                    </p>
                  ) : (
                    <>
                      <div className="service-summary">
                        <div>
                          <strong>{open ? 1 : 0}</strong>
                          <span>In progress</span>
                        </div>
                        <div>
                          <strong>{closed.length}</strong>
                          <span>Closed services</span>
                        </div>
                        <div>
                          <strong className="!text-base">
                            {closed
                              .map((m) => m.completed_date!)
                              .sort()
                              .reverse()[0] || '—'}
                          </strong>
                          <span>Last completed</span>
                        </div>
                      </div>
                      {records.length ? (
                        records.map((m) => (
                          <article className="service-card" key={m.id}>
                            <div className="section-head">
                              <h3>{m.type}</h3>
                              <span
                                className={
                                  'badge ' +
                                  (m.completed_date ? 'Active' : 'Maintenance')
                                }
                              >
                                {m.closure_outcome === 'Retired' ? 'Closed — retired' : m.completed_date ? 'Completed' : 'In progress'}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{m.issue}</p>
                            <dl className="spec-grid mt-4">
                              <div>
                                <dt>Started</dt>
                                <dd>{m.opened_date}</dd>
                              </div>
                              <div>
                                <dt>Provider / technician</dt>
                                <dd>{m.provider || 'Not recorded'}</dd>
                              </div>
                              <div>
                                <dt>
                                  {m.completed_date
                                    ? (m.closure_outcome === 'Retired' ? 'Closed' : 'Completed')
                                    : 'Target date'}
                                </dt>
                                <dd>
                                  {m.completed_date ||
                                    m.due_date ||
                                    'Not recorded'}
                                </dd>
                              </div>
                              {m.cost !== '' && (
                                <div>
                                  <dt>Service cost</dt>
                                  <dd>
                                    {m.currency}{' '}
                                    {Number(m.cost).toLocaleString()}
                                  </dd>
                                </div>
                              )}
                            </dl>
                            {m.work_done && (
                              <div className="mt-4">
                                <strong className="text-sm">
                                  {m.closure_outcome === 'Retired' ? 'Closure reason' : 'Work performed'}
                                </strong>
                                <p className="whitespace-pre-wrap">
                                  {m.work_done}
                                </p>
                              </div>
                            )}
                            {!m.completed_date && (
                              <button
                                className="secondary mt-4"
                                onClick={() => {
                                  setServiceId(m.id);
                                  setModal('completeMaintenance');
                                }}
                              >
                                Complete service
                              </button>
                            )}
                          </article>
                        ))
                      ) : (
                        <div className="empty">
                          <Wrench size={30} />
                          <h3>No service history yet</h3>
                          <p>
                            Record repairs, inspections, upgrades, and
                            preventive maintenance.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="history">{d.category?.trim().toLowerCase()==='laptop'&&<MovementHistory assetId={asset.id}/>}
                  <div className="record-section">
                    <h3>
                      <History size={17} /> Assignment history
                    </h3>
                    {history.map((a) => (
                      <div className="events" key={a.id}>
                        <button
                          className="row-link"
                          onClick={() => onEmployee(a.employee_id)}
                        >
                          {employees.find((e) => e.id === a.employee_id)
                            ?.name || 'Employee'}
                        </button>
                        <small>
                          Assigned {a.assigned_at.slice(0, 10)} ·{' '}
                          {a.resolved_at
                            ? `${a.resolution} ${a.resolved_at.slice(0, 10)}`
                            : 'Currently assigned'}
                        </small>
                        {a.identifier && <p>{a.identifier}</p>}
                      </div>
                    ))}
                    {history.length === 0 && <p>No assignments yet.</p>}
                  </div>
                  <div className="record-section">
                    <h3>Forms & incident reports</h3>
                    {forms
                      .filter((f) =>
                        formLinks.some(
                          (l) => l.asset_id === asset.id && l.form_id === f.id,
                        ),
                      )
                      .map((f) => (
                        <div className="events" key={f.id}>
                          <a className="row-link" href={'/?document=' + f.id}>
                            {f.type} form · {f.status}
                          </a>
                          <small>{f.submitted_at.slice(0, 10)}</small>
                        </div>
                      ))}
                    <h3 className="mt-6">Asset activity</h3>
                    {events
                      .filter((e) => e.asset_id === asset.id)
                      .map((e) => (
                        <div className="events" key={e.id}>
                          {e.message}
                          <small>
                            {new Date(e.created_at).toLocaleString()}
                          </small>
                          {e.snapshot && <Snapshot raw={e.snapshot} />}
                        </div>
                      ))}
                    {!events.some((e) => e.asset_id === asset.id) && (
                      <p>Changes will appear here as this record is updated.</p>
                    )}
                  </div>
                </TabsContent>
<TabsContent value="custody">                  <div className="record-section">
                    <h3>Location & responsibility</h3>
                    <dl className="spec-grid"><div><dt>Office / site</dt><dd>{d.location||'Not recorded'}</dd></div><div><dt>Room / area</dt><dd>{d.room||'Not recorded'}</dd></div><div><dt>Responsible person / team</dt><dd>{d.responsible_person||'Not recorded'}</dd></div></dl>
                    {d.custody_type==='Location'&&<p>Shared office equipment — deployed to this location, not an employee.</p>}
                    {history
                      .filter((a) => !a.resolved_at)
                      .map((a) => (
                        <button
                          className="row-link"
                          key={a.id}
                          onClick={() => onEmployee(a.employee_id)}
                        >
                          {employees.find((e) => e.id === a.employee_id)?.name}{' '}
                          · Since {a.assigned_at.slice(0, 10)}
                        </button>
                      ))}
                    {!history.some((a) => !a.resolved_at) &&
                      (d.custody_type==='Location' ? null : d.custodian ? (
                        <p>
                          {d.custodian}
                          {d.location ? ` · ${d.location}` : ''}
                          <br />
                          <small>
                            Imported source custody; employee match requires
                            review.
                          </small>
                        </p>
                      ) : (
                        <p>No employee custodian currently assigned.</p>
                      ))}
                  </div>
<Borrowing assetId={asset.id} refresh={refresh}/></TabsContent>
<TabsContent value="procurement">                  <div className="record-section">
                    <h3>
                      <CalendarClock size={17} /> Purchase & warranty
                    </h3>
                    <dl className="spec-grid">
                      {(
                        [
                          'purchase_date',
                          'supplier',
                          'invoice',
                          'warranty_end',
                          'next_service',
                        ] as const
                      ).map((key) => (
                        <div key={key}>
                          <dt>{detailFields.find((x) => x[0] === key)?.[1]}</dt>
                          <dd>
                            {d[key] || 'Not recorded'}
                            {key === 'warranty_end' && d[key] && (
                              <span
                                className={
                                  'badge ml-2 ' +
                                  (d[key]! < localDate() ? 'Expired' : 'Active')
                                }
                              >
                                {d[key]! < localDate() ? 'Expired' : 'Covered'}
                              </span>
                            )}
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt>Purchase price</dt>
                        <dd>
                          {d.purchase_price !== undefined &&
                          d.purchase_price !== ''
                            ? `${d.currency || 'PHP'} ${Number(d.purchase_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : 'Not recorded'}
                        </dd>
                      </div>
                    </dl>
                  </div>
<AssetProcurement assetId={asset.id}/></TabsContent>
{asset.kind==='Hardware'&&<TabsContent value="verification"><AssetVerification assetId={asset.id}/></TabsContent>}
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(modal) && Boolean(asset)}
        onOpenChange={(v) => {
          if (!v && !busy) setModal('');
        }}
      >
        <DialogContent className="!max-w-2xl !p-6 max-h-[90vh] overflow-auto">
          <DialogTitle className="text-xl">
            {modal === 'retireAsset' ? 'Retire asset' : modal === 'editAsset'
              ? 'Edit asset details'
              : modal === 'maintenance'
                ? 'Start maintenance'
                : 'Complete maintenance'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'retireAsset' ? 'Close open maintenance as retired and remove this hardware from available inventory. Its history will be retained. Resolve any current custody first.' : modal === 'editAsset'
              ? 'Keep the hardware record current. Changes are retained in its history.'
              : modal === 'maintenance'
                ? 'This hardware will be unavailable for new assignments until service is completed. Its current custodian stays linked.'
                : 'Record the actual work performed. The hardware will become ready for use again.'}
          </DialogDescription>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit} key={modal + serviceId}>
            <div className="form-grid">
              {modal === 'retireAsset' ? (
                <>
                  <p className="field full">{asset?.tag} - {asset?.name}</p>
                  <label className="field full">Retirement date
                    <input name="retirement_date" type="date" required max={localDate()} defaultValue={localDate()} />
                  </label>
                  <label className="field full">Retirement reason
                    <Textarea name="retirement_reason" required maxLength={4000} placeholder="e.g. Beyond repair or repair too costly" />
                  </label>
                </>
              ) : modal === 'editAsset' && asset ? (
                <AssetFields kind={asset.kind} asset={asset} />
              ) : modal === 'maintenance' ? (
                <>
                  <label className="field full">
                    Service type
                    <Choice
                      name="type"
                      value={serviceType}
                      onChange={setServiceType}
                      values={[
                        'Repair',
                        'Preventive maintenance',
                        'Inspection',
                        'Upgrade',
                      ]}
                    />
                  </label>
                  <label className="field full">
                    Issue / reason for service
                    <Textarea name="issue" required maxLength={4000} />
                  </label>
                  <label className="field full">
                    Provider / technician
                    <input
                      name="provider"
                      maxLength={200}
                      placeholder="e.g. Internal IT or supplier service center"
                    />
                  </label>
                  <label className="field">
                    Start date
                    <input
                      name="opened_date"
                      type="date"
                      required
                      defaultValue={localDate()}
                    />
                  </label>
                  <label className="field">
                    Target completion date
                    <input name="due_date" type="date" />
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    Completion date
                    <input
                      name="completed_date"
                      type="date"
                      required
                      min={chosen?.opened_date}
                      max={localDate()}
                      defaultValue={localDate()}
                    />
                  </label>
                  <label className="field">
                    Service cost (optional)
                    <input name="cost" type="number" min={0} step="0.01" />
                  </label>
                  <label className="field">
                    Currency code
                    <input
                      name="currency"
                      required
                      pattern="[A-Z]{3}"
                      maxLength={3}
                      defaultValue={d.currency || 'PHP'}
                    />
                  </label>
                  <label className="field full">
                    Work performed / resolution
                    <Textarea
                      name="work_done"
                      maxLength={4000}
                      required
                      placeholder="Repair performed, parts replaced, and test results"
                    />
                  </label>
                </>
              )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setModal('')}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? 'Saving…'
                  : modal === 'retireAsset' ? 'Retire asset' : modal === 'editAsset'
                    ? 'Save changes'
                    : modal === 'maintenance'
                      ? 'Start maintenance'
                      : 'Mark service completed'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
