CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`serial` text DEFAULT '' NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_tag_unique` ON `assets` (`tag`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`identifier` text DEFAULT '' NOT NULL,
	`assigned_at` text NOT NULL,
	`resolved_at` text,
	`resolution` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assignments_employee` ON `assignments` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_assignments_asset` ON `assignments` (`asset_id`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'Onboarding' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_code_unique` ON `employees` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
