'use client';
import {LifecycleHistory} from '@/components/lifecycle-history';
import {EditEmployee} from '@/components/edit-employee';
import {provisionedItems} from '@/lib/provisioned-items';
import {AuditReports} from '@/components/audit-reports';
import {BrandLogo} from '@/components/brand-logo';
import {MovementHistory} from '@/components/movement-history';
import { RecordManagement } from '@/components/record-management';

import {WorkspaceNavigation} from '@/components/workspace-navigation';
import {Borrowing} from '@/components/borrowing';
import {Purchasing,LaptopArrangements} from '@/components/purchasing';
import { DepartureRecords } from '@/components/departure-records';
import { AccessShell } from '@/components/access-shell';
import { HardwareDashboard } from '@/components/hardware-dashboard';
import { hardwareCategory, inSection, inventoryStatus as hardwareStatus } from '@/lib/inventory-sections';
import { Forms } from '@/components/forms';
import type { EmployeeForm, FormFile } from '@/lib/form-types';
import { EmployeeProvisioned } from '@/components/employee-provisioned';
import { AccountRequests } from '@/components/account-requests';
import type { AccountRequest } from '@/lib/account-types';
import { KitTemplates, EmployeeKitPanel } from '@/components/kits';
import type { KitTemplate, EmployeeKit, KitTask } from '@/lib/kit-types';
import { AssetFields, AssetPanel } from '@/components/asset-panel';
import {
  readDetails,
  localDate,
  type InventoryAsset,
  type Maintenance,
  type AssetEvent,
} from '@/lib/asset-types';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Laptop,
  Users,
  LayoutDashboard,
  UserPlus,
  UserMinus,
  ArrowUpRight,
  Plus,
  Package,
  ShieldCheck,
  Search,
  ArrowRight,
  Boxes,
  KeyRound,
  AppWindow,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
type Employee = {
  id: string;
  code: string;
  name: string;
  email: string;
  department: string;
  role: string;
  start_date: string;
  end_date: string | null;
  status: string;
};
type Asset = InventoryAsset;
type Assignment = {
  id: string;
  employee_id: string;
  asset_id: string;
  identifier: string;
  assigned_at: string;
  resolved_at: string | null;
  resolution: string | null;
};
type Data = {
  forms: EmployeeForm[];
  formFiles: FormFile[];
  formLinks: { id: string; form_id: string; asset_id: string }[];
  accountRequests: AccountRequest[];
  templates: KitTemplate[];
  kits: EmployeeKit[];
  tasks: KitTask[];
  maintenance: Maintenance[];
  assetEvents: AssetEvent[];
  employees: Employee[];
  assets: Asset[];
  assignments: Assignment[];
  events: {
    id: string;
    employee_id: string;
    message: string;
    created_at: string;
  }[];
};
const initial: Data = {
  forms: [],
  formFiles: [],
  formLinks: [],
  accountRequests: [],
  templates: [],
  kits: [],
  tasks: [],
  maintenance: [],
  assetEvents: [],
  employees: [],
  assets: [],
  assignments: [],
  events: [],
};
const navItems = [
  { name: 'Overview', label: 'Overview', icon: LayoutDashboard },
  { name: 'Employees', label: 'Employees', icon: Users },
  { name: 'Asset inventory', label: 'Asset Inventory', icon: Laptop },
  { name: 'Onboarding', label: 'Onboarding', icon: UserPlus },
  { name: 'Offboarding', label: 'Offboarding', icon: UserMinus },
  { name: 'Kit templates', label: 'Kit Templates', icon: Package },
  { name: 'Account requests', label: 'Account Requests', icon: KeyRound },
  { name: 'Laptop arrangements', label: 'Laptop Arrangement', icon: Laptop },
  { name: 'Deployment & returns', label: 'Deployment and Returns', icon: Clock3 },
  { name: 'Temporary borrowing', label: 'Temporary Borrowing', icon: Package },
  { name: 'Forms & documents', label: 'Forms & Documents', icon: Package },
  { name: 'Procurement', label: 'Procurement', icon: Package },
  { name: 'Suppliers', label: 'Suppliers', icon: Boxes },
  { name: 'Manage records', label: 'Manage Records', icon: Boxes },
  { name: 'Resigned & clearance', label: 'Resigned & Clearance', icon: ShieldCheck },
  { name: 'Audit reports', label: 'Audit Reports', icon: ShieldCheck },
];
const today = () => new Date().toLocaleDateString('en-CA');
const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
const iconFor = (kind: string) =>
  kind === 'Hardware' ? Laptop : kind === 'Software' ? AppWindow : KeyRound;
