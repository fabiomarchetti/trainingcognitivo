-- ============================================
-- RUOLI DINAMICI - VERSIONE IDEMPOTENTE
-- Data: 2026-01-31
-- Può essere eseguita più volte senza errori
-- ============================================

-- STEP 1: Crea tabella ruoli (solo se non esiste)
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

-- STEP 2: Inserisci ruoli (solo se non esistono già)
INSERT INTO public.ruoli (codice, nome, descrizione, tipo_ruolo, livello_accesso) VALUES
('sviluppatore', 'Sviluppatore', 'Accesso completo al sistema, invisibile agli utenti', 'gestore', 100),
('responsabile_centro', 'Responsabile Centro', 'Gestisce sede, utenti, educatori e pazienti', 'gestore', 80),
('educatore', 'Educatore', 'Gestisce pazienti assegnati e attività', 'gestore', 50),
('visitatore', 'Visitatore', 'Accesso temporaneo limitato al sistema', 'gestore', 20),
('utente', 'Paziente', 'Utente finale con difficoltà cognitive', 'paziente', 10)
ON CONFLICT (codice) DO NOTHING;

-- STEP 3: Crea funzione update_user_jwt_claims (solo se non esiste)
CREATE OR REPLACE FUNCTION public.update_user_jwt_claims(user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('user_role', new_role)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Aggiungi colonna id_ruolo a profiles (solo se non esiste)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_ruolo'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN id_ruolo INT REFERENCES public.ruoli(id);
  END IF;
END $$;

-- STEP 5: Migra dati da enum a FK (solo se entrambe le colonne esistono)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ruolo'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_ruolo'
  ) THEN
    UPDATE public.profiles p
    SET id_ruolo = r.id
    FROM public.ruoli r
    WHERE p.ruolo::TEXT = r.codice
    AND p.id_ruolo IS NULL;
  END IF;
END $$;

-- STEP 6: Rendi id_ruolo NOT NULL (solo se esiste e tutti i record hanno valore)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_ruolo'
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id_ruolo IS NULL
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ALTER COLUMN id_ruolo SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- Ignora se constraint già esiste
      NULL;
    END;
  END IF;
END $$;

-- STEP 7: Drop colonna vecchia ruolo enum (solo se esiste id_ruolo e ruolo è popolato)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ruolo'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_ruolo'
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id_ruolo IS NULL
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN ruolo;
  END IF;
END $$;

-- STEP 8: Crea index per performance (solo se non esiste)
CREATE INDEX IF NOT EXISTS idx_profiles_id_ruolo ON public.profiles(id_ruolo);

-- STEP 9: Aggiorna funzione user_role() per leggere da tabella ruoli
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
DECLARE
  user_role_code TEXT;
BEGIN
  user_role_code := current_setting('request.jwt.claims', true)::json->>'user_role';

  IF user_role_code IS NOT NULL THEN
    RETURN user_role_code;
  END IF;

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
  ruolo_codice := COALESCE(NEW.raw_user_meta_data->>'ruolo', 'utente');
  SELECT id INTO ruolo_id FROM public.ruoli WHERE codice = ruolo_codice;

  IF ruolo_id IS NULL THEN
    SELECT id INTO ruolo_id FROM public.ruoli WHERE codice = 'utente';
  END IF;

  INSERT INTO public.profiles (id, nome, cognome, id_ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    ruolo_id
  );

  PERFORM public.update_user_jwt_claims(NEW.id, ruolo_codice);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Aggiorna trigger sync_role_to_jwt
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER AS $$
DECLARE
  ruolo_codice TEXT;
BEGIN
  IF OLD.id_ruolo IS DISTINCT FROM NEW.id_ruolo THEN
    SELECT codice INTO ruolo_codice FROM public.ruoli WHERE id = NEW.id_ruolo;
    PERFORM public.update_user_jwt_claims(NEW.id, ruolo_codice);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea trigger (drop + create è idempotente)
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

-- STEP 13: RLS su tabella ruoli (solo se non esiste già)
ALTER TABLE public.ruoli ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ruoli attivi visibili a tutti" ON ruoli;
CREATE POLICY "Ruoli attivi visibili a tutti" ON ruoli
  FOR SELECT USING (is_attivo = true);

DROP POLICY IF EXISTS "Solo sviluppatori modificano ruoli" ON ruoli;
CREATE POLICY "Solo sviluppatori modificano ruoli" ON ruoli
  FOR ALL USING (public.user_role() = 'sviluppatore');

-- STEP 14: Drop vecchio enum (solo se non è più usato)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ruolo'
  ) THEN
    DROP TYPE IF EXISTS ruolo_utente CASCADE;
  END IF;
END $$;
