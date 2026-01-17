# CLAUDE.md - TrainingCognitivo

Questo file fornisce il contesto a Claude Code per lavorare su questo progetto.

## Panoramica Progetto

**TrainingCognitivo** è un sistema di training cognitivo per utenti con difficoltà cognitive e sensoriali.

- **Stack**: Next.js 14+ (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS
- **Deploy**: Vercel + Supabase Cloud
- **Lingua**: Italiano (UI, codice, commenti)

## Comandi Essenziali

```bash
# Sviluppo
npm run dev              # Avvia server sviluppo (http://localhost:3000)
npm run build            # Build produzione
npm run lint             # Linting ESLint

# Database
# Eseguire SQL su Supabase Dashboard → SQL Editor
# Schema: supabase/schema.sql
```

## Architettura

### Struttura Cartelle

```
trainingcognitivo/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Route group autenticazione
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Route group dashboard (da implementare)
│   │   ├── admin/            # Pannello admin
│   │   └── dashboard/        # Dashboard educatore
│   ├── (training)/           # Route group esercizi (da implementare)
│   ├── api/                  # API Routes
│   │   └── auth/             # Endpoints autenticazione
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Homepage
│   └── globals.css           # Stili globali
├── components/
│   ├── ui/                   # Componenti base (Button, Card, Input, etc.)
│   ├── auth/                 # Componenti autenticazione
│   ├── admin/                # Componenti pannello admin (da creare)
│   ├── training/             # Componenti esercizi (da creare)
│   └── shared/               # Componenti condivisi (da creare)
├── lib/
│   ├── supabase/             # Client Supabase (browser, server, middleware)
│   ├── hooks/                # Custom hooks (da creare)
│   ├── services/             # Servizi (ARASAAC, TTS) (da creare)
│   └── utils/                # Utility (cn, date-format, validation)
├── public/
│   ├── icons/                # Icone PWA (da aggiungere)
│   └── manifest.json         # Configurazione PWA
├── supabase/
│   └── schema.sql            # Schema database PostgreSQL
├── middleware.ts             # Auth middleware Next.js
└── .env.local                # Credenziali Supabase (NON committare!)
```

### Database Supabase

**URL**: `https://hrmrndmjhriehavqfquj.supabase.co`

**Tabelle principali**:

- `profiles` - Profili utente (estende auth.users)
- `sedi` - Sedi/location
- `settori` - Settori per sede
- `classi` - Classi per settore
- `educatori_utenti` - Associazioni educatore-utente
- `categorie_esercizi` - Categorie esercizi
- `esercizi` - Esercizi con config JSON
- `utenti_esercizi` - Assegnazioni esercizi
- `risultati_esercizi` - Risultati sessioni
- `agende` - Agende pittogrammi
- `agende_items` - Items delle agende
- `log_accessi` - Log accessi sistema

**Ruoli utente** (enum `ruolo_utente`):

- `sviluppatore` - Accesso totale, invisibile
- `amministratore` - Gestione sistema
- `direttore` - Gestione sede
- `casemanager` - Gestione utenti
- `educatore` - Gestione pazienti assegnati
- `utente` - Utente finale

### Autenticazione

- **Supabase Auth** per gestione sessioni
- **Middleware** (`middleware.ts`) protegge le route
- **RLS** (Row Level Security) su tutte le tabelle sensibili

**Flusso login**:

1. Utente accede a `/login`
2. Supabase Auth verifica credenziali
3. Middleware legge ruolo da `profiles`
4. Redirect basato su ruolo:
   - sviluppatore/admin → `/admin`
   - educatore → `/dashboard`
   - utente → `/training`

## Componenti UI

Stile shadcn-like con Tailwind. Componenti in `components/ui/`:

- `Button` - Con varianti (default, destructive, outline, etc.)
- `Card` - Card, CardHeader, CardContent, CardFooter
- `Input` - Con label e error
- `Select` - Select nativo stilizzato
- `Textarea` - Textarea con label e error
- `Badge` - Badge con StatusBadge e RoleBadge
- `Modal` - Modal con ConfirmModal

**Utility CSS**: `cn()` da `lib/utils` per classi condizionali.

## Validazione

Schemi Zod in `lib/utils/validation.ts`:

- `loginSchema`
- `registerSchema`
- `sedeSchema`
- `settoreSchema`
- `classeSchema`
- `categoriaSchema`
- `esercizioSchema`
- `agendaSchema`
- `agendaItemSchema`

## Stato Implementazione

### ✅ Completato (Fase 1)

- Setup progetto Next.js 14+
- Configurazione Supabase (client, server, middleware)
- Schema SQL completo con RLS
- Componenti UI base
- Pagine auth (login, register)
- Homepage

### 🔄 Da Implementare

- **Fase 2**: Sistema auth completo (logout, forgot password)
- **Fase 3**: Pannello Admin (CRUD utenti, sedi, settori)
- **Fase 4**: Dashboard Educatore
- **Fase 5-6**: Migrazione esercizi da PHP
- **Fase 7**: PWA e ottimizzazioni
- **Fase 8**: Migrazione dati da MySQL

## Deploy

### Vercel

- Repository GitHub: `trainingcognitivo`
- Environment variables da configurare:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ```

### Supabase

- Progetto: `trainingcognitivo`
- Region: (default)
- Schema: eseguito da `supabase/schema.sql`

## Note Sviluppo

- **NON committare** `.env.local` (contiene chiavi segrete)
- **Formato date**: TIMESTAMPTZ in PostgreSQL, formattazione italiana in UI
- **Lingua**: Tutto in italiano (UI, commenti, variabili)
- **Stile**: Tailwind CSS, niente emoji nel codice a meno che richiesto

## Credenziali (solo sviluppo locale)

Le credenziali sono in `.env.local`. Per produzione, usare le environment variables di Vercel.

## Link Utili

- [Supabase Dashboard](https://supabase.com/dashboard/project/hrmrndmjhriehavqfquj)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/icons)
