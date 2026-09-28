"""Import deployment/return history only. Never changes current custody. Preview by default."""
import argparse,sqlite3,json,hashlib,re,unicodedata
from pathlib import Path
from datetime import datetime,date,timezone
import openpyxl

def text(v):
 if v is None:return ''
 if isinstance(v,(date,datetime)):return v.isoformat()
 if isinstance(v,float) and v.is_integer():return str(int(v))
 return str(v).strip()
def norm(v):return ' '.join(re.findall('[a-z0-9]+',unicodedata.normalize('NFKD',text(v)).encode('ascii','ignore').decode().lower()))
def serial(v):
 s=text(v).upper()
 if re.fullmatch(r'\d+[.]0',s):s=s[:-2]
 return '' if norm(s) in ('','na','n a','for update','none') else s

def day(v):
 if isinstance(v,(date,datetime)):return v.isoformat()[:10]
 for fmt in ('%Y-%m-%d','%b. %d, %Y','%b %d, %Y','%B %d, %Y','%m/%d/%Y'):
  try:return datetime.strptime(text(v).replace('Sept','Sep'),fmt).date().isoformat()
  except ValueError:pass
 return ''
def collect(workbook,db):
 assets=[dict(a) for a in db.execute("select * from assets where kind='Hardware'")];employees=[dict(e) for e in db.execute('select id,code,name from employees where is_test=0')]
 rows=[];seen=set();duplicates=0
 for sheet in openpyxl.load_workbook(workbook,read_only=True,data_only=True):
  if not sheet.title.startswith(('DEPLOYED LAPTOP','RETURNED LAPTOP')):continue
  values=sheet.iter_rows(values_only=True);headers=[text(h) for h in next(values)];deployed=sheet.title.startswith('DEPLOYED')
  for number,r in enumerate(values,2):
   raw={k:text(r[i]) for i,k in enumerate(headers) if k and i<len(r)}
   name=raw.get('Released to' if deployed else 'Name','');tag=raw.get('Control Number' if deployed else 'Control #','');sn=raw.get('Serial Number','');date_raw=r[headers.index('Date Released' if deployed else 'Date of Returned')]
   if not (name or tag or sn) or not (tag or sn or text(date_raw)):continue
   key=hashlib.sha256(json.dumps([sheet.title,raw],sort_keys=True,ensure_ascii=False).encode()).hexdigest()
   if key in seen:duplicates+=1;continue
   seen.add(key);notes=[];a=None
   bytag=[x for x in assets if x['tag'].strip().upper()==tag.upper()] if tag else []
   byserial=[x for x in assets if serial(sn) and serial(x['serial'])==serial(sn)]
   if len(bytag)==1:
    a=bytag[0]
    if serial(sn) and serial(a['serial']) and serial(sn)!=serial(a['serial']):notes.append('Control number / serial conflict');a=None
   elif not tag and len(byserial)==1:a=byserial[0]
   if not a:notes.append('Asset match needs review')
   tokens=norm(name).split();matches=[e for e in employees if norm(e['name'])==norm(name) and tokens]
   if not matches and len(tokens)>=2:matches=[e for e in employees if tokens[0] in norm(e['name']).split() and tokens[-1] in norm(e['name']).split()]
   e=matches[0] if len(matches)==1 else None
   if not e:notes.append('Employee match needs review')
   occurred=day(date_raw)
   if not occurred:notes.append('Date needs review')
   rows.append(dict(id='movement-'+key,asset_id=a['id'] if a else None,employee_id=e['id'] if e else None,movement_type='Deployment' if deployed else 'Return',occurred_on=occurred,source_date=text(date_raw),source_tag=tag,source_serial=sn,source_employee=name,reason=raw.get('Reason for Returning',''),allocated_to=raw.get('Allocated to',''),source_sheet=sheet.title,source_row=number,source_payload=json.dumps(raw,ensure_ascii=False),review_note='; '.join(notes),imported_at=datetime.now(timezone.utc).isoformat()))
 return rows,duplicates

def main():
 p=argparse.ArgumentParser();p.add_argument('workbook',type=Path);p.add_argument('--database',type=Path,default=Path('data/anchored.sqlite'));p.add_argument('--apply',action='store_true');args=p.parse_args()
 assert args.database.is_file();db=sqlite3.connect(args.database,timeout=30);db.row_factory=sqlite3.Row;db.execute('pragma foreign_keys=on');db.execute('begin immediate' if args.apply else 'begin')
 try:
  rows,duplicates=collect(args.workbook,db);summary={'records':len(rows),'deployments':sum(r['movement_type']=='Deployment' for r in rows),'returns':sum(r['movement_type']=='Return' for r in rows),'asset_matches':sum(bool(r['asset_id']) for r in rows),'employee_matches':sum(bool(r['employee_id']) for r in rows),'needs_review':sum(bool(r['review_note']) for r in rows),'exact_duplicates_skipped':duplicates}
  report=Path('migration-data/movement-import-report.json');report.parent.mkdir(exist_ok=True);report.write_text(json.dumps({'summary':summary,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8')
  if args.apply:
   backup=Path('backups')/datetime.now().strftime('%Y-%m-%dT%H-%M-%S-movement-history');backup.mkdir(parents=True);src=sqlite3.connect(args.database);dst=sqlite3.connect(backup/'anchored.sqlite');src.backup(dst);src.close();dst.close()
   added=0
   for r in rows:
    keys=list(r);added+=db.execute('insert or ignore into asset_movements('+','.join(keys)+') values('+','.join('?' for k in keys)+')',list(r.values())).rowcount
   assert not db.execute('pragma foreign_key_check').fetchall();db.commit();summary['added']=added
  else:db.rollback()
  print(json.dumps(summary))
 except:db.rollback();raise
 finally:db.close()
if __name__=='__main__':main()
