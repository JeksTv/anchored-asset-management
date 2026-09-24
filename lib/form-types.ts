export type EmployeeForm={id:string;employee_id:string|null;type:string;status:string;payload:string;submitted_by:string;submitted_at:string;reviewed_by:string|null;review_note:string|null;reviewed_at:string|null};
export type FormFile={id:string;form_id:string|null;name:string;mime:string;size:number};
export type AcknowledgedItem={name:string;tag:string;serial:string;condition:string};
export type FormPayload={employee:{id?:string;code:string;name:string;email:string;department:string;role:string;start_date:string};date:string;reason:string;notes:string;signature:string;items:AcknowledgedItem[];selection:string[];incidentAsset:string;incidentAction:string;files:string[]};
