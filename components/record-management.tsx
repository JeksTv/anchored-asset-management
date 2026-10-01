'use client';
import {EmployeeBrandField} from '@/components/employee-brand-field';
import {EmploymentTypeField} from './employment-type-field';
import { useState } from 'react';
import { AssetFields } from './asset-panel';
import type { InventoryAsset } from '@/lib/asset-types';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

type Employee={brand?:string;employment_type?:string;external_company?:string;internal_sponsor?:string;id:string;code:string;name:string;email:string;department:string;role:string;start_date:string;status:string;is_test?:number};
type Preview={identifier:string;name:string;canDelete:boolean;reason:string;counts:Record<string,number>;linkedAssetsPreserved?:boolean};
type Kind='employee'|'asset';
export function RecordManagement({employees,assets,refresh}:{employees:Employee[];assets:InventoryAsset[];refresh:()=>Promise<void>}){
 const [tab,setTab]=useState<'employees'|'assets'>('employees'),[search,setSearch]=useState(''),[testOnly,setTestOnly]=useState(false),[page,setPage]=useState(1),[mode,setMode]=useState(''),[selected,setSelected]=useState(''),[kind,setKind]=useState('Hardware'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[identifier,setIdentifier]=useState('');
 const employee=employees.find(e=>e.id===selected),asset=assets.find(a=>a.id===selected),record=tab==='employees'?employee:asset,recordKind:Kind=tab==='employees'?'employee':'asset';
 const records=tab==='employees'?employees:assets.filter(a=>a.kind!=='Account');
 const rows=records.filter(r=>(!testOnly||r.is_test)&&Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase()))),pages=Math.max(1,Math.ceil(rows.length/8)),current=Math.min(page,pages);
 async function open(action:string,id=''){
  setSelected(id);setMode(action);setError('');setPreview(null);setIdentifier('');setKind(assets.find(a=>a.id===id)?.kind||'Hardware');
  if(action==='deleteTest')try{const r=await fetch(`/api/records?kind=${recordKind}&id=${encodeURIComponent(id)}`);const d=await r.json() as Preview&{error?:string};if(!r.ok)throw Error(d.error);setPreview(d)}catch(e){setError((e as Error).message)}
 }
 async function save(form:HTMLFormElement){
  setBusy(true);setError('');const fields=Object.fromEntries(new FormData(form));
  const action=mode==='delete'?(tab==='employees'?'deleteEmployee':'deleteAsset'):mode==='deleteTest'?'deleteTestRecord':mode==='markTest'?'markTestRecord':tab==='employees'?(selected?'editEmployee':'employee'):(selected?'editAsset':'asset');
  try{
   const endpoint=['employee','asset','editAsset'].includes(action)?'/api/workspace':'/api/records';
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,action,id:selected,assetId:selected,kind:['asset','editAsset'].includes(action)?kind:recordKind,startDate:fields.start_date,testRecord:fields.testRecord==='on',identifier})});
   const b=await r.json() as {error?:string};if(!r.ok)throw Error(b.error);
   await refresh();setMode('');setMessage(mode==='deleteTest'?'Test record and its linked test activity deleted.':mode==='delete'?'Unused record deleted.':mode==='markTest'?'Record marked as test data. Review its cleanup preview before deleting.':'Record saved.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 const removing=mode==='delete'||mode==='deleteTest',label=tab==='employees'?'employee ID':'asset tag',expected=recordKind==='employee'?employee?.code:asset?.tag;
 return <section className="record-management">
  <div className="detail-actions"><button className={tab==='employees'?'primary':'secondary'} onClick={()=>{setTab('employees');setPage(1);setSearch('')}}>Employees</button><button className={tab==='assets'?'primary':'secondary'} onClick={()=>{setTab('assets');setPage(1);setSearch('')}}>Assets</button><button className="primary" onClick={()=>open('edit')}>Add {tab==='employees'?'employee':'asset'}</button></div>
  <p>Mark test records explicitly, then review and remove their linked test activity. Operational records retain their history.</p>
  {message&&<p role="status" className="success">{message}</p>}
  <div className="toolbar"><label className="field">Search {tab}<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><label><input type="checkbox" checked={testOnly} onChange={e=>{setTestOnly(e.target.checked);setPage(1)}}/> Show test records only</label></div>
  <div className="access-table"><table><thead><tr><th>Name</th><th>{tab==='employees'?'Employee ID / department':'Asset tag / type'}</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.slice((current-1)*8,current*8).map(r=><tr key={r.id}><td>{r.name}{!!r.is_test&&<span className="badge"> Test</span>}</td><td>{'code' in r?`${r.code} · ${r.department}`:`${r.tag} · ${r.kind}`}</td><td>{'status' in r?r.status:r.state}</td><td><button onClick={()=>open('edit',r.id)}>Edit</button>{r.is_test?<button onClick={()=>open('deleteTest',r.id)}>Delete test data</button>:<><button onClick={()=>open('markTest',r.id)}>Mark as test</button><button onClick={()=>open('delete',r.id)}>Delete unused</button></>}</td></tr>)}</tbody></table>{!rows.length&&<p>No matching records.</p>}</div>
  <div className="detail-actions"><button className="secondary" disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current} of {pages} · {rows.length} records</span><button className="secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>
  <Dialog open={!!mode} onOpenChange={v=>{if(!v&&!busy)setMode('')}}><DialogContent className="!max-w-2xl max-h-[85vh] overflow-auto"><DialogTitle>{mode==='deleteTest'?'Delete test data':mode==='markTest'?'Mark as test data':mode==='delete'?'Delete unused record':selected?'Edit record':'Create record'}</DialogTitle><DialogDescription>{mode==='deleteTest'?`Review all linked records that will be removed from ${record?.name}. This cannot be undone.`:mode==='markTest'?`Only label ${record?.name} as test data if it was created for testing. This label enables deletion of linked test activity.`:mode==='delete'?`Delete ${record?.name}? Only unused records can be deleted this way.`:'Save employee or inventory details. Employment status changes through onboarding and offboarding.'}</DialogDescription>
  <form key={`${tab}-${selected}-${mode}`} onSubmit={e=>{e.preventDefault();void save(e.currentTarget)}}>
   {!removing&&mode!=='markTest'&&<div className="form-grid">{tab==='employees'?(['name','code','email','role','start_date'] as const).map(field=><label className="field" key={field}>{({name:'Full name',code:'Employee ID',email:'Work email',department:'Department',role:'Job title',start_date:'Start date'})[field]}<input name={field} type={field==='email'?'email':field==='start_date'?'date':'text'} defaultValue={employee?.[field]||''} required={field!=='start_date'||!selected} maxLength={200}/></label>):<><label className="field full">Asset type<select value={kind} disabled={!!selected} onChange={e=>setKind(e.target.value)}><option>Hardware</option><option>Software</option></select></label><AssetFields key={kind} kind={kind} asset={asset}/></>}{tab==='employees'&&<EmployeeBrandField value={employee?.brand} department={employee?.department}/>}{tab==='employees'&&<EmploymentTypeField value={employee?.employment_type} company={employee?.external_company} sponsor={employee?.internal_sponsor}/>}{!selected&&<label className="field full"><input type="checkbox" name="testRecord"/> This is a test {recordKind} (allows test cleanup later)</label>}</div>}
   {mode==='deleteTest'&&<div className="test-cleanup-preview">{preview?<><h3>Linked records to remove</h3><ul>{Object.entries(preview.counts).filter(([,n])=>n>0).map(([name,n])=><li key={name}>{name.replace(/([A-Z])/g,' $1')}: {n}</li>)}</ul>{!Object.values(preview.counts).some(Boolean)&&<p>No linked records.</p>}{preview.linkedAssetsPreserved&&<p>Assigned asset inventory records remain; their test assignments are removed.</p>}{preview.reason&&<p role="alert">{preview.reason}</p>}</>:!error&&<p>Loading cleanup preview…</p>}</div>}
   {(mode==='deleteTest'||mode==='markTest')&&<label className="field full">Type the exact {label}: <strong>{expected}</strong><input autoComplete="off" value={identifier} onChange={e=>setIdentifier(e.target.value)} required/></label>}
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setMode('')}>Cancel</button><button className="primary" disabled={busy||(mode==='deleteTest'&&(!preview?.canDelete||identifier!==expected))||(mode==='markTest'&&identifier!==expected)}>{busy?'Saving…':mode==='deleteTest'?'Delete test data':mode==='markTest'?'Mark as test':mode==='delete'?'Delete record':'Save record'}</button></div>
  </form></DialogContent></Dialog>
 </section>;
}
