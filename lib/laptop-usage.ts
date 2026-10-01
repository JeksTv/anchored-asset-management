import {hardwareCategory} from './inventory-sections';
import type {InventoryAsset} from './asset-types';
export function matchesLaptopUsage(id:string,usage:string,assets:InventoryAsset[],assignments:{employee_id:string;asset_id:string;resolved_at:string|null}[],arrangements:{employee_id:string;loan_status:string;personal_use:string}[]){
 if(usage==='Company')return assignments.some(a=>a.employee_id===id&&!a.resolved_at&&assets.some(s=>s.id===a.asset_id&&s.kind==='Hardware'&&hardwareCategory(s)==='Laptop'));
 if(usage==='Loan')return arrangements.some(a=>a.employee_id===id&&['Active','Completed'].includes(a.loan_status));
 if(usage==='Personal')return arrangements.some(a=>a.employee_id===id&&a.personal_use==='Yes');
 return true;
}
