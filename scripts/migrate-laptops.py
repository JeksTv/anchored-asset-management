"""Add missing LAPTOPS records; preserve all existing assets and assignments.
Preview by default. Source is a private XLSX export, columns C:Y only.
"""
import argparse, collections, csv, hashlib, json, re, sqlite3, unicodedata
from datetime import datetime, date
from pathlib import Path
import openpyxl

def text(v):
    if v is None: return ''
    if isinstance(v,(datetime,date)): return v.isoformat()
    if isinstance(v,float) and v.is_integer(): return str(int(v))
    return str(v).strip()
def norm(v):
    return ' '.join(re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',text(v)).encode('ascii','ignore').decode().lower()))
def serial(v):
    s=text(v)
    if re.fullmatch(r'[0-9]+[.]0',s): s=s[:-2]
    return '' if norm(s) in ('','na','n a','none','for update','tbd') else s.upper()
def valid_date(v):
    if isinstance(v,(datetime,date)): return v.date().isoformat() if isinstance(v,datetime) else v.isoformat()
    for fmt in ('%Y-%m-%d','%b %d, %Y','%B %d, %Y','%b. %d, %Y'):
        try: return datetime.strptime(text(v).replace('Sept','Sep'),fmt).date().isoformat()
        except ValueError: pass
    return ''
def ident(kind,tag): return 'laptop-fill-'+hashlib.sha256((kind+':'+tag.upper()).encode()).hexdigest()
def plan(db,workbook,decisions):
    rows=list(openpyxl.load_workbook(workbook,read_only=True,data_only=True)['LAPTOPS'].values)
    if rows[0][2:6] != ('Control Number','Asset','Model','Serial Number'): raise ValueError('Unexpected laptop column layout')
    source=[(i,r) for i,r in enumerate(rows[1:],2) if text(r[2])]
    tags=[text(r[2]).upper() for _,r in source]
    if len(tags)!=len(set(tags)): raise ValueError('Duplicate source tags')
    old={text(a['tag']).upper():dict(a) for a in db.execute('select * from assets')}
    employees=[dict(e) for e in db.execute("select * from employees where status in ('Active','Onboarding') and is_test=0")]
    approved={x['asset_tag'].upper():x for x in json.loads(decisions.read_text(encoding='utf-8-sig')).get('decisions',[])} if decisions.exists() else {}
    serial_tags=collections.defaultdict(list)
    for _,r in source:
        if serial(r[5]): serial_tags[serial(r[5])].append(text(r[2]))
    result=[]
    for rownum,r in source:
        tag=text(r[2]); key=tag.upper(); status=text(r[11]); recipient=text(r[13]); warnings=[]
        if key in old:
            a=old[key]
            if a['kind']!='Hardware' or json.loads(a['details']).get('category')!='Laptop': raise ValueError('Tag/category conflict: '+tag)
            if serial(a['serial'])!=serial(r[5]): raise ValueError('Serial conflict: '+tag)
            result.append(dict(tag=tag,action='existing - unchanged',source_row=rownum,source_status=status));continue
        cross=[a['tag'] for a in old.values() if serial(r[5]) and serial(a['serial'])==serial(r[5])]
        if cross: raise ValueError(f'Serial already exists under another tag: {tag}: {cross}')
        if len(serial_tags[serial(r[5])])>1: warnings.append('Duplicate source serial: '+', '.join(serial_tags[serial(r[5])]))
        status_key=status.lower(); service=''; state='Ready'; employee=None; assigned=valid_date(r[12])
        if status_key=='for retirement': state='Retired';warnings.append('Source says For Retirement; retirement completion is not confirmed.')
        elif status_key in ('for repair','for evaluation','for upgrade','reserved'):
            state='Maintenance'; service={'for repair':'Repair','for upgrade':'Upgrade'}.get(status_key,'Inspection')
            warnings.append('Imported hold: '+status+'. Review and complete this hold before provisioning; service start is unknown.')
        elif status_key not in ('deployed','available'): raise ValueError('Unknown status: '+status)
        if status_key=='deployed':
            decision=approved.get(key,{})
            if decision.get('decision')=='confirmed' and norm(decision.get('source_recipient'))==norm(recipient):
                found=[e for e in employees if e['code']==decision.get('employee_id')]
            elif decision.get('decision')=='hold': found=[]
            else: found=[e for e in employees if norm(e['name'])==norm(recipient) and norm(recipient)]
            if len(found)==1 and assigned: employee=found[0]
            if not employee: warnings.append('Current custody needs employee/date review; source custodian retained.')
        raw={f'{text(rows[0][j])} [{j+1}]':text(r[j]) for j in range(2,25) if r[j] is not None}
        details=dict(category='Laptop',model=text(r[4]),condition='Damaged' if 'not working' in text(r[10]).lower() else 'Good',currency='PHP',source_sheet='LAPTOPS',source_row=rownum,source_status=status,source_condition=text(r[10]),released_to=recipient,date_released=text(r[12]),company=text(r[14]),migration_source=raw)
        for index,field in [(6,'purchase_date'),(18,'warranty_end')]:
            if valid_date(r[index]):details[field]=valid_date(r[index])
        details['notes']='Source status: '+status+'. Company: '+text(r[14])+'. Bag: '+text(r[21])+'. Other assets: '+text(r[23])+'. Remarks: '+text(r[24])+'. '+ ' '.join(warnings)
        if status_key=='deployed' and not employee:
            details.update(custodian=recipient or 'Unconfirmed custodian (source marked Deployed)',custody_type='unmatched source custodian')
        result.append(dict(tag=tag,action='create',source_row=rownum,source_status=status,state=state,service=service,name=text(r[4]) or 'Laptop',serial=serial(r[5]),details=details,employee_id=employee['id'] if employee else '',employee_code=employee['code'] if employee else '',assigned_at=assigned,warnings=' '.join(warnings)))
    return result

def apply(db,rows):
    now=datetime.now().astimezone().isoformat(); today=now[:10]
    for x in rows:
        if x['action']!='create':continue
        aid=ident('asset',x['tag']); details=json.dumps(x['details'],ensure_ascii=False)
        db.execute("insert into assets(id,tag,name,kind,serial,seats,state,details) values(?,?,?,'Hardware',?,1,?,?)",(aid,x['tag'],x['name'],x['serial'],x['state'],details))
        db.execute('insert into asset_events(id,asset_id,message,snapshot,created_at) values(?,?,?,?,?)',(ident('event',x['tag']),aid,'Imported missing LAPTOPS row '+str(x['source_row'])+'; source status: '+x['source_status'],details,now))
        if x['service']:
            db.execute('insert into maintenance(id,asset_id,type,issue,opened_date,created_at) values(?,?,?,?,?,?)',(ident('hold',x['tag']),aid,x['service'],'Migration hold: '+x['source_status']+'. Logged on import date; original service/reservation start unknown. Review before release.',today,now))
        if x['employee_id']:
            db.execute('insert into assignments(id,employee_id,asset_id,identifier,assigned_at) values(?,?,?,?,?)',(ident('assignment',x['tag']),x['employee_id'],aid,'Migrated existing custody from LAPTOPS; not a new handover.',x['assigned_at']+'T00:00:00.000Z'))
            db.execute('insert into events(id,employee_id,message,created_at) values(?,?,?,?)',(ident('employee-event',x['tag']),x['employee_id'],x['tag']+' existing laptop custody imported from tracker.',now))
    if db.execute('pragma foreign_key_check').fetchall():raise ValueError('Foreign key check failed')

def main():
    p=argparse.ArgumentParser();p.add_argument('workbook',type=Path);p.add_argument('--database',type=Path,default=Path('data/anchored.sqlite'));p.add_argument('--decisions',type=Path,default=Path('migration-data/laptop-decisions.json'));p.add_argument('--report',type=Path,default=Path('migration-data/laptop-completion-report.json'));p.add_argument('--apply',action='store_true');a=p.parse_args()
    if not a.database.is_file():raise ValueError('Database does not exist')
    db=sqlite3.connect(a.database,timeout=30);db.row_factory=sqlite3.Row;db.execute('pragma foreign_keys=on')
    # Lock writers before planning so concurrent UI changes cannot invalidate the plan.
    db.execute('begin immediate' if a.apply else 'begin')
    try:
        rows=plan(db,a.workbook,a.decisions)
        summary=dict(source=len(rows),existing=sum(x['action']!='create' for x in rows),new=sum(x['action']=='create' for x in rows),assignments=sum(bool(x.get('employee_id')) for x in rows),source_statuses=dict(collections.Counter(x['source_status'] for x in rows if x['action']=='create')))
        a.report.parent.mkdir(exist_ok=True,parents=True);a.report.write_text(json.dumps(dict(summary=summary,rows=rows),ensure_ascii=False,indent=2),encoding='utf-8')
        if a.apply and summary['new']:
            backup=Path('backups')/datetime.now().strftime('%Y-%m-%dT%H-%M-%S-laptop-completion');backup.mkdir(parents=True,exist_ok=False)
            # A separate read connection captures the pre-write database while our write lock holds.
            src=sqlite3.connect(a.database); dest=sqlite3.connect(backup/'anchored.sqlite');src.backup(dest);dest.close();src.close()
            apply(db,rows);db.commit();print('Backup:',backup)
        else:db.rollback()
        print(json.dumps(summary));print('Applied' if a.apply else 'Preview only')
    except:db.rollback();raise
    finally:db.close()
if __name__=='__main__':main()
