export type AssetDetails = {
  category?: string;
  brand?: string;
  model?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  specs?: string;
  location?: string;
  room?: string;
  responsible_person?: string;
  condition?: string;
  purchase_date?: string;
  supplier?: string;
  purchase_price?: string;
  currency?: string;
  invoice?: string;
  warranty_end?: string;
  next_service?: string;
  notes?: string;
  custodian?: string;
  custody_type?: string;
  source_sheet?: string;
  source_row?: number;
  source_asset_name?: string;
  source_new_or_old?: string;
  source_condition?: string;
  company?: string;
  released_to?: string;
  date_released?: string;
  date_returned?: string;
  returned_to?: string;
  return_condition?: string;
  sticker_tagging?: string;
};
export type InventoryAsset = {
  is_test?: number;
  borrow_status?: string;
  borrow_employee_id?: string;
  id: string;
  tag: string;
  name: string;
  kind: string;
  serial: string;
  seats: number;
  state: string;
  details: string;
};
export type Maintenance = {
  closure_outcome?: string;
  id: string;
  asset_id: string;
  type: string;
  issue: string;
  provider: string;
  opened_date: string;
  due_date: string | null;
  completed_date: string | null;
  work_done: string;
  cost: string;
  currency: string;
  created_at: string;
};
export type AssetEvent = {
  id: string;
  asset_id: string;
  message: string;
  snapshot: string;
  created_at: string;
};
export function readDetails(asset?: InventoryAsset): AssetDetails {
  try {
    return JSON.parse(asset?.details || '{}');
  } catch {
    return {};
  }
}
export const detailFields: [keyof AssetDetails, string, string][] = [
  ['category', 'Category', 'text'],
  ['brand', 'Manufacturer', 'text'],
  ['model', 'Model', 'text'],
  ['cpu', 'Processor', 'text'],
  ['ram', 'Memory (RAM)', 'text'],
  ['storage', 'Storage', 'text'],
  ['os', 'Operating system', 'text'],
  ['location', 'Office / site', 'text'],
  ['room', 'Room / area', 'text'],
  ['responsible_person', 'Responsible person / team (optional)', 'text'],
  ['purchase_date', 'Purchase date', 'date'],
  ['supplier', 'Supplier', 'text'],
  ['purchase_price', 'Purchase price', 'number'],
  ['invoice', 'Invoice / PO reference', 'text'],
  ['warranty_end', 'Warranty expires', 'date'],
  ['next_service', 'Next service date', 'date'],
];
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
