import type {InventoryAsset} from './asset-types';
import type {AccountRequest} from './account-types';
import type {KitTask} from './kit-types';
export type ProvisionedAssignment={id:string;employee_id:string;asset_id:string;identifier:string;assigned_at:string;resolved_at:string|null;resolution:string|null};
export type ProvisionedItem={id:string;name:string;category:string;identifier:string;detail:string;quantity:number;active:boolean;status:string;date:string};
export function provisionedItems(employeeId:string,assets:InventoryAsset[],assignments:ProvisionedAssignment[],requests:AccountRequest[],tasks:KitTask[]):ProvisionedItem[]{
const ownTasks=tasks.filter(t=>t.employee_id===employeeId);const result:ProvisionedItem[]=[];
for(const a of assignments.filter(a=>a.employee_id===employeeId)){const asset=assets.find(x=>x.id===a.asset_id);result.push({id:'assignment:'+a.id,name:asset?.name||'Asset record',category:asset?.kind==='Account'?'Accounts & access':asset?.kind==='Software'?'Software & licenses':'Hardware',identifier:asset?.kind==='Account'?a.identifier:[asset?.tag,asset?.serial].filter(Boolean).join('  ·  '),detail:asset?.kind==='Account'?'Legacy account assignment':a.identifier,quantity:1,active:!a.resolved_at,status:a.resolved_at?a.resolution||'Cleared':asset?.state==='Maintenance'?'Assigned  ·  in maintenance':'Assigned',date:a.resolved_at||a.assigned_at});}
for(const r of requests.filter(r=>r.employee_id===employeeId&&['Active','Disabled'].includes(r.status))){result.push({id:'account:'+r.id,name:r.services||r.provider,category:'Accounts & access',identifier:r.username,detail:[r.provider,r.account_role||'Unspecified',r.purpose].filter(Boolean).join('  ·  '),quantity:1,active:r.status==='Active',status:r.status==='Active'?'Active':'Deactivated',date:r.updated_at});}
for(const t of ownTasks.filter(t=>!t.assignment_id&&!t.account_request_id&&['Provisioned','Cleared'].includes(t.state))){const parent=ownTasks.find(p=>p.id===t.parent_id);const account=parent?.account_request_id?requests.find(r=>r.id===parent.account_request_id):undefined;const assignment=parent?.assignment_id?assignments.find(a=>a.id===parent.assignment_id):undefined;const parentAsset=assignment?assets.find(a=>a.id===assignment.asset_id):undefined;result.push({id:'kit:'+t.id,name:t.label,category:t.kind==='Accessory'?'Accessories':t.kind==='Software'?'Software & licenses':'Accounts & access',identifier:account?.username||assignment?.identifier||'',detail:parent?`Included with ${parent.label}${parentAsset?.tag?'  ·  '+parentAsset.tag:''}`:'Onboarding kit item',quantity:t.quantity,active:t.state==='Provisioned',status:t.state==='Cleared'?(t.kind==='Accessory'?'Returned':'Access removed'):(t.kind==='Accessory'?'Issued':'Enabled'),date:t.cleared_at||t.completed_at||''});}
for(const asset of assets.filter(a=>a.borrow_employee_id===employeeId&&a.borrow_status==='Borrowed')){
 if(!result.some(i=>i.id.startsWith('assignment:')&&i.active&&assignments.some(a=>'assignment:'+a.id===i.id&&a.asset_id===asset.id)))result.push({id:'borrowing:'+asset.id,name:asset.name,category:'Temporary borrowing',identifier:[asset.tag,asset.serial].filter(Boolean).join(' · '),detail:'Return through Temporary Borrowing',quantity:1,active:true,status:'Borrowed',date:''});
}
return result;
}

/** Operational guidance only; completion remains in the source workflow. */
export function offboardingAction(item:ProvisionedItem):string{
 if(!item.active)return 'Completed';
 if(item.category==='Temporary borrowing')return 'Return borrowed equipment and close the borrowing record';
 if(item.category==='Hardware'||item.category==='Accessories')return 'Receive item and record return condition';
 if(item.category==='Software & licenses')return 'Remove access and reclaim the assigned license';
 return item.detail.includes('Shared access')?'Remove this employeeâ€™s shared access; retain access for others':'Deactivate account and confirm business data handover';
}
