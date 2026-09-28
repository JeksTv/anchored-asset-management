ALTER TABLE account_requests ADD COLUMN account_role TEXT NOT NULL DEFAULT 'Unspecified';
CREATE UNIQUE INDEX account_primary_per_provider ON account_requests(employee_id,provider) WHERE account_role='Primary' AND status IN ('Submitted','Approved','Active') AND provider IN ('Google Workspace','Microsoft 365','Google / Gmail');
