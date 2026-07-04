-- Migration: Update manual_code to alphanumeric + symbols (6 characters)
-- Changes the default from numeric-only "000000" to a mix of letters, digits, symbols

-- Create the code generation function
CREATE OR REPLACE FUNCTION generate_pairing_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update the default for new rows
ALTER TABLE pairing_tokens
  ALTER COLUMN manual_code SET DEFAULT generate_pairing_code();
