-- ============================================
-- TrainingCognitivo - Schema PostgreSQL per Supabase
-- Versione: 1.0.0
-- Data: 2026-01-16
-- ============================================

-- ============================================
-- TIPI ENUM
-- ============================================

-- Ruoli utente con gerarchia
CREATE TYPE ruolo_utente AS ENUM (
  'sviluppatore',    -- Accesso totale, invisibile
  'amministratore',  -- Gestione sistema
  'direttore',       -- Gestione sede
  'casemanager',     -- Gestione utenti
  'educatore',       -- Gestione pazienti assegnati
  'utente'           -- Utente finale (ex paziente)
);

-- Stati account
CREATE TYPE stato_account AS ENUM ('attivo', 'sospeso', 'eliminato');
CREATE TYPE stato_sede AS ENUM ('attiva', 'sospesa', 'chiusa');
CREATE TYPE stato_settore AS ENUM ('attivo', 'sospeso');
CREATE TYPE stato_classe AS ENUM ('attiva', 'sospesa');
CREATE TYPE stato_educatore AS ENUM ('attivo', 'sospeso', 'in_formazione', 'eliminato');
CREATE TYPE stato_esercizio AS ENUM ('attivo', 'sospeso', 'archiviato');

-- Tipi per strumenti
CREATE TYPE tipo_agenda AS ENUM ('principale', 'sottomenu');
CREATE TYPE tipo_item AS ENUM ('semplice', 'link_agenda', 'video_youtube');
CREATE TYPE tipo_immagine AS ENUM ('arasaac', 'upload', 'nessuna');

-- Log
CREATE TYPE esito_accesso AS ENUM ('successo', 'fallimento');


