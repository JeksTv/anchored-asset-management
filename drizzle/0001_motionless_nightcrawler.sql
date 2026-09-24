CREATE TABLE `asset_events` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`message` text NOT NULL,
	`snapshot` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_asset_events_asset` ON `asset_events` (`asset_id`);--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`type` text NOT NULL,
	`issue` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`opened_date` text NOT NULL,
	`due_date` text,
	`completed_date` text,
	`work_done` text DEFAULT '' NOT NULL,
	`cost` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_maintenance_asset` ON `maintenance` (`asset_id`);--> statement-breakpoint
ALTER TABLE `assets` ADD `state` text DEFAULT 'Ready' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `details` text DEFAULT '{}' NOT NULL;