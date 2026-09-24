CREATE TABLE `employee_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'Submitted' NOT NULL,
	`payload` text NOT NULL,
	`submitted_by` text NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_by` text,
	`review_note` text,
	`reviewed_at` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `form_applications` (
	`form_id` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `employee_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `form_asset_links` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`asset_id` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `employee_forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_form_asset` ON `form_asset_links` (`asset_id`);--> statement-breakpoint
CREATE TABLE `form_files` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `employee_forms`(`id`) ON UPDATE no action ON DELETE no action
);
