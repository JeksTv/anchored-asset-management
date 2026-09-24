CREATE TABLE `account_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`provider` text NOT NULL,
	`username` text NOT NULL,
	`services` text NOT NULL,
	`requester` text NOT NULL,
	`source` text NOT NULL,
	`purpose` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Submitted' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_account_requests_employee` ON `account_requests` (`employee_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_requests_open_username` ON `account_requests` (`provider`,`username`) WHERE status IN ('Submitted','Approved','Active');--> statement-breakpoint
ALTER TABLE `kit_tasks` ADD `account_request_id` text REFERENCES account_requests(id);