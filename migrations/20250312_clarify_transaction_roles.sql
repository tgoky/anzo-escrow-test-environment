-- Add lockedAmount column to offers table if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'locked_amount'
    ) THEN
        ALTER TABLE offers ADD COLUMN locked_amount DECIMAL(18,8) NOT NULL DEFAULT 0;
    END IF;
END$$;

-- Update comment for clarity
COMMENT ON COLUMN offers.locked_amount IS 'Amount locked in active/pending transactions';