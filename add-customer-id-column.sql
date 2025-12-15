-- Add CustomerId column to AspNetUsers table
ALTER TABLE AspNetUsers 
ADD COLUMN CustomerId INT NULL;

-- Add foreign key constraint
ALTER TABLE AspNetUsers 
ADD CONSTRAINT FK_AspNetUsers_Customers_CustomerId 
FOREIGN KEY (CustomerId) REFERENCES Customers(Id) 
ON DELETE SET NULL;

-- Update existing user to have CustomerId = 1 (temporary for testing)
UPDATE AspNetUsers 
SET CustomerId = 1 
WHERE Email = 'Kim.baumann@skuvault.com' 
LIMIT 1;

-- Verify the changes
SELECT Id, Email, CustomerId FROM AspNetUsers;