-- ============================================
-- 1. SEDI
-- ============================================
CREATE TABLE sedi (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL UNIQUE,
  indirizzo VARCHAR(255),
  citta VARCHAR(100),
  provincia CHAR(2),
  cap VARCHAR(10),
  telefono VARCHAR(20),
  email VARCHAR(255),
  stato stato_sede DEFAULT 'attiva',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sedi IS 'Sedi/Location dove operano gli utenti';


-- ============================================
-- 2. SETTORI
-- ============================================
CREATE TABLE settori (
  id BIGSERIAL PRIMARY KEY,
  id_sede BIGINT REFERENCES sedi(id) ON DELETE SET NULL,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT,
  ordine INT DEFAULT 0,
  stato stato_settore DEFAULT 'attivo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE settori IS 'Settori di una sede (es. Infanzia, Primaria)';


-- ============================================
-- 3. CLASSI
-- ============================================
CREATE TABLE classi (
  id BIGSERIAL PRIMARY KEY,
  id_settore BIGINT REFERENCES settori(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  descrizione VARCHAR(255),
  ordine INT DEFAULT 0,
  stato stato_classe DEFAULT 'attiva',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_settore, nome)
);

COMMENT ON TABLE classi IS 'Classi appartenenti a un settore';


-- ============================================
-- 4. PROFILES (estende auth.users di Supabase)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  ruolo ruolo_utente NOT NULL DEFAULT 'utente',
  id_sede BIGINT REFERENCES sedi(id) ON DELETE SET NULL,
  id_settore BIGINT REFERENCES settori(id) ON DELETE SET NULL,
  id_classe BIGINT REFERENCES classi(id) ON DELETE SET NULL,
  telefono VARCHAR(20),
  email_contatto VARCHAR(255),
  note TEXT,
  stato stato_account DEFAULT 'attivo',
  ultimo_accesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Profili utente estesi collegati a auth.users';


-- ============================================
-- 5. EDUCATORI_UTENTI (Associazioni)
-- ============================================
CREATE TABLE educatori_utenti (
  id BIGSERIAL PRIMARY KEY,
  id_educatore UUID REFERENCES profiles(id) ON DELETE CASCADE,
  id_utente UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_attiva BOOLEAN DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_educatore, id_utente)
);

COMMENT ON TABLE educatori_utenti IS 'Associazioni tra educatori e utenti assegnati';


-- ============================================
-- 6. CATEGORIE_ESERCIZI
-- ============================================
CREATE TABLE categorie_esercizi (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descrizione VARCHAR(255) NOT NULL,
  note VARCHAR(255),
  slug VARCHAR(100) NOT NULL UNIQUE,  -- es. "memoria-visiva"
  icona VARCHAR(50),                   -- Nome icona Bootstrap/Lucide
  ordine INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE categorie_esercizi IS 'Categorie di esercizi cognitivi';


-- ============================================
-- 7. ESERCIZI
-- ============================================
CREATE TABLE esercizi (
  id BIGSERIAL PRIMARY KEY,
  id_categoria BIGINT REFERENCES categorie_esercizi(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  descrizione TEXT NOT NULL,
  slug VARCHAR(150) NOT NULL,          -- es. "sequenze-colori"
  stato stato_esercizio DEFAULT 'attivo',
  config JSONB DEFAULT '{}',           -- Configurazione flessibile JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_categoria, slug)
);

COMMENT ON TABLE esercizi IS 'Esercizi cognitivi con configurazione dinamica';
COMMENT ON COLUMN esercizi.config IS 'Configurazione JSON flessibile per ogni tipo di esercizio';


-- ============================================
-- 8. UTENTI_ESERCIZI (Assegnazioni)
-- ============================================
CREATE TABLE utenti_esercizi (
  id BIGSERIAL PRIMARY KEY,
  id_utente UUID REFERENCES profiles(id) ON DELETE CASCADE,
  id_esercizio BIGINT REFERENCES esercizi(id) ON DELETE CASCADE,
  id_assegnante UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stato stato_esercizio DEFAULT 'attivo',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_utente, id_esercizio)
);

COMMENT ON TABLE utenti_esercizi IS 'Esercizi assegnati a un utente';


-- ============================================
-- 9. RISULTATI_ESERCIZI
-- ============================================
CREATE TABLE risultati_esercizi (
  id BIGSERIAL PRIMARY KEY,
  id_utente UUID REFERENCES profiles(id) ON DELETE SET NULL,
  id_educatore UUID REFERENCES profiles(id) ON DELETE SET NULL,
  id_esercizio BIGINT REFERENCES esercizi(id) ON DELETE SET NULL,
  sessione_numero INT DEFAULT 1,
  tempo_latenza_ms INT,                 -- Tempo risposta in millisecondi
  items_totali INT,
  items_corretti INT,
  dati_sessione JSONB DEFAULT '{}',    -- Dati flessibili per ogni esercizio
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

COMMENT ON TABLE risultati_esercizi IS 'Risultati sessioni esercizi con dati flessibili';


-- ============================================
-- 10. AGENDE (Strumenti)
-- ============================================
CREATE TABLE agende (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  id_utente UUID REFERENCES profiles(id) ON DELETE CASCADE,
  id_educatore UUID REFERENCES profiles(id) ON DELETE SET NULL,
  id_parent BIGINT REFERENCES agende(id) ON DELETE CASCADE,
  tipo tipo_agenda DEFAULT 'principale',
  stato stato_esercizio DEFAULT 'attivo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agende IS 'Agende pittogrammi con supporto sotto-agende';


-- ============================================
-- 11. AGENDE_ITEMS
-- ============================================
CREATE TABLE agende_items (
  id BIGSERIAL PRIMARY KEY,
  id_agenda BIGINT REFERENCES agende(id) ON DELETE CASCADE,
  tipo tipo_item NOT NULL DEFAULT 'semplice',
  titolo VARCHAR(255) NOT NULL,
  posizione INT DEFAULT 0,
  tipo_immagine tipo_immagine DEFAULT 'nessuna',
  id_arasaac INT,                       -- ID pittogramma ARASAAC
  url_immagine VARCHAR(500),            -- URL immagine caricata
  id_agenda_collegata BIGINT REFERENCES agende(id) ON DELETE SET NULL,
  video_youtube_id VARCHAR(50),
  video_youtube_title VARCHAR(255),
  frase_tts TEXT,                       -- Frase per text-to-speech
  stato stato_esercizio DEFAULT 'attivo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agende_items IS 'Items delle agende con supporto ARASAAC e YouTube';


-- ============================================
-- 12. LOG_ACCESSI
-- ============================================
CREATE TABLE log_accessi (
  id BIGSERIAL PRIMARY KEY,
  id_utente UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email VARCHAR(255),
  esito esito_accesso NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE log_accessi IS 'Log degli accessi al sistema';


-- ============================================
-- INDICI PER PERFORMANCE
-- ============================================
CREATE INDEX idx_profiles_ruolo ON profiles(ruolo);
CREATE INDEX idx_profiles_sede ON profiles(id_sede);
CREATE INDEX idx_profiles_settore ON profiles(id_settore);
CREATE INDEX idx_profiles_stato ON profiles(stato);

CREATE INDEX idx_settori_sede ON settori(id_sede);
CREATE INDEX idx_classi_settore ON classi(id_settore);

CREATE INDEX idx_educatori_utenti_educatore ON educatori_utenti(id_educatore);
CREATE INDEX idx_educatori_utenti_utente ON educatori_utenti(id_utente);

CREATE INDEX idx_esercizi_categoria ON esercizi(id_categoria);
CREATE INDEX idx_esercizi_stato ON esercizi(stato);
CREATE INDEX idx_esercizi_slug ON esercizi(slug);

CREATE INDEX idx_utenti_esercizi_utente ON utenti_esercizi(id_utente);
CREATE INDEX idx_utenti_esercizi_esercizio ON utenti_esercizi(id_esercizio);

CREATE INDEX idx_risultati_utente ON risultati_esercizi(id_utente);
CREATE INDEX idx_risultati_esercizio ON risultati_esercizi(id_esercizio);
CREATE INDEX idx_risultati_educatore ON risultati_esercizi(id_educatore);
CREATE INDEX idx_risultati_started ON risultati_esercizi(started_at);

CREATE INDEX idx_agende_utente ON agende(id_utente);
CREATE INDEX idx_agende_educatore ON agende(id_educatore);
CREATE INDEX idx_agende_parent ON agende(id_parent);

CREATE INDEX idx_agende_items_agenda ON agende_items(id_agenda);
CREATE INDEX idx_agende_items_posizione ON agende_items(posizione);

CREATE INDEX idx_log_created ON log_accessi(created_at);
CREATE INDEX idx_log_utente ON log_accessi(id_utente);


-- ============================================
-- TRIGGERS E FUNZIONI
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, cognome, ruolo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Nuovo'),
    COALESCE(NEW.raw_user_meta_data->>'cognome', 'Utente'),
    COALESCE((NEW.raw_user_meta_data->>'ruolo')::ruolo_utente, 'utente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Auto-update ultimo_accesso on login
CREATE OR REPLACE FUNCTION public.update_ultimo_accesso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.esito = 'successo' AND NEW.id_utente IS NOT NULL THEN
    UPDATE profiles
    SET ultimo_accesso = NOW()
    WHERE id = NEW.id_utente;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_login_success
  AFTER INSERT ON log_accessi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ultimo_accesso();


-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sedi_updated_at
  BEFORE UPDATE ON sedi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Abilita RLS su tutte le tabelle sensibili
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE educatori_utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE risultati_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE agende ENABLE ROW LEVEL SECURITY;
ALTER TABLE agende_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_accessi ENABLE ROW LEVEL SECURITY;

-- Tabelle pubbliche (solo lettura per tutti)
ALTER TABLE sedi ENABLE ROW LEVEL SECURITY;
ALTER TABLE settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE classi ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_esercizi ENABLE ROW LEVEL SECURITY;


-- ============================================
-- POLICIES: SEDI, SETTORI, CLASSI (Pubbliche in lettura)
-- ============================================

CREATE POLICY "Sedi visibili a tutti" ON sedi
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano sedi" ON sedi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Settori visibili a tutti" ON settori
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano settori" ON settori
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Classi visibili a tutti" ON classi
  FOR SELECT USING (true);

CREATE POLICY "Solo admin modificano classi" ON classi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );


-- ============================================
-- POLICIES: PROFILES
-- ============================================

-- Utenti vedono solo se stessi di default
CREATE POLICY "Utenti vedono se stessi" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Sviluppatori vedono tutti
CREATE POLICY "Sviluppatori vedono tutti" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );

-- Admin vedono utenti non-sviluppatori della propria sede
CREATE POLICY "Admin vedono utenti sede" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('amministratore', 'direttore', 'casemanager')
    AND ruolo NOT IN ('sviluppatore')
  );

-- Educatori vedono solo utenti assegnati
CREATE POLICY "Educatori vedono utenti assegnati" ON profiles
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'educatore'
    AND (
      id = auth.uid() -- Se stesso
      OR id IN (
        SELECT id_utente FROM educatori_utenti
        WHERE id_educatore = auth.uid() AND is_attiva = TRUE
      )
    )
  );

-- Solo sviluppatori/admin possono modificare profili
CREATE POLICY "Admin modificano profili" ON profiles
  FOR UPDATE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
    OR id = auth.uid() -- L'utente può modificare se stesso
  );


-- ============================================
-- POLICIES: CATEGORIE_ESERCIZI
-- ============================================

CREATE POLICY "Categorie visibili a tutti" ON categorie_esercizi
  FOR SELECT USING (true);

CREATE POLICY "Solo sviluppatori modificano categorie" ON categorie_esercizi
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) = 'sviluppatore'
  );


