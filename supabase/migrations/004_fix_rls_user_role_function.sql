-- ============================================
-- FIX DEFINITIVO: Funzione user_role() in schema public
-- Data: 2026-01-31
-- Risolve problema permessi schema auth
-- ============================================

-- STEP 1: Crea funzione public.user_role() con SECURITY DEFINER
-- Questa funzione può accedere a auth.users grazie a SECURITY DEFINER
-- Evita ricorsione perché non fa SELECT su profiles
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
BEGIN
  -- Prima prova a leggere dal JWT
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'user_role',
    -- Se non c'è nel JWT, legge da auth.users (no RLS su auth schema)
    (SELECT raw_app_meta_data->>'user_role' FROM auth.users WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Commento sulla funzione
COMMENT ON FUNCTION public.user_role() IS 'Ritorna il ruolo utente da JWT o da auth.users. STABLE SECURITY DEFINER per evitare ricorsione RLS.';

-- STEP 2: Grant execute a authenticated e anon
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated, anon;

-- STEP 3: Drop tutte le policies esistenti
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

-- STEP 4: Ricrea policies usando public.user_role()

-- PROFILES
CREATE POLICY "Utenti vedono se stessi" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Sviluppatori vedono tutti" ON profiles
  FOR SELECT USING (public.user_role() = 'sviluppatore');

CREATE POLICY "Responsabili vedono utenti" ON profiles
  FOR SELECT USING (public.user_role() = 'responsabile_centro');

CREATE POLICY "Educatori vedono assegnati" ON profiles
  FOR SELECT USING (
    public.user_role() = 'educatore'
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
    public.user_role() IN ('sviluppatore', 'responsabile_centro')
    OR id = auth.uid()
  );

-- SEDI
CREATE POLICY "Sedi visibili a tutti" ON sedi FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano sedi" ON sedi FOR INSERT WITH CHECK (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Solo admin aggiornano sedi" ON sedi FOR UPDATE USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Solo admin eliminano sedi" ON sedi FOR DELETE USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- SETTORI
CREATE POLICY "Settori visibili a tutti" ON settori FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano settori" ON settori FOR ALL USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- CLASSI
CREATE POLICY "Classi visibili a tutti" ON classi FOR SELECT USING (true);
CREATE POLICY "Solo admin modificano classi" ON classi FOR ALL USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- CATEGORIE_ESERCIZI
CREATE POLICY "Categorie visibili a tutti" ON categorie_esercizi FOR SELECT USING (true);
CREATE POLICY "Solo sviluppatori modificano categorie" ON categorie_esercizi FOR ALL USING (
  public.user_role() = 'sviluppatore'
);

-- ESERCIZI
CREATE POLICY "Esercizi attivi visibili a tutti" ON esercizi FOR SELECT USING (stato = 'attivo');
CREATE POLICY "Sviluppatori vedono tutti esercizi" ON esercizi FOR SELECT USING (
  public.user_role() = 'sviluppatore'
);
CREATE POLICY "Solo sviluppatori modificano esercizi" ON esercizi FOR ALL USING (
  public.user_role() = 'sviluppatore'
);

-- UTENTI_ESERCIZI
CREATE POLICY "Utenti vedono assegnazioni" ON utenti_esercizi FOR SELECT USING (
  id_utente = auth.uid()
  OR id_assegnante = auth.uid()
  OR public.user_role() IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Educatori gestiscono assegnazioni" ON utenti_esercizi FOR ALL USING (
  id_assegnante = auth.uid()
  OR public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- RISULTATI_ESERCIZI
CREATE POLICY "Utenti vedono risultati" ON risultati_esercizi FOR SELECT USING (
  id_utente = auth.uid()
  OR id_educatore = auth.uid()
  OR public.user_role() IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Utenti inseriscono risultati" ON risultati_esercizi FOR INSERT WITH CHECK (
  id_utente = auth.uid()
);
CREATE POLICY "Admin modificano risultati" ON risultati_esercizi FOR UPDATE USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- EDUCATORI_UTENTI
CREATE POLICY "Admin vedono associazioni" ON educatori_utenti FOR SELECT USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
  OR id_educatore = auth.uid()
);
CREATE POLICY "Admin gestiscono associazioni" ON educatori_utenti FOR ALL USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);

-- LOG_ACCESSI
CREATE POLICY "Solo admin vedono log" ON log_accessi FOR SELECT USING (
  public.user_role() IN ('sviluppatore', 'responsabile_centro')
);
CREATE POLICY "Sistema inserisce log" ON log_accessi FOR INSERT WITH CHECK (true);
