"""Import Master data Column B. Preview by default; --apply saves verified matches."""
import json, sqlite3, sys, uuid, datetime
from pathlib import Path
source=Path(sys.argv[1]); rows=json.loads(source.read_text(encoding='utf-8'))
db=sqlite3.connect('data/anchored.sqlite');db.row_factory=sqlite3.Row
employees=[dict(r) for r in db.execute('SELECT id,code,name,email,brand FROM employees')]
valid=json.loads(Path('lib/employee-brands.json').read_text())
norm=lambda s:' '.join(str(s).upper().split())
# IT explicitly confirmed these identities earlier in the migration.
aliases={'VCIS368':'Christian Mateo','VCIS369':'Davin Buhay'}
plan=[];unmatched=[];blank=[]
for row in rows:
 if not row['brand']:blank.append(row);continue
 if row['brand'] not in valid: raise ValueError('Unknown type at row '+str(row['row']))
 matches=[e for e in employees if norm(e['code'])==norm(row['code'])];method='employee ID'
 if not matches:
  method='exact name';matches=[e for e in employees if norm(e['name'])==norm(row['name'])]
 if not matches and row.get('email'):
  method='exact work email';matches=[e for e in employees if norm(e['email'])==norm(row['email'])]
 if not matches and row['code'] in aliases:
  method='previously confirmed identity';matches=[e for e in employees if e['name']==aliases[row['code']]]
 if len(matches)!=1:unmatched.append(row);continue
 e=matches[0];plan.append({**row,'id':e['id'],'match':method,'before':e['brand']})
if len({r['id'] for r in plan})!=len(plan):raise ValueError('Duplicate employee targets')
changes=[r for r in plan if r['before']!=r['brand']]
report={'source':str(source),'sheet':'Master data','column':'B','matched':len(plan),'changes':len(changes),'blank':blank,'unmatched':unmatched,'plan':plan}
if '--apply' in sys.argv:
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 backup=Path('backups')/('before-master-brand-'+stamp+'.sqlite');backup.parent.mkdir(exist_ok=True)
 with sqlite3.connect(backup) as target:db.backup(target)
 with db:
  for r in changes:
   result=db.execute('UPDATE employees SET brand=? WHERE id=? AND brand=?',(r['brand'],r['id'],r['before']))
   if result.rowcount!=1:raise ValueError('Record changed since review')
   db.execute('INSERT INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)',(str(uuid.uuid4()),r['id'],'Brand imported from HR Master data B'+str(r['row'])+': '+(r['before'] or 'Not recorded')+' → '+r['brand'],datetime.datetime.now(datetime.timezone.utc).isoformat()))
 report['backup']=str(backup)
Path('migration-data/employee-brand-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='plan'},ensure_ascii=False))