-- ============================================
-- POLICIES: ESERCIZI
-- ============================================

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


-- ============================================
-- POLICIES: UTENTI_ESERCIZI
-- ============================================

CREATE POLICY "Utenti vedono proprie assegnazioni" ON utenti_esercizi
  FOR SELECT USING (
    id_utente = auth.uid()
    OR id_assegnante = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Educatori gestiscono assegnazioni" ON utenti_esercizi
  FOR ALL USING (
    id_assegnante = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );


-- ============================================
-- POLICIES: RISULTATI_ESERCIZI
-- ============================================

CREATE POLICY "Utenti vedono propri risultati" ON risultati_esercizi
  FOR SELECT USING (
    id_utente = auth.uid()
    OR id_educatore = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Utenti inseriscono propri risultati" ON risultati_esercizi
  FOR INSERT WITH CHECK (
    id_utente = auth.uid()
  );

CREATE POLICY "Admin modificano risultati" ON risultati_esercizi
  FOR UPDATE USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );


-- ============================================
-- POLICIES: AGENDE
-- ============================================

CREATE POLICY "Utenti vedono proprie agende" ON agende
  FOR SELECT USING (
    id_utente = auth.uid()
    OR id_educatore = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Educatori gestiscono agende" ON agende
  FOR ALL USING (
    id_educatore = auth.uid()
    OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Utenti creano proprie agende" ON agende
  FOR INSERT WITH CHECK (
    id_utente = auth.uid()
  );


-- ============================================
-- POLICIES: AGENDE_ITEMS
-- ============================================

CREATE POLICY "Items visibili se agenda visibile" ON agende_items
  FOR SELECT USING (
    id_agenda IN (
      SELECT id FROM agende WHERE
        id_utente = auth.uid()
        OR id_educatore = auth.uid()
        OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
    )
  );

CREATE POLICY "Educatori gestiscono items" ON agende_items
  FOR ALL USING (
    id_agenda IN (
      SELECT id FROM agende WHERE
        id_educatore = auth.uid()
        OR (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
    )
  );


-- ============================================
-- POLICIES: EDUCATORI_UTENTI
-- ============================================

CREATE POLICY "Admin vedono associazioni" ON educatori_utenti
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore', 'direttore', 'casemanager')
    OR id_educatore = auth.uid()
  );

CREATE POLICY "Admin gestiscono associazioni" ON educatori_utenti
  FOR ALL USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore', 'direttore', 'casemanager')
  );


-- ============================================
-- POLICIES: LOG_ACCESSI
-- ============================================

CREATE POLICY "Solo admin vedono log" ON log_accessi
  FOR SELECT USING (
    (SELECT ruolo FROM profiles WHERE id = auth.uid()) IN ('sviluppatore', 'amministratore')
  );

CREATE POLICY "Sistema inserisce log" ON log_accessi
  FOR INSERT WITH CHECK (true);


-- ============================================
-- DATI INIZIALI
-- ============================================

-- Categorie esercizi base
INSERT INTO categorie_esercizi (nome, descrizione, slug, icona, ordine) VALUES
  ('Causa Effetto', 'Esercizi per comprendere le relazioni causa-effetto', 'causa-effetto', 'zap', 1),
  ('Categorizzazione', 'Esercizi di categorizzazione e classificazione', 'categorizzazione', 'folder', 2),
  ('Memoria', 'Esercizi per allenare la memoria', 'memoria', 'brain', 3),
  ('Coordinazione Visuomotoria', 'Esercizi di coordinazione occhio-mano', 'coordinazione-visuomotoria', 'target', 4),
  ('Clicca Immagine', 'Esercizi di selezione immagini', 'clicca-immagine', 'mouse-pointer', 5),
  ('Scrivi', 'Esercizi di scrittura', 'scrivi', 'pencil', 6),
  ('Sequenze Logiche', 'Esercizi di sequenze e logica', 'sequenze-logiche', 'list-ordered', 7),
  ('Sequenze Temporali', 'Esercizi di sequenze temporali', 'sequenze-temporali', 'clock', 8),
  ('Trascina Immagini', 'Esercizi drag-and-drop', 'trascina-immagini', 'move', 9),
  ('Strumenti', 'Strumenti assistivi (Comunicatore, Agenda, etc.)', 'strumenti', 'tool', 10);

-- Esercizi base (categoria Causa Effetto)
INSERT INTO esercizi (id_categoria, nome, descrizione, slug, stato, config) VALUES
  (1, 'Accendi la Luce', 'Esercizio causa-effetto: premi per accendere la luce', 'accendi-la-luce', 'attivo',
   '{"sessioni": 10, "tempoVisualizzazione": 3000, "feedbackSonoro": true}');


-- ============================================
-- FINE SCHEMA
-- ============================================
