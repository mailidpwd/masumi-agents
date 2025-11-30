-- Create Admin API Key for Masumi Payment Service
-- This script creates an admin API key directly in the database

-- First, check if admin key already exists
DO $$
DECLARE
    existing_key_id TEXT;
    api_key_token TEXT;
    api_key_hash TEXT;
BEGIN
    -- Check for existing admin key
    SELECT id INTO existing_key_id
    FROM "ApiKey"
    WHERE permission = 'Admin' AND status = 'Active'
    LIMIT 1;

    IF existing_key_id IS NOT NULL THEN
        RAISE NOTICE 'Admin API key already exists with ID: %', existing_key_id;
        SELECT token INTO api_key_token FROM "ApiKey" WHERE id = existing_key_id;
        RAISE NOTICE 'Token: %', api_key_token;
    ELSE
        -- Generate a new API key token
        -- Format: masumi-payment-admin-{timestamp}-{random}
        api_key_token := 'masumi-payment-admin-' || 
                         EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' ||
                         SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
        
        -- Generate hash (SHA256)
        api_key_hash := ENCODE(DIGEST(api_key_token, 'sha256'), 'hex');
        
        -- Insert the API key
        INSERT INTO "ApiKey" (
            id,
            "createdAt",
            "updatedAt",
            token,
            "tokenHash",
            status,
            permission,
            "networkLimit",
            "usageLimited"
        ) VALUES (
            gen_random_uuid()::TEXT,
            NOW(),
            NOW(),
            api_key_token,
            api_key_hash,
            'Active',
            'Admin',
            ARRAY['Mainnet', 'Preprod']::"Network"[],
            false
        ) RETURNING id INTO existing_key_id;
        
        RAISE NOTICE '✅ Admin API Key created successfully!';
        RAISE NOTICE 'Token: %', api_key_token;
        RAISE NOTICE 'ID: %', existing_key_id;
    END IF;
END $$;

-- Display the admin API key
SELECT 
    id,
    token,
    permission,
    status,
    "networkLimit",
    "usageLimited"
FROM "ApiKey"
WHERE permission = 'Admin' AND status = 'Active'
ORDER BY "createdAt" DESC
LIMIT 1;

