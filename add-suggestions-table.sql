-- Add Suggestions table for demo environment
CREATE TABLE IF NOT EXISTS Suggestions (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Message LONGTEXT NOT NULL,
    UserEmail VARCHAR(255) NOT NULL,
    CustomerId INT NULL,
    SubmittedAt DATETIME(6) NOT NULL,
    UserAgent LONGTEXT NULL,
    IsRead TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME(6) NOT NULL,
    
    INDEX IX_Suggestions_CustomerId (CustomerId),
    INDEX IX_Suggestions_UserEmail (UserEmail),
    INDEX IX_Suggestions_CreatedAt (CreatedAt),
    
    CONSTRAINT FK_Suggestions_Customers_CustomerId
        FOREIGN KEY (CustomerId) REFERENCES Customers(Id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
