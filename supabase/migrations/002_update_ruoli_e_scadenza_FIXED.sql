-- ============================================
-- Migration: Aggiornamento ruoli e campi scadenza accesso (FIXED)
-- Data: 2026-01-31
-- Descrizione:
--   1. Modifica enum ruolo_utente (rimuove amministratore, direttore, casemanager)
--   2. Aggiunge responsabile_centro e visitatore
--   3. Aggiunge campi scadenza_accesso e giorni_accesso_rimanenti a profiles
-- ============================================

-- STEP 1: Rimuovi il DEFAULT dalla colonna ruolo
ALTER TABLE profiles ALTER COLUMN ruolo DROP DEFAULT;

-- STEP 2: Crea il nuovo tipo enum con i ruoli aggiornati
CREATE TYPE ruolo_utente_new AS ENUM (
  'sviluppatore',       -- Accesso totale, invisibile
  'responsabile_centro', -- Gestione centro/sede
  'educatore',          -- Gestione pazienti assegnati
  'utente',             -- Utente finale (ex paziente)
  'visitatore'          -- Accesso temporaneo per committenti potenziali
);

-- STEP 3: Aggiorna la colonna ruolo nella tabella profiles
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

-- STEP 4: Rimuovi il vecchio tipo enum e rinomina il nuovo
DROP TYPE ruolo_utente;
ALTER TYPE ruolo_utente_new RENAME TO ruolo_utente;

-- STEP 5: Rimetti il DEFAULT sulla colonna ruolo
ALTER TABLE profiles ALTER COLUMN ruolo SET DEFAULT 'utente'::ruolo_utente;

-- STEP 6: Aggiungi campi per la gestione della scadenza accesso (per visitatori)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scadenza_accesso TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS giorni_accesso_rimanenti INTEGER DEFAULT NULL;

-- Commenti per documentazione
COMMENT ON COLUMN profiles.scadenza_accesso IS 'Data/ora di scadenza accesso (usato per visitatori con accesso temporaneo)';
COMMENT ON COLUMN profiles.giorni_accesso_rimanenti IS 'Giorni di accesso rimanenti (usato per visitatori: 1, 2 o 3 giorni)';

-- Aggiorna il commento sul tipo
COMMENT ON TYPE ruolo_utente IS 'Ruoli utente: sviluppatore (dev), responsabile_centro (admin sede), educatore, utente (paziente), visitatore (accesso temporaneo)';
