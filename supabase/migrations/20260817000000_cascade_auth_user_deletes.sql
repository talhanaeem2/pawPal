-- Auth deletes a user from auth.users. Every application-owned foreign key
-- pointing at that table must cascade, otherwise GoTrue returns an opaque 500.
--
-- The schema was partly created outside the migrations directory, so discover
-- the live constraints instead of maintaining a fragile table-name list.
DO $$
DECLARE
  fk RECORD;
  source_columns TEXT;
  target_columns TEXT;
  update_action TEXT;
  match_type TEXT;
  deferrability TEXT;
BEGIN
  FOR fk IN
    SELECT
      constraint_row.oid AS constraint_oid,
      source_schema.nspname AS schema_name,
      source_table.relname AS table_name,
      source_table.oid AS table_oid,
      constraint_row.conname AS constraint_name,
      target_table.oid AS target_table_oid,
      constraint_row.conkey,
      constraint_row.confkey,
      constraint_row.confupdtype,
      constraint_row.confmatchtype,
      constraint_row.condeferrable,
      constraint_row.condeferred
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS source_table ON source_table.oid = constraint_row.conrelid
    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
    JOIN pg_class AS target_table ON target_table.oid = constraint_row.confrelid
    WHERE constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND source_schema.nspname = 'public'
      AND constraint_row.confdeltype <> 'c'
  LOOP
    SELECT string_agg(format('%I', attribute_row.attname), ', ' ORDER BY key_column.ordinality)
    INTO source_columns
    FROM unnest(fk.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = fk.table_oid
      AND attribute_row.attnum = key_column.attnum;

    SELECT string_agg(format('%I', attribute_row.attname), ', ' ORDER BY key_column.ordinality)
    INTO target_columns
    FROM unnest(fk.confkey) WITH ORDINALITY AS key_column(attnum, ordinality)
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = fk.target_table_oid
      AND attribute_row.attnum = key_column.attnum;

    update_action := CASE fk.confupdtype
      WHEN 'a' THEN ''
      WHEN 'r' THEN ' ON UPDATE RESTRICT'
      WHEN 'c' THEN ' ON UPDATE CASCADE'
      WHEN 'n' THEN ' ON UPDATE SET NULL'
      WHEN 'd' THEN ' ON UPDATE SET DEFAULT'
    END;

    match_type := CASE fk.confmatchtype
      WHEN 'f' THEN ' MATCH FULL'
      WHEN 'p' THEN ' MATCH PARTIAL'
      ELSE ''
    END;

    deferrability := CASE
      WHEN NOT fk.condeferrable THEN ''
      WHEN fk.condeferred THEN ' DEFERRABLE INITIALLY DEFERRED'
      ELSE ' DEFERRABLE INITIALLY IMMEDIATE'
    END;

    RAISE NOTICE 'Changing %.% constraint % to ON DELETE CASCADE',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES auth.users (%s)%s ON DELETE CASCADE%s%s',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name,
      source_columns,
      target_columns,
      match_type,
      update_action,
      deferrability
    );
  END LOOP;
END
$$;
