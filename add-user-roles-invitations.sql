-- Add CustomerRole column to AspNetUsers table
ALTER TABLE AspNetUsers 
ADD COLUMN CustomerRole INT NOT NULL DEFAULT 4;

-- Create UserInvitations table
CREATE TABLE UserInvitations (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CustomerId INT NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Role INT NOT NULL,
    InvitationToken VARCHAR(255) NOT NULL,
    InvitedByUserId VARCHAR(450) NOT NULL,
    CreatedAt DATETIME NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    IsAccepted BOOLEAN NOT NULL DEFAULT FALSE,
    AcceptedAt DATETIME NULL,
    AcceptedByUserId VARCHAR(450) NULL,
    FOREIGN KEY (CustomerId) REFERENCES Customers(Id) ON DELETE CASCADE,
    FOREIGN KEY (InvitedByUserId) REFERENCES AspNetUsers(Id) ON DELETE RESTRICT,
    UNIQUE KEY UK_UserInvitations_Token (InvitationToken),
    INDEX IX_UserInvitations_Email (Email),
    INDEX IX_UserInvitations_Customer (CustomerId)
);

-- Update existing users to have Owner role (first user per customer becomes owner)
UPDATE AspNetUsers u1
SET CustomerRole = 1
WHERE u1.CustomerId IS NOT NULL
AND u1.Id = (
    SELECT u2.Id 
    FROM (SELECT Id, CustomerId FROM AspNetUsers) u2 
    WHERE u2.CustomerId = u1.CustomerId 
    ORDER BY u2.Id 
    LIMIT 1
);