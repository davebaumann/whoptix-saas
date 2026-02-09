-- Add ChannelId column to Sales table
ALTER TABLE Sales ADD COLUMN ChannelId VARCHAR(100) DEFAULT '';

-- Create index on ChannelId for faster lookups when joining with Integrations
CREATE INDEX idx_sales_channelid ON Sales(ChannelId);
