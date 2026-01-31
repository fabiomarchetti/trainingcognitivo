-- ============================================
-- RUOLI DINAMICI: Da enum statico a tabella gestibile
-- Data: 2026-01-31
-- Permette gestione ruoli via UI senza deployment
-- ============================================

-- STEP 1: Crea tabella ruoli
CREATE TABLE IF NOT EXISTS public.ruoli (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  tipo_ruolo VARCHAR(20) NOT NULL CHECK (tipo_ruolo IN ('gestore', 'paziente', 'familiare')),
  livello_accesso INT DEFAULT 0,
  permessi JSONB DEFAULT '{}',
  is_attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commento
COMMENT ON TABLE public.ruoli IS 'Ruoli utente gestibili dinamicamente via UI';
COMMENT ON COLUMN public.ruoli.tipo_ruolo IS 'gestore=gestisce portale, paziente=viene gestito, familiare=parente paziente';
COMMENT ON COLUMN public.ruoli.livello_accesso IS 'Livello accesso: 100=sviluppatore, 80=responsabile, 50=educatore, 10=utente';

-- STEP 2: Popola con ruoli esistenti
INSERT INTO public.ruoli (codice, nome, descrizione, tipo_ruolo, livello_accesso) VALUES
('sviluppatore', 'Sviluppatore', 'Accesso completo al sistema, invisibile agli utenti', 'gestore', 100),
('responsabile_centro', 'Responsabile Centro', 'Gestisce sede, utenti, educatori e pazienti', 'gestore', 80),
('educatore', 'Educatore', 'Gestisce pazienti assegnati e attività', 'gestore', 50),
('visitatore', 'Visitatore', 'Accesso temporaneo limitato al sistema', 'gestore', 20),
('utente', 'Paziente', 'Utente finale con difficoltà cognitive', 'paziente', 10);

-- STEP 3: Aggiungi colonna id_ruolo temporanea a profiles
ALTER TABLE public.profiles ADD COLUMN id_ruolo INT REFERENCES public.ruoli(id);

-- STEP 4: Migra dati da enum a FK
UPDATE public.profiles p
SET id_ruolo = r.id
FROM public.ruoli r
WHERE p.ruolo::TEXT = r.codice;

-- STEP 5: Rendi id_ruolo NOT NULL (tutti devono avere un ruolo)
ALTER TABLE public.profiles ALTER COLUMN id_ruolo SET NOT NULL;

-- STEP 6: Drop colonna vecchia ruolo enum
ALTER TABLE public.profiles DROP COLUMN ruolo;

-- STEP 7: Rinomina id_ruolo -> ruolo (per retrocompatibilità nomi)
-- Oppure lasciamo id_ruolo? Decido di lasciare id_ruolo per chiarezza
-- ALTER TABLE public.profiles RENAME COLUMN id_ruolo TO ruolo;

-- STEP 8: Crea index per performance
CREATE INDEX idx_profiles_id_ruolo ON public.profiles(id_ruolo);

-- STEP 9: Aggiorna funzione user_role() per leggere da tabella ruoli
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
DECLARE
  user_role_code TEXT;
BEGIN
  -- Prima prova a leggere dal JWT (contiene il codice ruolo, es. 'sviluppatore')
  user_role_code := current_setting('request.jwt.claims', true)::json->>'user_role';

  IF user_role_code IS NOT NULL THEN
    RETURN user_role_code;
  END IF;

  -- Altrimenti legge da database facendo JOIN con tabella ruoli
  SELECT r.codice INTO user_role_code
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  JOIN public.ruoli r ON r.id = p.id_ruolo
  WHERE u.id = auth.uid();

  RETURN user_role_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- STEP 10: Aggiorna trigger handle_new_user per usare FK ruoli
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ruolo_codice TEXT;
  ruolo_id INT;
BEGIN
  -- Ottieni codice ruolo dai metadata o usa default
  ruolo_codice := COALESCE(NEW.raw_user_meta_data->>'ruolo', 'utente');

  -- Trova ID del ruolo dalla tabella
  SELECT id INTO ruolo_id FROM public.ruoli WHERE codice = ruolo_codice;

  -- Se non trovato, usa 'utente' come default
  IF ruolo_id IS NULL THEN
    SELECT id INTO ruolo_id FROM public.ruoli WHERE codice = 'utente';
  END IF;

  -- Inserisci in profiles
  INSERT INTO public.profiles (id, nome, cognome, id_ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    ruolo_id
  );

  -- Aggiorna JWT claims con codice ruolo
  PERFORM public.update_user_jwt_claims(NEW.id, ruolo_codice);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Aggiorna trigger sync_role_to_jwt per sincronizzare codice ruolo
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER AS $$
DECLARE
  ruolo_codice TEXT;
BEGIN
  -- Quando il ruolo cambia, aggiorna il JWT con il codice ruolo
  IF OLD.id_ruolo IS DISTINCT FROM NEW.id_ruolo THEN
    SELECT codice INTO ruolo_codice FROM public.ruoli WHERE id = NEW.id_ruolo;
    PERFORM public.update_user_jwt_claims(NEW.id, ruolo_codice);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea trigger (il nome cambia da OLD.ruolo a OLD.id_ruolo)
DROP TRIGGER IF EXISTS sync_role_jwt ON profiles;
CREATE TRIGGER sync_role_jwt
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.id_ruolo IS DISTINCT FROM NEW.id_ruolo)
  EXECUTE FUNCTION public.sync_role_to_jwt();

-- STEP 12: Aggiorna JWT di tutti gli utenti esistenti con codice ruolo
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
      SELECT p.id, ru.codice
      FROM profiles p
      JOIN ruoli ru ON ru.id = p.id_ruolo
    )
    LOOP
        PERFORM public.update_user_jwt_claims(r.id, r.codice);
    END LOOP;
END $$;

-- STEP 13: RLS su tabella ruoli
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;

-- Tutti possono vedere i ruoli attivi
CREATE POLICY "Ruoli attivi visibili a tutti" ON ruoli
  FOR SELECT USING (is_attivo = true);

-- Solo sviluppatori possono modificare ruoli
CREATE POLICY "Solo sviluppatori modificano ruoli" ON ruoli
  FOR ALL USING (public.user_role() = 'sviluppatore');

-- STEP 14: Drop vecchio enum (dopo che tutti i dati sono migrati)
-- ATTENZIONE: Questo potrebbe dare errore se ci sono ancora riferimenti
-- Lo facciamo alla fine per sicurezza
DROP TYPE IF EXISTS ruolo_utente CASCADE;
