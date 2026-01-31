-- ============================================
-- FIX DEFINITIVO: RLS policies con JWT claims
-- Data: 2026-01-31
-- Risolve problema ricorsione policies usando JWT claims
-- ============================================

-- STEP 1: Drop tutte le policies esistenti su TUTTE le tabelle
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

-- STEP 2: Drop funzioni vecchie
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 3: Crea funzione per aggiornare JWT claims
CREATE OR REPLACE FUNCTION public.update_user_jwt_claims(user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- Aggiorna raw_app_meta_data in auth.users
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('user_role', new_role)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Ricrea trigger handle_new_user con JWT claims
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Ottieni ruolo dai metadata o usa default
  user_role := COALESCE(NEW.raw_user_meta_data->>'ruolo', 'utente');

  -- Inserisci in profiles
  INSERT INTO public.profiles (id, nome, cognome, ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'cognome', ''),
    user_role::ruolo_utente
  );

  -- Aggiorna JWT claims
  PERFORM public.update_user_jwt_claims(NEW.id, user_role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Trigger per aggiornare JWT quando ruolo cambia in profiles
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando il ruolo cambia, aggiorna il JWT
  IF OLD.ruolo IS DISTINCT FROM NEW.ruolo THEN
    PERFORM public.update_user_jwt_claims(NEW.id, NEW.ruolo::TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_role_jwt
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.ruolo IS DISTINCT FROM NEW.ruolo)
  EXECUTE FUNCTION public.sync_role_to_jwt();

-- STEP 6: Riabilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedi ENABLE ROW LEVEL SECURITY;
ALTER TABLE settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE classi ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE risultati_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE educatori_utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_accessi ENABLE ROW LEVEL SECURITY;

-- STEP 7: Ricrea policies usando JWT (auth.jwt() ->> 'user_role')

-- PROFILES
CREATE POLICY "Utenti vedono se stessi" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Sviluppatori vedono tutti" ON profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'user_role') = 'sviluppatore'
  );

CREATE POLICY "Responsabili vedono utenti" ON profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'user_role') = 'responsabile_centro'
  );

CREATE POLICY "Educatori vedono assegnati" ON profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'user_role') = 'educatore'
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
    (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
    OR id = auth.uid()
  );

-- SEDI
CREATE POLICY "Sedi visibili a tutti" ON sedi FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano sedi" ON sedi FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Solo admin aggiornano sedi" ON sedi FOR UPDATE USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Solo admin eliminano sedi" ON sedi FOR DELETE USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- SETTORI
CREATE POLICY "Settori visibili a tutti" ON settori FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano settori" ON settori FOR ALL USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- CLASSI
CREATE POLICY "Classi visibili a tutti" ON classi FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano classi" ON classi FOR ALL USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- CATEGORIE_ESERCIZI
CREATE POLICY "Categorie visibili a tutti" ON categorie_esercizi FOR SELECT USING (true);
CREATE POLICY "Solo sviluppatori modificano categorie" ON categorie_esercizi FOR ALL USING (
  (auth.jwt() ->> 'user_role') = 'sviluppatore'
);

-- ESERCIZI
CREATE POLICY "Esercizi attivi visibili a tutti" ON esercizi FOR SELECT USING (stato = 'attivo');
CREATE POLICY "Sviluppatori vedono tutti esercizi" ON esercizi FOR SELECT USING (
  (auth.jwt() ->> 'user_role') = 'sviluppatore'
);
CREATE POLICY "Solo sviluppatori modificano esercizi" ON esercizi FOR ALL USING (
  (auth.jwt() ->> 'user_role') = 'sviluppatore'
);

-- UTENTI_ESERCIZI
CREATE POLICY "Utenti vedono assegnazioni" ON utenti_esercizi FOR SELECT USING (
  id_utente = auth.uid()
  OR id_assegnante = auth.uid()
  OR (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Educatori gestiscono assegnazioni" ON utenti_esercizi FOR ALL USING (
  id_assegnante = auth.uid()
  OR (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- RISULTATI_ESERCIZI
CREATE POLICY "Utenti vedono risultati" ON risultati_esercizi FOR SELECT USING (
  id_utente = auth.uid()
  OR id_educatore = auth.uid()
  OR (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Utenti inseriscono risultati" ON risultati_esercizi FOR INSERT WITH CHECK (
  id_utente = auth.uid()
);
CREATE POLICY "Admin modificano risultati" ON risultati_esercizi FOR UPDATE USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- EDUCATORI_UTENTI
CREATE POLICY "Admin vedono associazioni" ON educatori_utenti FOR SELECT USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
  OR id_educatore = auth.uid()
);
CREATE POLICY "Admin gestiscono associazioni" ON educatori_utenti FOR ALL USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);

-- LOG_ACCESSI
CREATE POLICY "Solo admin vedono log" ON log_accessi FOR SELECT USING (
  (auth.jwt() ->> 'user_role') IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Sistema inserisce log" ON log_accessi FOR INSERT WITH CHECK (true);

-- STEP 8: Aggiorna JWT di tutti gli utenti esistenti
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id, ruolo FROM profiles)
    LOOP
        PERFORM public.update_user_jwt_claims(r.id, r.ruolo::TEXT);
    END LOOP;
END $$;
