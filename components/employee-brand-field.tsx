'use client';
import {useState} from 'react';
import brands from '@/lib/employee-brands.json';
import mapping from '@/lib/brand-departments.json';
export function EmployeeBrandField({value='',department=''}:{value?:string;department?:string}){
 const [brand,setBrand]=useState(value),[selected,setSelected]=useState(department);
 const departments=(mapping as Record<string,string[]>)[brand]||[];
 const legacy=brand===value&&department&&!departments.includes(department);
 return <><label className="field">Brand<select name="brand" value={brand} required={!value&&!department} onChange={e=>{const next=e.target.value;setBrand(next);setSelected('')}}><option value="">Choose brand</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}</select></label><label className="field">Department<select name="department" value={selected} required onChange={e=>setSelected(e.target.value)} disabled={!brand&&!department}><option value="">{brand?'Choose department':'Choose brand first'}</option>{legacy&&<option value={department}>{department} (existing record)</option>}{departments.map(d=><option key={d} value={d}>{d}</option>)}</select></label></>;
}
