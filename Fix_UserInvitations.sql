-- Add missing CreatedAt column to UserInvitations table
ALTER TABLE `UserInvitations` 
ADD COLUMN `CreatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);