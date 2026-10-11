CREATE TABLE `collections` (
	`id` varchar(96) NOT NULL,
	`collectorId` varchar(96) NOT NULL,
	`pointId` varchar(96) NOT NULL,
	`category` varchar(120) NOT NULL,
	`declaredKg` decimal(12,2) NOT NULL,
	`verifiedKg` decimal(12,2),
	`validatedKg` decimal(12,2),
	`status` enum('Déclarée','Vérifiée','Validée') NOT NULL DEFAULT 'Déclarée',
	`paid` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collectors` (
	`id` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`zone` varchar(190) NOT NULL,
	`availability` varchar(255),
	`applicationStatus` enum('Brouillon','Soumise','En formation','Autorisée','Suspendue') NOT NULL DEFAULT 'Brouillon',
	`authorizedAt` timestamp,
	`suspendedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `collectors_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `depots_sauvages` (
	`id` varchar(96) NOT NULL,
	`sourceCode` varchar(96) NOT NULL,
	`sourceLayer` varchar(190) NOT NULL,
	`sourceProperties` json NOT NULL,
	`sourceDate` varchar(40),
	`category` varchar(120) NOT NULL,
	`severity` enum('Faible','Moyenne','Élevée') NOT NULL,
	`priority` enum('Basse','Moyenne','Haute') NOT NULL,
	`status` enum('Recensé','Confirmé','À contrôler') NOT NULL DEFAULT 'Recensé',
	`description` text,
	`location` varchar(255),
	`lat` decimal(11,8) NOT NULL,
	`lng` decimal(11,8) NOT NULL,
	`arrondissementSource` varchar(190),
	`arrondissementComputed` varchar(190),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `depots_sauvages_id` PRIMARY KEY(`id`),
	CONSTRAINT `depots_sauvages_source_unique` UNIQUE(`sourceLayer`,`sourceCode`)
);
--> statement-breakpoint
CREATE TABLE `geo_imports` (
	`id` varchar(96) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`layerName` varchar(190) NOT NULL,
	`sourceCrs` varchar(80),
	`displayCrs` varchar(80),
	`featureCount` int NOT NULL,
	`validCount` int NOT NULL,
	`warningCount` int NOT NULL,
	`properties` json NOT NULL,
	`sourceChecksum` varchar(128),
	`importedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geo_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` varchar(96) NOT NULL,
	`siteId` varchar(96) NOT NULL,
	`siteType` enum('depot','signalement') NOT NULL,
	`type` varchar(100) NOT NULL,
	`responsibleUserId` int,
	`priority` enum('Basse','Moyenne','Haute') NOT NULL,
	`plannedDate` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`status` enum('À planifier','Planifiée','En cours','Terminée','À contrôler') NOT NULL DEFAULT 'À planifier',
	`comment` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interventions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_regroupements` (
	`id` varchar(96) NOT NULL,
	`name` varchar(190) NOT NULL,
	`location` varchar(255),
	`lat` decimal(11,8) NOT NULL,
	`lng` decimal(11,8) NOT NULL,
	`acceptedCategories` json NOT NULL,
	`capacityKg` decimal(12,2),
	`operational` boolean,
	`verified` boolean NOT NULL DEFAULT false,
	`provenance` enum('terrain','municipal','calculated','hypothesis') NOT NULL,
	`hours` varchar(190),
	`responsibleUserId` int,
	`lastVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `point_regroupements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`signalementId` varchar(96),
	`amount` int NOT NULL,
	`kind` enum('credit','debit') NOT NULL,
	`ruleVersion` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `point_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `point_credit_signalement_unique` UNIQUE(`signalementId`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `signalement_attachments` (
	`id` varchar(96) NOT NULL,
	`signalementId` varchar(96) NOT NULL,
	`storageKey` varchar(255),
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`status` enum('local','uploaded','failed') NOT NULL DEFAULT 'local',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signalement_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signalements` (
	`id` varchar(96) NOT NULL,
	`authorUserId` int,
	`status` enum('En attente','En cours de vérification','Validé','Rejeté','Doublon','Traité') NOT NULL DEFAULT 'En attente',
	`category` varchar(120) NOT NULL,
	`severity` enum('Faible','Moyenne','Élevée') NOT NULL,
	`priority` enum('Basse','Moyenne','Haute') NOT NULL,
	`description` text NOT NULL,
	`location` varchar(255) NOT NULL,
	`lat` decimal(11,8) NOT NULL,
	`lng` decimal(11,8) NOT NULL,
	`arrondissementSource` varchar(190) NOT NULL,
	`arrondissementComputed` varchar(190),
	`linkedDepotId` varchar(96),
	`provenance` enum('citizen','municipal') NOT NULL DEFAULT 'citizen',
	`rewardCredited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signalements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(60) NOT NULL,
	`entityId` varchar(96) NOT NULL,
	`fromStatus` varchar(80),
	`toStatus` varchar(80) NOT NULL,
	`actorUserId` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectorId` varchar(96) NOT NULL,
	`score` int NOT NULL,
	`threshold` int NOT NULL DEFAULT 80,
	`passed` boolean NOT NULL,
	`answers` json NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `valorisation_lots` (
	`id` varchar(96) NOT NULL,
	`collectionId` varchar(96) NOT NULL,
	`pointId` varchar(96) NOT NULL,
	`category` varchar(120) NOT NULL,
	`incomingKg` decimal(12,2) NOT NULL,
	`outgoingKg` decimal(12,2),
	`destination` varchar(255),
	`responsibleUserId` int,
	`status` enum('Regroupé','Trié','Valorisé','Traitement final') NOT NULL DEFAULT 'Regroupé',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `valorisation_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weighing_validations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` varchar(96) NOT NULL,
	`verifiedKg` decimal(12,2) NOT NULL,
	`validatedKg` decimal(12,2),
	`validatedByUserId` int NOT NULL,
	`paidAmountFcfa` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weighing_validations_id` PRIMARY KEY(`id`),
	CONSTRAINT `weighing_collection_unique` UNIQUE(`collectionId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `appRole` enum('public','citizen','collector','agent','admin') DEFAULT 'citizen' NOT NULL;--> statement-breakpoint
CREATE INDEX `collections_collector_idx` ON `collections` (`collectorId`);--> statement-breakpoint
CREATE INDEX `collections_point_idx` ON `collections` (`pointId`);--> statement-breakpoint
CREATE INDEX `depots_sauvages_spatial_idx` ON `depots_sauvages` (`arrondissementComputed`);--> statement-breakpoint
CREATE INDEX `interventions_site_idx` ON `interventions` (`siteId`);--> statement-breakpoint
CREATE INDEX `interventions_status_idx` ON `interventions` (`status`);--> statement-breakpoint
CREATE INDEX `attachments_signalement_idx` ON `signalement_attachments` (`signalementId`);--> statement-breakpoint
CREATE INDEX `signalements_author_idx` ON `signalements` (`authorUserId`);--> statement-breakpoint
CREATE INDEX `signalements_status_idx` ON `signalements` (`status`);--> statement-breakpoint
CREATE INDEX `signalements_location_idx` ON `signalements` (`arrondissementComputed`);--> statement-breakpoint
CREATE INDEX `status_history_entity_idx` ON `status_history` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `training_collector_idx` ON `training_results` (`collectorId`);