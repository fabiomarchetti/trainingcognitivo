-- ============================================
-- Migration: Aggiornamento ruoli e campi scadenza accesso (DEFINITIVO)
-- Data: 2026-01-31
-- ATTENZIONE: Questa migration droppa e ricrea tutte le RLS policies
-- ============================================

-- ============================================
-- PARTE 1: DROP TUTTE LE POLICIES ESISTENTI
-- ============================================

-- Disabilita temporaneamente RLS per evitare problemi
ALTER TABLE sedi DISABLE ROW LEVEL SECURITY;
ALTER TABLE settori DISABLE ROW LEVEL SECURITY;
ALTER TABLE classi DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_esercizi DISABLE ROW LEVEL SECURITY;
ALTER TABLE esercizi DISABLE ROW LEVEL SECURITY;
ALTER TABLE utenti_esercizi DISABLE ROW LEVEL SECURITY;
ALTER TABLE risultati_esercizi DISABLE ROW LEVEL SECURITY;
ALTER TABLE educatori_utenti DISABLE ROW LEVEL SECURITY;
ALTER TABLE log_accessi DISABLE ROW LEVEL SECURITY;

-- Drop TUTTE le policies (non solo quelle che conosciamo)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname
              FROM pg_policies
              WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop trigger che usa ruolo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- PARTE 2: MODIFICA TIPO ENUM
-- ============================================

-- Rimuovi DEFAULT
ALTER TABLE profiles ALTER COLUMN ruolo DROP DEFAULT;

-- Crea nuovo tipo
CREATE TYPE ruolo_utente_new AS ENUM (
  'sviluppatore',
  'responsabile_centro',
  'educatore',
  'utente',
  'visitatore'
);

-- Converti colonna
ALTER TABLE profiles
  ALTER COLUMN ruolo TYPE ruolo_utente_new
  USING (
    CASE
      WHEN ruolo::text = 'sviluppatore' THEN 'sviluppatore'::ruolo_utente_new
      WHEN ruolo::text = 'amministratore' THEN 'responsabile_centro'::ruolo_utente_new
      WHEN ruolo::text = 'direttore' THEN 'responsabile_centro'::ruolo_utente_new
      WHEN ruolo::text = 'casemanager' THEN 'educatore'::ruolo_utente_new
      WHEN ruolo::text = 'educatore' THEN 'educatore'::ruolo_utente_new
      WHEN ruolo::text = 'utente' THEN 'utente'::ruolo_utente_new
      ELSE 'utente'::ruolo_utente_new
    END
  );

-- Drop vecchio tipo e rinomina
DROP TYPE ruolo_utente;
ALTER TYPE ruolo_utente_new RENAME TO ruolo_utente;

-- Rimetti DEFAULT
ALTER TABLE profiles ALTER COLUMN ruolo SET DEFAULT 'utente'::ruolo_utente;

-- Aggiungi campi scadenza
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scadenza_accesso TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS giorni_accesso_rimanenti INTEGER DEFAULT NULL;

COMMENT ON COLUMN profiles.scadenza_accesso IS 'Data/ora di scadenza accesso (usato per visitatori con accesso temporaneo)';
COMMENT ON COLUMN profiles.giorni_accesso_rimanenti IS 'Giorni di accesso rimanenti (usato per visitatori: 1, 2 o 3 giorni)';

-- ============================================
-- PARTE 3: RICREA TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, cognome, ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    COALESCE((NEW.raw_user_meta_data->>'ruolo')::ruolo_utente, 'utente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PARTE 4: RIABILITA RLS E RICREA POLICIES
-- ============================================

-- Riabilita RLS
ALTER TABLE sedi ENABLE ROW LEVEL SECURITY;
ALTER TABLE settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE classi ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE risultati_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE educatori_utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_accessi ENABLE ROW LEVEL SECURITY;

-- SEDI
CREATE POLICY "Sedi visibili a tutti" ON sedi
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano sedi" ON sedi
  FOR INSERT WITH CHECK (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

CREATE POLICY "Solo admin aggiornano sedi" ON sedi
  FOR UPDATE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

CREATE POLICY "Solo admin eliminano sedi" ON sedi
  FOR DELETE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- SETTORI
CREATE POLICY "Settori visibili a tutti" ON settori
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano settori" ON settori
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- CLASSI
CREATE POLICY "Classi visibili a tutti" ON classi
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano classi" ON classi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- PROFILES
CREATE POLICY "Utenti vedono se stessi" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Sviluppatori vedono tutti" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );

CREATE POLICY "Responsabili vedono utenti sede" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'responsabile_centro'
    AND ruolo NOT IN ('sviluppatore')
  );

CREATE POLICY "Educatori vedono utenti assegnati" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'educatore'
    AND (
      id = auth.uid()
      OR id IN (
        SELECT id_utente FROM educatori_utenti
        WHERE id_educatore = auth.uid() AND is_attiva = TRUE
      )
    )
  );

CREATE POLICY "Admin modificano profili" ON profiles
  FOR UPDATE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
    OR id = auth.uid()
  );

-- CATEGORIE_ESERCIZI
CREATE POLICY "Categorie visibili a tutti" ON categorie_esercizi
  FOR SELECT USING (true);

CREATE POLICY "Solo sviluppatori modificano categorie" ON categorie_esercizi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );

-- ESERCIZI
CREATE POLICY "Esercizi attivi visibili a tutti" ON esercizi
  FOR SELECT USING (stato = 'attivo');

CREATE POLICY "Sviluppatori vedono tutti gli esercizi" ON esercizi
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );

CREATE POLICY "Solo sviluppatori modificano esercizi" ON esercizi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );

-- UTENTI_ESERCIZI
CREATE POLICY "Utenti vedono proprie assegnazioni" ON utenti_esercizi
  FOR SELECT USING (
    id_utente = auth.uid()
    OR id_assegnante = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

CREATE POLICY "Educatori gestiscono assegnazioni" ON utenti_esercizi
  FOR ALL USING (
    id_assegnante = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- RISULTATI_ESERCIZI
CREATE POLICY "Utenti vedono propri risultati" ON risultati_esercizi
  FOR SELECT USING (
    id_utente = auth.uid()
    OR id_educatore = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

CREATE POLICY "Utenti inseriscono propri risultati" ON risultati_esercizi
  FOR INSERT WITH CHECK (
    id_utente = auth.uid()
  );

CREATE POLICY "Admin modificano risultati" ON risultati_esercizi
  FOR UPDATE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- EDUCATORI_UTENTI
CREATE POLICY "Admin vedono associazioni" ON educatori_utenti
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
    OR id_educatore = auth.uid()
  );

CREATE POLICY "Admin gestiscono associazioni" ON educatori_utenti
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

-- LOG_ACCESSI
CREATE POLICY "Solo admin vedono log" ON log_accessi
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'responsabile_centro')
  );

CREATE POLICY "Sistema inserisce log" ON log_accessi
  FOR INSERT WITH CHECK (true);
