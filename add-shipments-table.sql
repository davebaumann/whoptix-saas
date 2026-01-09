-- ============================================================================
-- CREATE SHIPMENTS TABLE IN DEMO DATABASE
-- ============================================================================

USE justsku_demo;

CREATE TABLE IF NOT EXISTS `Shipments` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `CustomerId` int NOT NULL,
    `ShipmentId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `OrderId` longtext CHARACTER SET utf8mb4 NOT NULL,
    `TrackingNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Carrier` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Service` longtext CHARACTER SET utf8mb4 NOT NULL,
    `ShippedDate` datetime(6) NOT NULL,
    `ShippingCost` decimal(18,2) NOT NULL,
    `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientAddress` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCity` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientState` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientZip` longtext CHARACTER SET utf8mb4 NOT NULL,
    `RecipientCountry` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CreatedDateUtc` datetime(6) NOT NULL,
    `UpdatedDateUtc` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_Shipments_CustomerId_ShipmentId` (`CustomerId`, `ShipmentId`),
    CONSTRAINT `FK_Shipments_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

SELECT 'Shipments table created successfully.' as Status;