function Choice({
  value,
  onChange,
  options,
  label,
  expanded = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  expanded?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger aria-label={label} className={expanded ? "asset-choice-trigger min-h-10 bg-card" : "min-h-10 min-w-36 bg-card"}>
        <SelectValue>
          {options.find((o) => o.value === value)?.label || label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={!expanded} align="start" className={expanded ? "asset-choice-options" : undefined}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
function Person({ employee }: { employee: Employee }) {
  return (
    <div className="person">
      <span className="avatar">{initials(employee.name)}</span>
      <div>
        <strong>{employee.name}</strong>
        <small>{employee.email}</small>
      </div>
    </div>
  );
}
function PageControls({
  page,
  pages,
  total,
  label,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  label: string;
  onChange: (page: number) => void;
}) {
  if (pages <= 1)
    return (
      <div className="list-count">
        {total} {label}
      </div>
    );
  const visible = Array.from(new Set([1, pages, page - 1, page, page + 1]))
    .filter((x) => x >= 1 && x <= pages)
    .sort((a, b) => a - b);
  return (
    <div className="list-pagination">
      <span>
        Page {page} of {pages} · {total} {label}
      </span>
      <Pagination className="!mx-0 !w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Previous"
              aria-disabled={page === 1}
              className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) onChange(page - 1);
              }}
            />
          </PaginationItem>
          {visible.map((n, i) => (
            <span className="contents" key={n}>
              {i > 0 && n - visible[i - 1] > 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={n === page}
                  aria-label={`Go to page ${n}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(n);
                  }}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            </span>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="Next"
              aria-disabled={page === pages}
              className={page === pages ? 'pointer-events-none opacity-50' : ''}
              onClick={(e) => {
                e.preventDefault();
                if (page < pages) onChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
export default function Page() {
  return (
    <AccessShell>
      <Operations />
    </AccessShell>
  );
}
function Operations() {
  const [lifecycleMode,setLifecycleMode]=useState('progress');
  const [inspected, setInspected] = useState<string | null>(null),
    [inventoryStatus, setInventoryStatus] = useState('All hardware states');
  const [data, setData] = useState<Data>(initial),
    [view, setView] = useState('Overview'),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All statuses'),
    [inventorySection, setInventorySection] = useState('Laptop'),
    [selected, setSelected] = useState<string | null>(null),
    [modal, setModal] = useState(''),
    [kind, setKind] = useState('Hardware'),
    [assetId, setAssetId] = useState(''),
    [confirmation, setConfirmation] = useState<Assignment | null>(null),
    [listPage, setListPage] = useState(1);
  async function refresh() {
    const response = await fetch('/api/workspace');
    const result = (await response.json()) as Data & { error?: string };
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }
  useEffect(()=>{setLifecycleMode('progress')},[view]);
  useEffect(() => { const id=new URLSearchParams(window.location.search).get('inspect'); if(id) setInspected(id); }, []);
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).has('form') ||
      new URLSearchParams(window.location.search).has('document')
    )
      setView('Forms & documents');
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function mutate(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        message: string;
        id: string;
      };
      if (!response.ok) throw new Error(result.error);
      await refresh();
      setModal('');
      setConfirmation(null);
      setNotice(result.message);
      if (payload.action === 'employee') setSelected(result.id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  function navigate(name: string) {
    setView(name);
    setSearch('');
    setFilter('All statuses');
    setInventorySection('Laptop');
    setInventoryStatus('All hardware states');
  }
  function openModal(name: string) {
    setError('');
    setModal(name);
    setAssetId('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    mutate({ ...fields, action: modal, employeeId: selected, kind, assetId });
  }
  const employee = data.employees.find((e) => e.id === selected);
  const assignments = data.assignments.filter(
    (a) => a.employee_id === selected,
  );
  const outstanding = assignments.filter((a) => !a.resolved_at);
  const extraOutstanding =
    data.tasks.filter(
      (t) =>
        t.employee_id === selected &&
        t.state === 'Provisioned' &&
        !t.assignment_id &&
        !t.account_request_id,
    ).length +
    data.accountRequests.filter(
      (r) =>
        r.employee_id === selected &&
        ['Submitted', 'Approved', 'Active'].includes(r.status),
    ).length;
  const kitPending =
    data.tasks.some(
      (t) => t.employee_id === selected && t.state === 'Pending',
    ) ||
    data.accountRequests.some(
      (r) =>
        r.employee_id === selected &&
        ['Submitted', 'Approved'].includes(r.status),
    );
  const assignedCount = (id: string) =>
    data.assignments.filter((a) => a.asset_id === id && !a.resolved_at).length;
  const available = data.assets.filter(
    (a) =>
      a.kind !== 'Account' &&
      a.state === 'Ready' &&
      !a.borrow_status &&
      assignedCount(a.id) < a.seats &&
      !outstanding.some((x) => x.asset_id === a.id),
  );
  const selectedAsset = data.assets.find((a) => a.id === assetId);
  const filteredEmployees = data.employees.filter(
    (e) =>
      (view !== 'Onboarding' || e.status === 'Onboarding') &&
      (view !== 'Offboarding' ||
        e.status === 'Offboarding') &&
      (filter === 'All statuses' || e.status === filter) &&
      `${e.name} ${e.email} ${e.code} ${e.department}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const assignedAssetIds = new Set(data.assignments.filter((a) => !a.resolved_at).map((a) => a.asset_id));
  const filteredAssets = data.assets.filter(
    (a) =>
      a.kind !== 'Account' &&
      inSection(a, inventorySection) &&
      (inventoryStatus === 'All hardware states' ||
        (a.kind === 'Hardware' &&
          (inventoryStatus === 'Service due'
            ? (readDetails(a).next_service || '9999') <= localDate()
            : hardwareStatus(a, assignedAssetIds) === inventoryStatus))) &&
      `${a.name} ${a.tag} ${a.serial} ${readDetails(a).supplier || ''} ${readDetails(a).model || ''} ${readDetails(a).custodian || ''} ${readDetails(a).location || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pageSize = 8,
    listTotal =
      view === 'Asset inventory'
        ? filteredAssets.length
        : filteredEmployees.length,
    listPages = Math.max(1, Math.ceil(listTotal / pageSize)),
    safePage = Math.min(listPage, listPages),
    pageStart = (safePage - 1) * pageSize,
    pagedAssets = filteredAssets.slice(pageStart, pageStart + pageSize),
    pagedEmployees = filteredEmployees.slice(pageStart, pageStart + pageSize);
  useEffect(
    () => setListPage(1),
    [view, search, filter, inventorySection, inventoryStatus],
  );
  const onboards = data.employees.filter((e) => e.status === 'Onboarding'),
    offboards = data.employees.filter((e) => e.status === 'Offboarding');
  const stats = [
    {
      title: 'Total employees',
      count: data.employees.filter((e) => e.status !== 'Offboarded').length,
      icon: Users,
      sub: 'Current team members',
    },
    {
      title: 'Laptops assigned',
      count: data.assets.filter((asset) =>
        asset.kind === 'Hardware' && hardwareCategory(asset) === 'Laptop' &&
        data.assignments.some((assignment) => assignment.asset_id === asset.id && !assignment.resolved_at)
      ).length,
      icon: Laptop,
      sub: 'Laptops assigned to employees',
    },
    {
      title: 'Onboarding',
      count: onboards.length,
      icon: UserPlus,
      sub: 'Getting ready for day one',
    },
    {
      title: 'Offboarding',
      count: offboards.length,
      icon: UserMinus,
      sub: 'Clearance in progress',
    },
  ];
  function empty(
    title: string,
    text: string,
    action?: () => void,
    label?: string,
  ) {
    return (
      <div className="empty">
        <Package size={32} />
        <h3>{title}</h3>
        <p>{text}</p>
        {action && (
          <button className="primary" onClick={action}>
            {label}
            <Plus size={16} />
          </button>
        )}
      </div>
    );
  }
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="anchored-sidebar-brand"><BrandLogo/><span>Asset Management</span></div>
          
          <div className="workspace">COMPANY WORKSPACE</div>
        </SidebarHeader>
        <SidebarContent>
          <WorkspaceNavigation>
            {navItems.map(({ name, label, icon: Icon }) => (
              <button
                key={name}
                aria-current={view === name ? 'page' : undefined}
                className={view === name ? 'nav active' : 'nav'}
                onClick={() => navigate(name)}
              >
                <Icon size={19} />
                {label}
                {['Onboarding', 'Offboarding'].includes(name) && (
                  <span className="ml-auto text-xs">
                    {name === 'Onboarding' ? onboards.length : offboards.length}
                  </span>
                )}
              </button>
            ))}
          </WorkspaceNavigation>
        </SidebarContent>
        <SidebarFooter>
          <div className="admin">
            <span className="avatar">IT</span>
            <div>
              <strong>IT workspace</strong>
              <small>Asset management</small>
            </div>
            <ShieldCheck size={18} />
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="main">
        <header className="topbar">
          <SidebarTrigger />
          <span>
            Workspace <span className="slash">/</span> {view}
          </span>
          <span className="private">
            <i />
            Private workspace
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div className="eyebrow">YOUR IT OPERATIONS, CONNECTED</div>
            <h1>{view}</h1>
            <p>
              {view === 'Overview'
                ? 'Every employee. Every asset. Accounted for.'
                : view === 'Audit reports' ? 'Export dated inventory, access and clearance records for review.'
                : view === 'Deployment & returns' ? 'Review laptop deployment and return history, including records needing verification.'
                : view === 'Suppliers' ? 'Supplier contacts and the services they provide.'
                : view === 'Temporary borrowing' ? 'Reserve equipment, track due dates and keep signed borrowing forms.'
                : view === 'Procurement' ? 'Purchase history, linked assets and invoice documents.'
                : view === 'Laptop arrangements' ? 'Company equipment, gadget loans and personal laptop use by employee.'
                : view === 'Employees'
                  ? 'The people behind every assignment.'
                  : view === 'Asset inventory'
                    ? 'Track equipment, licenses, and account access in one place.'
                    : view === 'Forms & documents'
                      ? 'Employee acknowledgements, returns, and incident reports.'
                      : view === 'Account requests'
                        ? 'Manage new-hire and employee account requests independently of equipment.'
                        : view === 'Kit templates'
                          ? 'Standardize equipment and account setup for every new hire.'
                          : view === 'Onboarding'
                            ? 'Get every new hire ready for their first day.'
                            : 'Recover equipment and close access with nothing left behind.'}
            </p>
            {['Overview', 'Employees', 'Onboarding', 'Asset inventory'].includes(view) && (
              <button
                className="primary"
                disabled={loading}
                onClick={() =>
                  openModal(view === 'Asset inventory' ? 'asset' : 'employee')
                }
              >
                <Plus size={17} />
                {view === 'Asset inventory' ? 'Add asset' : 'Add employee'}
              </button>
            )}
          </div>
          {error && !modal && !confirmation && (
            <div className="error" role="alert">
              {error}{' '}
              <button
                className="underline"
                onClick={() => {
                  setError('');
                  refresh().catch((e) => setError(e.message));
                }}
              >
                Retry
              </button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              <CheckCircle2 size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading" role="status">
              Loading your workspace…
            </div>
          ) : (
            <>
              
              {['Onboarding','Offboarding'].includes(view)&&<div className="detail-actions" role="group" aria-label="Workflow view"><button className={lifecycleMode==='progress'?'primary':'secondary'} aria-pressed={lifecycleMode==='progress'} onClick={()=>setLifecycleMode('progress')}>In progress</button><button className={lifecycleMode==='history'?'primary':'secondary'} aria-pressed={lifecycleMode==='history'} onClick={()=>setLifecycleMode('history')}>Completed history</button></div>}
              {['Onboarding','Offboarding'].includes(view)&&lifecycleMode==='history'?<LifecycleHistory key={view} kind={view} employees={data.employees} events={data.events} onEmployee={setSelected}/>:view === 'Audit reports' ? (<AuditReports/>) : view === 'Deployment & returns' ? (<MovementHistory expanded/>) : view === 'Temporary borrowing' ? (<div id="temporary-borrowing-tracker"><Borrowing employees={data.employees} assets={available.filter(a=>!readDetails(a).custodian?.trim())} refresh={refresh}/></div>) : view === 'Suppliers' || view === 'Procurement' ? (
                <Purchasing key={view} view={view} assets={data.assets} onAsset={setInspected}/>
              ) : view === 'Laptop arrangements' ? (
                <LaptopArrangements employees={data.employees} assets={data.assets} assignments={data.assignments} onEmployee={setSelected} onAsset={setInspected}/>
              ) : view === 'Manage records' ? (
                <RecordManagement
                  employees={data.employees}
                  assets={data.assets}
                  refresh={refresh}
                />
              ) : view === 'Resigned & clearance' ? (
                <DepartureRecords
                  onEmployee={setSelected}
                  refresh={refresh}
                  version={data.events[0]?.id}
                />
              ) : view === 'Forms & documents' ? (
                <Forms
                  forms={data.forms}
                  files={data.formFiles}
                  employees={data.employees}
                  assets={data.assets}
                  assignments={data.assignments}
                  tasks={data.tasks}
                  save={mutate}
                  busy={busy}
                  error={error}
                />
              ) : view === 'Account requests' ? (
                <AccountRequests
                  requests={data.accountRequests}
                  employees={data.employees}
                  save={mutate}
                  busy={busy}
                  error={error}
                />
              ) : view === 'Kit templates' ? (
                <KitTemplates
                  templates={data.templates}
                  save={mutate}
                  busy={busy}
                  error={error}
                />
              ) : view === 'Overview' ? (
                <>
                  <div className="stats">
                    {stats.map(({ title, count, icon: Icon, sub }) => (
                      <div className="stat" key={title}>
                        <div>
                          {title}
                          <Icon size={19} />
                        </div>
                        <strong>{count}</strong>
                        <small>{sub}</small>
                      </div>
                    ))}
                  </div>
                  {data.employees.length === 0 ? (
                    <section className="welcome">
                      <span className="welcome-icon">
                        <Package size={34} />
                      </span>
                      <div>
                        <div className="eyebrow">A SINGLE SOURCE OF TRUTH</div>
                        <h2>Start with your people.</h2>
                        <p>
                          Add an employee, then connect their equipment,
                          software, and accounts.
                          <br />
                          Everything you need for a smooth first day — and a
                          complete handover.
                        </p>
                        <button
                          className="primary"
                          onClick={() => openModal('employee')}
                        >
                          Add your first employee <ArrowRight size={17} />
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className="panel mb-6">
                      <div className="section-head">
                        <h2>
                          <Clock3 size={20} /> Needs attention
                        </h2>
                        <span className="badge">
                          {onboards.length + offboards.length} employees
                        </span>
                      </div>
                      {[...offboards, ...onboards].slice(0, 5).map((e) => (
                        <div className="workflow-row" key={e.id}>
                          <Person employee={e} />
                          <span className={'badge ' + e.status}>
                            {e.status}
                          </span>
                          <button
                            className="row-link"
                            onClick={() => setSelected(e.id)}
                          >
                            Review <ArrowRight size={15} />
                          </button>
                        </div>
                      ))}
                      {!onboards.length && !offboards.length && (
                        <p>No onboarding or offboarding tasks are open.</p>
                      )}
                    </section>
                  )}
                  <div className="workflow-grid">
                    {[
                      {
                        name: 'Onboarding',
                        icon: UserPlus,
                        copy: 'Set every new hire up for success.',
                        steps: [
                          'Add the employee record',
                          'Provision hardware, software, and accounts',
                          'Complete onboarding when ready',
                        ],
                      },
                      {
                        name: 'Offboarding',
                        icon: UserMinus,
                        copy: 'Close every loop before they leave.',
                        steps: [
                          'Find the employee and start offboarding',
                          'Recover assets and deactivate access',
                          'Complete clearance with a full history',
                        ],
                      },
                    ].map(({ name, icon: Icon, copy, steps }) => (
                      <section className="panel" key={name}>
                        <div className="section-head">
                          <h2>
                            <Icon size={20} />
                            {name}
                          </h2>
                          <button
                            aria-label={'View ' + name}
                            onClick={() => navigate(name)}
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                        <p>{copy}</p>
                        <ol>
                          {steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </section>
                    ))}
                  </div>
                  {data.events.length > 0 && (
                    <section className="panel mt-6">
                      <div className="section-head">
                        <h2>Recent activity</h2>
                      </div>
                      {data.events.slice(0, 6).map((e) => (
                        <div className="events" key={e.id}>
                          {e.message}
                          <small>
                            {new Date(e.created_at).toLocaleString()}
                          </small>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              ) : (
                <>
                  
                  {view === 'Asset inventory' && !loading && (
                    <HardwareDashboard
                      assets={data.assets}
                      assignments={data.assignments}
                      section={inventorySection}
                      onSection={(section) => {
                        setInventorySection(section);
                        setInventoryStatus('All hardware states');
                        setSearch('');
                        setListPage(1);
                      }}
                      status={inventoryStatus}
                      onStatus={setInventoryStatus}
                    />
                  )}
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        aria-label={
                          view === 'Asset inventory'
                            ? 'Search assets'
                            : 'Search employees'
                        }
                        placeholder={
                          view === 'Asset inventory'
                            ? 'Search by asset name, tag, or serial number…'
                            : 'Search by employee name, email, ID, or department…'
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {view === 'Asset inventory' ? (
                      <>
                        {inventorySection !== 'Software' && <Choice
                          label="Hardware state"
                          value={inventoryStatus}
                          onChange={setInventoryStatus}
                          options={options([
                            'All hardware states',
                            'Available',
                            'Deployed',
                            'Reserved', 'Borrowed',
                            'Maintenance',
                            'Retired',
                            'Other',
                            'Service due',
                          ])}
                        />}
                      </>
                    ) : view === 'Employees' ? (
                      <Choice
                        label="Employee status"
                        value={filter}
                        onChange={setFilter}
                        options={options(
                          [
                                'All statuses',
                                'Onboarding',
                                'Active',
                                'Offboarding',
                                'Offboarded',
                              ],
                        )}
                      />
                    ) : null}
                  </div>
                  <section className="panel table-panel">
                    {view === 'Asset inventory' ? (
                      filteredAssets.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ASSET</TableHead>
                              <TableHead>TYPE</TableHead>
                              <TableHead>TAG / SERIAL</TableHead>
                              <TableHead>STATUS / CAPACITY</TableHead>
                              <TableHead>ASSIGNED TO</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pagedAssets.map((a) => {
                              const Icon = iconFor(a.kind);
                              const current = data.assignments.filter(
                                (x) => x.asset_id === a.id && !x.resolved_at,
                              );
                              const details = readDetails(a);
                              const deployed = !!a.borrow_status || current.length > 0 || !!details.custodian;
                              return (
                                <TableRow key={a.id}>
                                  <TableCell>
                                    <div className="person">
                                      <span className="asset-icon">
                                        <Icon size={20} />
                                      </span>
                                      <button
                                        className="row-link text-left"
                                        onClick={() => {
                                          setError('');
                                          setInspected(a.id);
                                        }}
                                      >
                                        <strong>{a.name}</strong>
                                        <ArrowUpRight size={15} />
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="badge">{a.kind === 'Hardware' ? hardwareCategory(a) : a.kind}</span>
                                  </TableCell>
                                  <TableCell>
                                    {a.tag}
                                    <small className="block text-xs text-slate-400 mt-1">
                                      {a.serial || '—'}
                                    </small>
                                  </TableCell>
                                  <TableCell>
                                    {a.kind === 'Hardware' && (
                                      <span className={'badge mb-2 ' + a.state}>
                                        {hardwareStatus(a, assignedAssetIds)}
                                      </span>
                                    )}
                                    <div>
                                      {deployed ? 1 : 0} / {a.seats}
                                    </div>
                                    <small className="block text-xs text-slate-400 mt-1">
                                      {a.state === 'Ready' && !deployed ? a.seats : 0}{' '}
                                      available
                                    </small>
                                  </TableCell>
                                  <TableCell>
                                    {current.length ? (
                                      current.map((x) => (
                                        <button
                                          className="row-link mb-1"
                                          key={x.id}
                                          onClick={() =>
                                            setSelected(x.employee_id)
                                          }
                                        >
                                          {
                                            data.employees.find(
                                              (e) => e.id === x.employee_id,
                                            )?.name
                                          }
                                          <ArrowUpRight size={13} />
                                        </button>
                                      ))
                                    ) : a.borrow_employee_id ? (<button className="row-link" onClick={()=>setSelected(a.borrow_employee_id!)}>{data.employees.find(e=>e.id===a.borrow_employee_id)?.name} · {a.borrow_status}</button>) : details.custodian ? (
                                      <span>
                                        {details.custodian}
                                        <small className="block text-xs text-slate-400 mt-1">
                                          Source custody · review employee link
                                        </small>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">
                                        Unassigned
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        empty(
                          search
                            ? 'No matching assets'
                            : 'No assets in this selection',
                          search
                            ? 'Try another name, tag, or serial number.'
                            : 'Choose another section or status, or add an asset.',
                          undefined,
                        )
                      )
                    ) : filteredEmployees.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>EMPLOYEE</TableHead>
                            <TableHead>DEPARTMENT</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>CURRENTLY PROVISIONED</TableHead>
                            <TableHead>
                              {view === 'Offboarding'
                                ? 'LAST WORKING DAY'
                                : 'START DATE'}
                            </TableHead>
                            <TableHead>
                              <span className="sr-only">View employee</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedEmployees.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>
                                <button
                                  onClick={() => setSelected(e.id)}
                                  className="text-left"
                                >
                                  <Person employee={e} />
                                </button>
                              </TableCell>
                              <TableCell>
                                {e.department}
                                <small className="block text-xs text-slate-400 mt-1">
                                  {e.role}
                                </small>
                              </TableCell>
                              <TableCell>
                                <span className={'badge ' + e.status}>
                                  {e.status}
                                </span>
                              </TableCell>
                              <TableCell>
                                {
                                  provisionedItems(e.id,data.assets,data.assignments,data.accountRequests,data.tasks).filter(i=>i.active).length
                                }{' '}
                                items
                              </TableCell>
                              <TableCell>
                                {(view === 'Offboarding'
                                  ? e.end_date
                                  : e.start_date) || '—'}
                              </TableCell>
                              <TableCell>
                                <button
                                  className="row-link"
                                  onClick={() => setSelected(e.id)}
                                >
                                  View <ArrowRight size={15} />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      empty(
                        search
                          ? 'No matching employees'
                          : view === 'Offboarding'
                            ? 'No offboarding in progress'
                            : view === 'Onboarding'
                              ? 'No new hires waiting'
                              : 'Your team belongs here',
                        search
                          ? 'Try another name, email, ID, or department.'
                          : view === 'Offboarding'
                            ? 'Open an employee record to start an offboarding checklist.'
                            : 'Add an employee to begin provisioning their assets.',
                        view === 'Offboarding' ? () => navigate('Employees') : undefined,
                        'Find employee',
                      )
                    )}
                  </section>
                  <PageControls
                    page={safePage}
                    pages={listPages}
                    total={listTotal}
                    label={view === 'Asset inventory' ? 'assets' : 'employees'}
                    onChange={setListPage}
                  />
                  <div className="footer-note">
                    Changes are saved to your workspace
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Sheet
        open={Boolean(employee)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="!w-full !max-w-4xl !gap-0">
          <div className="detail-header">
            <div className="eyebrow">EMPLOYEE RECORD · {employee?.code}</div>
            <SheetTitle className="text-2xl">{employee?.name}</SheetTitle>
            <SheetDescription>
              {employee?.role} · {employee?.department}
            </SheetDescription>
          </div>
          {employee && (
            <div className="detail-body employee-profile-body"><div className="detail-actions"><EditEmployee key={employee.id} employee={employee} refresh={refresh}/></div>
              <div className="detail-meta">
                <div>
                  <small>EMAIL</small>
                  {employee.email}
                </div>
                <div>
                  <small>STATUS</small>
                  <span className={'badge ' + employee.status}>
                    {employee.status}
                  </span>
                </div>
                <div>
                  <small>START DATE</small>
                  {employee.start_date || 'Unknown — not supplied'}
                </div>
                {employee.end_date && (
                  <div>
                    <small>LAST WORKING DAY</small>
                    {employee.end_date}
                  </div>
                )}
              </div>
              <Tabs key={employee.id+'-profile'} defaultValue="overview" className="employee-profile-tabs">
<TabsList className="employee-profile-nav"><TabsTrigger value="overview">Provisioned items</TabsTrigger><TabsTrigger value="documents">Acknowledgements & forms</TabsTrigger><TabsTrigger value="access">Accounts & access</TabsTrigger><TabsTrigger value="kit">Onboarding kit</TabsTrigger><TabsTrigger value="borrowing">Borrowing</TabsTrigger><TabsTrigger value="movements">Deployment history</TabsTrigger></TabsList>
<TabsContent value="overview">
{['Offboarding', 'Offboarded'].includes(employee.status) && (
                <DepartureRecords
                  employeeId={employee.id}
                  refresh={refresh}
                  version={data.events[0]?.id}
                />
              )}
              
              <EmployeeProvisioned
                key={employee.id}
                employeeId={employee.id}
                assets={data.assets}
                assignments={data.assignments}
                requests={data.accountRequests}
                tasks={data.tasks}
              /><details className="profile-arrangement"><summary>Laptop arrangement · company, personal or gadget loan</summary><LaptopArrangements key={employee.id+'-laptop'} fixedEmployee={employee.id} employees={data.employees} assets={data.assets} assignments={data.assignments}/></details>
              
              
              {employee.status === 'Offboarding' && (
                <div className="notice">
                  <strong>
                    {outstanding.length + extraOutstanding === 0
                      ? 'All items cleared'
                      : `${outstanding.length + extraOutstanding} items still need attention`}
                  </strong>
                  <p>
                    Confirm equipment returns, revoke software licenses, and
                    deactivate accounts before completing clearance.
                  </p>
                  <Progress
                    className="mt-3"
                    aria-label="Offboarding clearance"
                    value={
                      assignments.length + extraOutstanding
                        ? (100 * (assignments.length - outstanding.length)) /
                          (assignments.length + extraOutstanding)
                        : 100
                    }
                  />
                </div>
              )}
              <div className="detail-actions">
                {['Active', 'Onboarding'].includes(employee.status) && (
                  <>
                    <button
                      className="primary"
                      onClick={() => openModal('assign')}
                    >
                      <Plus size={16} /> Provision asset
                    </button>
                    <button
                      className="secondary"
                      onClick={() => openModal('offboard')}
                    >
                      Start offboarding
                    </button>
                  </>
                )}
                {employee.status === 'Onboarding' && (
                  <button
                    className="secondary"
                    disabled={busy || !outstanding.length || kitPending}
                    onClick={() =>
                      mutate({ action: 'activate', employeeId: employee.id })
                    }
                  >
                    Complete onboarding
                  </button>
                )}
                {employee.status === 'Offboarding' && (
                  <button
                    className="primary"
                    disabled={
                      busy || outstanding.length > 0 || extraOutstanding > 0
                    }
                    onClick={() =>
                      mutate({ action: 'complete', employeeId: employee.id })
                    }
                  >
                    <ShieldCheck size={16} /> Complete offboarding
                  </button>
                )}
              </div>
              {error && !modal && !confirmation && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}

              
              
              <Tabs defaultValue="assigned">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="assigned" className="px-3">
                    Inventory assignments ({outstanding.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="px-3">
                    History
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="assigned">
                  {outstanding.length
                    ? outstanding.map((a) => {
                        const asset = data.assets.find(
                          (s) => s.id === a.asset_id,
                        );
                        const Icon = iconFor(asset?.kind || 'Hardware');
                        return (
                          <div className="assignment" key={a.id}>
                            <Icon size={22} />
                            <div>
                              <strong>{asset?.name}</strong>
                              <small>
                                {asset?.tag} · {asset?.kind}
                                {a.identifier ? ` · ${a.identifier}` : ''}
                              </small>
                              <small>
                                Provisioned {a.assigned_at.slice(0, 10)}
                              </small>
                            </div>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => {
                                setError('');
                                setConfirmation(a);
                              }}
                            >
                              {asset?.kind === 'Hardware'
                                ? 'Record return'
                                : asset?.kind === 'Software'
                                  ? 'Revoke license'
                                  : 'Deactivate'}
                            </button>
                          </div>
                        );
                      })
                    : empty(
                        'No outstanding assignments',
                        employee.status === 'Offboarded'
                          ? 'All equipment and access have been cleared.'
                          : 'Provision assets to this employee or complete their clearance.',
                      )}
                </TabsContent>
                <TabsContent value="history">
                  {assignments
                    .filter((a) => a.resolved_at)
                    .map((a) => (
                      <div className="assignment" key={a.id}>
                        <CheckCircle2 size={20} />
                        <div>
                          <strong>
                            {data.assets.find((s) => s.id === a.asset_id)?.name}
                          </strong>
                          <small>
                            {a.resolution} · {a.resolved_at?.slice(0, 10)}
                            {a.identifier ? ` · ${a.identifier}` : ''}
                          </small>
                        </div>
                      </div>
                    ))}
                  {data.events
                    .filter((e) => e.employee_id === employee.id)
                    .map((e) => (
                      <div className="events" key={e.id}>
                        {e.message}
                        <small>{new Date(e.created_at).toLocaleString()}</small>
                      </div>
                    ))}
                </TabsContent>
              </Tabs>
            </TabsContent>
<TabsContent value="documents"><Forms key={employee.id+'-forms'}
                fixedEmployee={employee.id}
                forms={data.forms}
                files={data.formFiles}
                employees={data.employees}
                assets={data.assets}
                assignments={data.assignments}
                tasks={data.tasks}
                save={mutate}
                busy={busy}
                error={error}
              /></TabsContent>
<TabsContent value="access"><AccountRequests
                fixedEmployee={employee.id}
                requests={data.accountRequests}
                employees={data.employees}
                save={mutate}
                busy={busy}
                error={error}
              /></TabsContent>
<TabsContent value="kit"><EmployeeKitPanel
                accountRequests={data.accountRequests}
                key={employee.id}
                employee={employee}
                kit={data.kits.find((k) => k.employee_id === employee.id)}
                tasks={data.tasks}
                templates={data.templates}
                assets={data.assets}
                assignments={data.assignments}
                save={mutate}
                busy={busy}
                error={error}
              /></TabsContent>
<TabsContent value="borrowing"><Borrowing employeeId={employee.id} refresh={refresh} version={data.events[0]?.id}/></TabsContent>
<TabsContent value="movements"><MovementHistory employeeId={employee.id}/></TabsContent>
</Tabs>
</div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open && !busy) setModal('');
        }}
      >
        <DialogContent className="!max-w-xl !p-6 max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {modal === 'employee'
                ? 'Add employee'
                : modal === 'asset'
                  ? 'Add to inventory'
                  : modal === 'assign'
                    ? `Provision for ${employee?.name}`
                    : 'Start offboarding'}
            </DialogTitle>
            <DialogDescription>
              {modal === 'employee'
                ? 'Create a new hire record and provision their assets.'
                : modal === 'asset'
                  ? 'Hardware is tracked individually. Software and account services can have multiple seats.'
                  : modal === 'assign'
                    ? 'Choose an available asset or service from the inventory.'
                    : 'Existing assignments will become the employee’s clearance checklist.'}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit} key={modal}>
            <div className="form-grid">
              {modal === 'employee' ? (
                <>
                  {[
                    ['name', 'Full name', 'text', 'e.g. Alex Santos'],
                    ['code', 'Employee ID', 'text', 'e.g. EMP-001'],
                    ['email', 'Work email', 'email', 'alex@company.com'],
                    ['department', 'Department', 'text', 'e.g. Engineering'],
                    ['role', 'Job title', 'text', 'e.g. Software Engineer'],
                    ['startDate', 'Start date', 'date', ''],
                  ].map(([name, label, type, placeholder]) => (
                    <label className="field" key={name}>
                      {label}
                      <input
                        name={name}
                        type={type}
                        required
                        maxLength={200}
                        placeholder={placeholder}
                      />
                    </label>
                  ))}
                </>
              ) : modal === 'asset' ? (
                <>
                  <label className="field full">
                    Asset type
                    <Choice
                      label="Asset type"
                      value={kind}
                      onChange={setKind}
                      options={options(['Hardware', 'Software'])}
                    />
                  </label>
                  <AssetFields key={kind} kind={kind} />
                </>
              ) : modal === 'assign' ? (
                <>
                  {available.length ? (
                    <>
                      <label className="field full">
                        Available asset
                        <Choice
                          label="Choose an asset" expanded
                          value={assetId}
                          onChange={setAssetId}
                          options={[...available].sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true })).map((a) => ({
                            value: a.id,
                            label: `${a.tag} - ${a.name}${a.kind === 'Hardware' ? '' : ` (${a.seats - assignedCount(a.id)} available)`}`,
                          }))}
                        />
                      </label>
                      <label className="field full">
                        {selectedAsset?.kind === 'Account'
                          ? 'Account username / email'
                          : 'Assignment note (optional)'}
                        <input
                          name="identifier"
                          maxLength={200}
                          required={selectedAsset?.kind === 'Account'}
                          placeholder={
                            selectedAsset?.kind === 'Account'
                              ? employee?.email
                              : 'e.g. Primary workstation'
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <div className="notice col-span-full">
                      No available assets. Add inventory or free an existing
                      assignment first.
                      <button
                        type="button"
                        className="row-link mt-3"
                        onClick={() => {
                          setSelected(null);
                          setModal('asset');
                        }}
                      >
                        Add inventory <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="field full">
                    Departure reason
                    <select name="departureReason" defaultValue="Resignation">
                      <option>Resignation</option>
                      <option>End of contract</option>
                      <option>Retirement</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="field full">
                    Last working day
                    <input
                      type="date"
                      name="endDate"
                      min={employee?.start_date}
                      required
                      defaultValue={today()}
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
              <button
                className="primary"
                disabled={busy || (modal === 'assign' && !assetId)}
              >
                {busy
                  ? 'Saving…'
                  : modal === 'employee'
                    ? 'Create employee'
                    : modal === 'asset'
                      ? 'Add asset'
                      : modal === 'assign'
                        ? 'Provision asset'
                        : 'Start offboarding'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Confirm completed action</AlertDialogTitle>
          <AlertDialogDescription>
            {data.assets.find((a) => a.id === confirmation?.asset_id)?.kind ===
            'Hardware'
              ? 'Confirm IT has physically received this equipment.'
              : 'Confirm you have revoked the license or deactivated this account in the external service. This app records the action; it does not perform it.'}
          </AlertDialogDescription>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                mutate({
                  action: 'resolve',
                  employeeId: selected,
                  assignmentId: confirmation?.id,
                })
              }
            >
              {busy ? 'Saving…' : 'Confirm completed'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AssetPanel
        refresh={refresh}
        forms={data.forms}
        formLinks={data.formLinks}
        key={inspected || 'none'}
        asset={data.assets.find((a) => a.id === inspected)}
        maintenance={data.maintenance}
        events={data.assetEvents}
        assignments={data.assignments}
        employees={data.employees}
        onClose={() => setInspected(null)}
        onEmployee={(id) => {
          setInspected(null);
          setSelected(id);
        }}
        save={mutate}
        busy={busy}
        error={error}
      />
    </SidebarProvider>
  );
}

