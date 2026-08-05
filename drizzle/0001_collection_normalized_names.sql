ALTER TABLE `collections` ADD `normalized_name` text;--> statement-breakpoint
CREATE UNIQUE INDEX `collections_normalized_name_idx` ON `collections` (`normalized_name`);--> statement-breakpoint
