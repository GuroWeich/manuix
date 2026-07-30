CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '◇' NOT NULL,
	`color` text DEFAULT '#dbe8e2' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_name_idx` ON `collections` (`name`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`location_id` text,
	`location_path` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`purchase_date` text DEFAULT '' NOT NULL,
	`purchase_price` real,
	`estimated_value` real,
	`manufacturer` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`serial_number` text DEFAULT '' NOT NULL,
	`condition` text DEFAULT 'Good' NOT NULL,
	`visual` text DEFAULT 'ssd' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `inventory_items_created_idx` ON `inventory_items` (`created_at`);--> statement-breakpoint
CREATE INDEX `inventory_items_category_idx` ON `inventory_items` (`category`);--> statement-breakpoint
CREATE INDEX `inventory_items_location_idx` ON `inventory_items` (`location_id`);--> statement-breakpoint
CREATE TABLE `item_collections` (
	`item_id` text NOT NULL,
	`collection_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `collection_id`),
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`parent_id` text,
	`color` text DEFAULT 'sage' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_path_idx` ON `locations` (`path`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text,
	`stored_path` text NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'attached' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photos_stored_path_idx` ON `photos` (`stored_path`);--> statement-breakpoint
CREATE INDEX `photos_item_idx` ON `photos` (`item_id`);--> statement-breakpoint
CREATE INDEX `photos_status_idx` ON `photos` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);