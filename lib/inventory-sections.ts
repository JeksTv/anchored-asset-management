import { readDetails, type InventoryAsset } from './asset-types';
export const hardwareTypes = ['Laptop', 'Desktop', 'Monitor', 'Mobile phone', 'Tablet', 'Mouse', 'Keyboard', 'Headset', 'Webcam', 'Charger / power adapter', 'Laptop bag', 'HDMI cable', 'VGA cable', 'External drive', 'SSD', 'RAM', 'Wi-Fi adapter', 'Printer', 'iPad', 'Smart TV', 'Conference microphone', 'Camera', 'VGA to HDMI adapter', 'Notebook cooler'];
export function hardwareCategory(asset: InventoryAsset) {
  const raw = readDetails(asset).category?.trim() || 'Uncategorized';
  return hardwareTypes.find((type) => type.toLowerCase() === raw.toLowerCase()) || raw;
}
export function inventoryStatus(asset: InventoryAsset, assigned: Set<string>) {
  if (asset.borrow_status) return asset.borrow_status;
  if (asset.state === 'Maintenance') return 'Maintenance';
  if (asset.state === 'Retired') return 'Retired';
  if (asset.state !== 'Ready') return 'Other';
  return assigned.has(asset.id) || readDetails(asset).custodian?.trim() ? 'Deployed' : 'Available';
}
export function inSection(asset: InventoryAsset, section: string) {
  if (asset.kind === 'Account') return false;
  if (section === 'All assets') return true;
  if (section === 'Software') return asset.kind === 'Software';
  return asset.kind === 'Hardware' && hardwareCategory(asset) === section;
}
