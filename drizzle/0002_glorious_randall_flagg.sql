CREATE TABLE `employee_kits` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_kits_employee_id_unique` ON `employee_kits` (`employee_id`);--> statement-breakpoint
CREATE TABLE `kit_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`kit_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`parent_id` text,
	`state` text DEFAULT 'Pending' NOT NULL,
	`assignment_id` text,
	`note` text DEFAULT '' NOT NULL,
	`completed_at` text,
	`cleared_at` text,
	FOREIGN KEY (`kit_id`) REFERENCES `employee_kits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kit_tasks_assignment_id_unique` ON `kit_tasks` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `idx_kit_tasks_employee` ON `kit_tasks` (`employee_id`);--> statement-breakpoint
CREATE TABLE `kit_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`items` text NOT NULL,
	`updated_at` text NOT NULL
);
