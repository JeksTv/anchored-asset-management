'use client';
import {matchesLaptopUsage} from '@/lib/laptop-usage';
import type {InventoryAsset} from '@/lib/asset-types';
export function BrandLaptopSummary({brand,employees,assets,assignments,arrangements,selected,onSelect}:{brand:string;employees:{id:string}[];assets:InventoryAsset[];assignments:{employee_id:string;asset_id:string;resolved_at:string|null}[];arrangements:{employee_id:string;loan_status:string;personal_use:string}[];selected:string;onSelect:(value:string)=>void}){
 const categories=[['All','Total team members'],['Company','Using company laptop'],['Loan','Availed gadget loan'],['Personal','Using personal laptop']];
 return <section className="inventory-section-overview" aria-label="Brand personnel summary"><div className="inventory-section-heading"><h2>{brand} · Team overview</h2></div><div className="inventory-section-stats">{categories.map(([key,label])=><button key={key} aria-pressed={selected===key} onClick={()=>onSelect(key)}><span>{label}</span><strong>{new Set(employees.filter(e=>matchesLaptopUsage(e.id,key,assets,assignments,arrangements)).map(e=>e.id)).size}</strong></button>)}</div><p className="inventory-section-note">Select a card to filter the list. Select Total team members to reset. Counts follow brand, personnel, status and search filters, before pagination. Gadget loans include Active and Completed; categories may overlap.</p></section>;
}
