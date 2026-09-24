import {connection} from '@/server/database.mjs';
import {currentUser,failure} from '@/server/auth.mjs';
export async function GET(request:Request){try{
 const user=currentUser(request),id=user.employee_id;
 const employee=id?connection.prepare('SELECT * FROM employees WHERE id=?').get(id):null;
 const assignments=id?connection.prepare('SELECT x.*,a.tag,a.name,a.kind,a.serial FROM assignments x JOIN assets a ON a.id=x.asset_id WHERE x.employee_id=? ORDER BY x.assigned_at DESC').all(id):[];
 const accounts=id?connection.prepare('SELECT id,provider,username,services,status FROM account_requests WHERE employee_id=? ORDER BY created_at DESC').all(id):[];
 const forms=id?connection.prepare('SELECT id,type,status,payload,submitted_at,reviewed_at,review_note FROM employee_forms WHERE employee_id=? ORDER BY submitted_at DESC').all(id):[];
 const files=id?connection.prepare('SELECT f.id,f.name,f.form_id FROM form_files f JOIN employee_forms e ON e.id=f.form_id WHERE e.employee_id=?').all(id):[];
 const tasks=id?connection.prepare('SELECT id,label,kind,quantity,state FROM kit_tasks WHERE employee_id=? AND assignment_id IS NULL AND account_request_id IS NULL').all(id):[];
 return Response.json({employee,assignments,accounts,forms,files,tasks},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e)}}
