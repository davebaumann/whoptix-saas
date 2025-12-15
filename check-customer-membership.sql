-- Check customer membership level
SELECT Id, Name, Email, MembershipLevel 
FROM Customers 
WHERE Id = 1;

-- Update customer to Enterprise level if needed
UPDATE Customers 
SET MembershipLevel = 4 
WHERE Id = 1;