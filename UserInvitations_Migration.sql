-- Add missing columns to Customers table
ALTER TABLE `Customers` 
ADD COLUMN `CancelledAt` datetime(6) NULL,
ADD COLUMN `IsActive` tinyint(1) NOT NULL DEFAULT 0,
ADD COLUMN `ScheduledForDeletion` datetime(6) NULL;

-- Add missing columns to AspNetUsers table
ALTER TABLE `AspNetUsers` 
ADD COLUMN `CustomerId` int NULL,
ADD COLUMN `CustomerRole` int NOT NULL DEFAULT 0;

-- Create UserInvitations table
CREATE TABLE `UserInvitations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Role` int NOT NULL,
    `InvitationToken` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `InvitedByUserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `ExpiresAt` datetime(6) NOT NULL,
    `IsAccepted` tinyint(1) NOT NULL,
    `AcceptedAt` datetime(6) NULL,
    `AcceptedByUserId` varchar(255) CHARACTER SET utf8mb4 NULL,
    CONSTRAINT `PK_UserInvitations` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_UserInvitations_AspNetUsers_AcceptedByUserId` FOREIGN KEY (`AcceptedByUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_UserInvitations_AspNetUsers_InvitedByUserId` FOREIGN KEY (`InvitedByUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_UserInvitations_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- Create Shipments table (also missing from your database)
CREATE TABLE `Shipments` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ShipmentId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `OrderId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `TrackingNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Carrier` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Service` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ShippedDate` datetime(6) NOT NULL,
    `CreatedDateUtc` datetime(6) NOT NULL,
    `UpdatedDateUtc` datetime(6) NOT NULL,
    `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ShippingCost` decimal(18,2) NOT NULL,
    `RecipientName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientAddress` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCity` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientState` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientZip` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCountry` longtext CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK_Shipments` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Shipments_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- Create indexes
CREATE INDEX `IX_AspNetUsers_CustomerId` ON `AspNetUsers` (`CustomerId`);
CREATE UNIQUE INDEX `IX_Shipments_CustomerId_ShipmentId` ON `Shipments` (`CustomerId`, `ShipmentId`);
CREATE INDEX `IX_UserInvitations_AcceptedByUserId` ON `UserInvitations` (`AcceptedByUserId`);
CREATE INDEX `IX_UserInvitations_CustomerId` ON `UserInvitations` (`CustomerId`);
CREATE UNIQUE INDEX `IX_UserInvitations_InvitationToken` ON `UserInvitations` (`InvitationToken`);
CREATE INDEX `IX_UserInvitations_InvitedByUserId` ON `UserInvitations` (`InvitedByUserId`);

-- Add foreign key constraint for AspNetUsers.CustomerId
ALTER TABLE `AspNetUsers` 
ADD CONSTRAINT `FK_AspNetUsers_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE SET NULL;

-- Update the migration history table
INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) 
VALUES ('20251218191829_AddUserInvitationsTable', '8.0.11');