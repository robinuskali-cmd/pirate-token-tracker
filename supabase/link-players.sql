-- ZUERST zwei Benutzer im Supabase Auth Dashboard anlegen.
-- UUIDs unten durch die tatsächlichen User-IDs ersetzen. Keine E-Mail-Zuordnung
-- im Browser und kein Self-Service zur Vergabe einer Spielerrolle.
begin;
update public.tracker_players set auth_id = 'MAX-AUTH-UUID-HIER'::uuid where id = 'max';
update public.tracker_players set auth_id = 'SZYMON-AUTH-UUID-HIER'::uuid where id = 'szymon';
commit;
