-- Add CustomerRole column to AspNetUsers table
ALTER TABLE AspNetUsers 
ADD COLUMN CustomerRole INT NOT NULL DEFAULT 3;

-- Make CustomerId nullable for admin users
ALTER TABLE AspNetUsers 
MODIFY COLUMN CustomerId INT NULL;

-- Set admin user to have no customer association (NULL CustomerId)
UPDATE AspNetUsers 
SET CustomerId = NULL, CustomerRole = 1 
WHERE Email = 'Kim.baumann@skuvault.com';

-- Create UserInvitations table
CREATE TABLE UserInvitations (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) NOT NULL,
    CustomerId INT NOT NULL,
    Role INT NOT NULL,
    Token VARCHAR(255) NOT NULL UNIQUE,
    InvitedByUserId VARCHAR(450) NOT NULL,
    InvitedAt DATETIME(6) NOT NULL,
    ExpiresAt DATETIME(6) NOT NULL,
    IsAccepted BOOLEAN NOT NULL DEFAULT FALSE,
    AcceptedAt DATETIME(6) NULL,
    AcceptedByUserId VARCHAR(450) NULL,
    
    INDEX IX_UserInvitations_CustomerId (CustomerId),
    INDEX IX_UserInvitations_Token (Token),
    INDEX IX_UserInvitations_Email (Email),
    
    CONSTRAINT FK_UserInvitations_Customers_CustomerId 
        FOREIGN KEY (CustomerId) REFERENCES Customers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserInvitations_AspNetUsers_InvitedByUserId 
        FOREIGN KEY (InvitedByUserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserInvitations_AspNetUsers_AcceptedByUserId 
        FOREIGN KEY (AcceptedByUserId) REFERENCES AspNetUsers(Id) ON DELETE SET NULL
);