"""Import Master data Column N. Preview by default; --apply saves verified matches."""
import json, sqlite3, sys, uuid, datetime
from pathlib import Path
source=Path(sys.argv[1]); rows=json.loads(source.read_text(encoding='utf-8'))
db=sqlite3.connect('data/anchored.sqlite');db.row_factory=sqlite3.Row
employees=[dict(r) for r in db.execute('SELECT id,code,name,email,employment_type FROM employees')]
valid=json.loads(Path('lib/employment-types.json').read_text())
norm=lambda s:' '.join(str(s).upper().split())
# IT explicitly confirmed these identities earlier in the migration.
aliases={'VCIS368':'Christian Mateo','VCIS369':'Davin Buhay'}
plan=[];unmatched=[];blank=[]
for row in rows:
 if not row['employment_type']:blank.append(row);continue
 if row['employment_type'] not in valid: raise ValueError('Unknown type at row '+str(row['row']))
 matches=[e for e in employees if norm(e['code'])==norm(row['code'])];method='employee ID'
 if not matches:
  method='exact name';matches=[e for e in employees if norm(e['name'])==norm(row['name'])]
 if not matches and row.get('email'):
  method='exact work email';matches=[e for e in employees if norm(e['email'])==norm(row['email'])]
 if not matches and row['code'] in aliases:
  method='previously confirmed identity';matches=[e for e in employees if e['name']==aliases[row['code']]]
 if len(matches)!=1:unmatched.append(row);continue
 e=matches[0];plan.append({**row,'id':e['id'],'match':method,'before':e['employment_type']})
if len({r['id'] for r in plan})!=len(plan):raise ValueError('Duplicate employee targets')
changes=[r for r in plan if r['before']!=r['employment_type']]
report={'source':str(source),'sheet':'Master data','column':'N','matched':len(plan),'changes':len(changes),'blank':blank,'unmatched':unmatched,'plan':plan}
if '--apply' in sys.argv:
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 backup=Path('backups')/('before-master-employment-'+stamp+'.sqlite');backup.parent.mkdir(exist_ok=True)
 with sqlite3.connect(backup) as target:db.backup(target)
 with db:
  for r in changes:
   result=db.execute('UPDATE employees SET employment_type=? WHERE id=? AND employment_type=?',(r['employment_type'],r['id'],r['before']))
   if result.rowcount!=1:raise ValueError('Record changed since review')
   db.execute('INSERT INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)',(str(uuid.uuid4()),r['id'],'Employment type imported from HR Master data N'+str(r['row'])+': '+(r['before'] or 'Not recorded')+' → '+r['employment_type'],datetime.datetime.now(datetime.timezone.utc).isoformat()))
 report['backup']=str(backup)
Path('migration-data/employment-type-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='plan'},ensure_ascii=False))
