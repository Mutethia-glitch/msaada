CREATE TABLE `contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`contributorId` int NOT NULL,
	`type` enum('money','items','skills','time','logistics','professional_services') NOT NULL,
	`description` text NOT NULL,
	`amount` int,
	`quantityLabel` varchar(160),
	`status` enum('pledged','confirmed','completed','cancelled') NOT NULL DEFAULT 'pledged',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `impact_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`reportedBy` int NOT NULL,
	`headline` varchar(180) NOT NULL,
	`detail` text NOT NULL,
	`beneficiaryCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `impact_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `need_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `need_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `need_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `need_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `need_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `need_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `need_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`story` text NOT NULL,
	`publicSummary` text,
	`location` varchar(120) NOT NULL,
	`urgency` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`lifecycle` enum('draft','pending_review','active','partially_fulfilled','fulfilled','closed') NOT NULL DEFAULT 'draft',
	`verification` enum('pending_review','review_in_progress','verified','rejected') NOT NULL DEFAULT 'pending_review',
	`beneficiaryCount` int NOT NULL DEFAULT 0,
	`quantityLabel` varchar(180),
	`goalAmount` int NOT NULL DEFAULT 0,
	`aiAssisted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `needs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`reporterId` int NOT NULL,
	`category` enum('suspicious_request','misleading_information','duplicate','inappropriate_content','other') NOT NULL,
	`details` text,
	`status` enum('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`needId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`decision` enum('approved','rejected','changes_requested') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','moderator','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `contributions` ADD CONSTRAINT `contributions_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contributions` ADD CONSTRAINT `contributions_contributorId_users_id_fk` FOREIGN KEY (`contributorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `impact_records` ADD CONSTRAINT `impact_records_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `impact_records` ADD CONSTRAINT `impact_records_reportedBy_users_id_fk` FOREIGN KEY (`reportedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `need_files` ADD CONSTRAINT `need_files_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `need_files` ADD CONSTRAINT `need_files_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `need_updates` ADD CONSTRAINT `need_updates_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `need_updates` ADD CONSTRAINT `need_updates_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `needs` ADD CONSTRAINT `needs_creatorId_users_id_fk` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `needs` ADD CONSTRAINT `needs_categoryId_need_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `need_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterId_users_id_fk` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_records` ADD CONSTRAINT `verification_records_needId_needs_id_fk` FOREIGN KEY (`needId`) REFERENCES `needs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_records` ADD CONSTRAINT `verification_records_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contributions_need_idx` ON `contributions` (`needId`);--> statement-breakpoint
CREATE INDEX `contributions_contributor_idx` ON `contributions` (`contributorId`);--> statement-breakpoint
CREATE INDEX `needs_creator_idx` ON `needs` (`creatorId`);--> statement-breakpoint
CREATE INDEX `needs_lifecycle_idx` ON `needs` (`lifecycle`);--> statement-breakpoint
CREATE INDEX `needs_location_idx` ON `needs` (`location`);