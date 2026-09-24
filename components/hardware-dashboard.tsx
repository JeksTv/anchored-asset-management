'use client';
import type { InventoryAsset } from '@/lib/asset-types';
import { hardwareTypes, hardwareCategory, inSection, inventoryStatus } from '@/lib/inventory-sections';
export function HardwareDashboard({ assets, assignments, section, onSection, status, onStatus }: {
  assets: InventoryAsset[];
  assignments: { asset_id: string; resolved_at: string | null }[];
  section: string; onSection: (section: string) => void;
  status: string; onStatus: (status: string) => void;
}) {
  const assigned = new Set(assignments.filter((a) => !a.resolved_at).map((a) => a.asset_id));
  const categories = [...new Set([...hardwareTypes, ...assets.filter((a) => a.kind === 'Hardware').map(hardwareCategory)])];
  const sections = ['All assets', ...categories, 'Software'];
  const scoped = assets.filter((a) => inSection(a, section));
  const hardware = scoped.filter((a) => a.kind === 'Hardware');
  const counts = ['Available', 'Deployed', 'Reserved', 'Borrowed', 'Maintenance', 'Retired', 'Other'].map((state) => ({state, count: hardware.filter((a) => inventoryStatus(a, assigned) === state).length}));
  return <section className="inventory-section-overview" aria-label="Asset type overview">
    <div className="inventory-section-heading">
      <div><h2>{section === 'All assets' ? 'All assets' : `${section} overview`}</h2><p>{section === 'Software' ? 'Software licenses and capacity. Open a record for details.' : 'Choose a hardware section to see its overview and assets.'}</p></div>
      <label>Inventory section<select value={section} onChange={(e) => onSection(e.target.value)}>{sections.map((name) => <option key={name} value={name}>{name} ({assets.filter((a) => inSection(a, name)).length})</option>)}</select></label>
    </div>
    <div className="inventory-section-stats">
      <button aria-pressed={status === 'All hardware states'} onClick={() => onStatus('All hardware states')}><span>Total assets</span><strong>{scoped.length}</strong></button>
      {section !== 'Software' && counts.filter((c) => c.state !== 'Other' || c.count > 0).map(({state, count}) => <button key={state} aria-pressed={status === state} onClick={() => onStatus(state)}><span>{state === 'Maintenance' ? 'Under maintenance' : state}{section === 'All assets' ? ' · hardware' : ''}</span><strong>{count}</strong></button>)}
    </div>
    {section !== 'Software' && <p className="inventory-section-note">Counts cover the entire section. Deployed includes employee or shared custody. Maintenance and retired equipment are counted separately.</p>}
  </section>;
}
