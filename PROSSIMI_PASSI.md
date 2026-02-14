# Prossimi Passi - TrainingCognitivo

## Stato Attuale

- ✅ Progetto Next.js creato e configurato
- ✅ Supabase configurato (progetto: `trainingcognitivo`)
- ✅ Schema SQL eseguito su Supabase
- ✅ Codice pushato su GitHub: https://github.com/fabiomarchetti/trainingcognitivo

---

## 1. Spostare la Cartella (Opzionale)

Sposta `trainingcognitivo` nella posizione desiderata:

```bash
mv /Applications/MAMP/htdocs/trainingcognitivo ~/Projects/nextjs/
```

---

## 2. Collegare Vercel a GitHub

1. Vai su https://vercel.com
2. Clicca **"Add New Project"**
3. Seleziona **"Import Git Repository"**
4. Autorizza Vercel ad accedere a GitHub (se non già fatto)
5. Trova e seleziona `fabiomarchetti/trainingcognitivo`
6. Clicca **"Import"**

---

## 3. Configurare Environment Variables su Vercel

Durante l'import (o dopo in Settings → Environment Variables), aggiungi:

| Nome                            | Valore                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://hrmrndmjhriehavqfquj.supabase.co`                                                                                                                                                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybXJuZG1qaHJpZWhhdnFmcXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjE3MTYsImV4cCI6MjA4NDEzNzcxNn0.8WUuUNrMuRCjlda70wOh1kg8QLjUo5M-hEDkW_aHpRM`            |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybXJuZG1qaHJpZWhhdnFmcXVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU2MTcxNiwiZXhwIjoyMDg0MTM3NzE2fQ.XCQy0V38tiMWPSpExr3ggqrQCoTpF7MVSPZPQ64yxZM` |

**IMPORTANTE**: Seleziona tutti gli ambienti (Production, Preview, Development)

---

## 4. Deploy

1. Clicca **"Deploy"**
2. Attendi il build (~1-2 minuti)
3. Vercel fornirà URL tipo: `https://trainingcognitivo.vercel.app`

---

## 5. Testare

- Apri l'URL Vercel
- Prova la pagina `/login`
- Verifica che Supabase risponda

---

## 6. Continuare Sviluppo

Apri la cartella in VS Code e avvia Claude Code per continuare con:

### Fase 2 - Sistema Auth Completo

- Logout
- Forgot password
- Protezione route complete

### Fase 3 - Pannello Admin

- CRUD utenti
- CRUD sedi
- CRUD settori/classi
- CRUD categorie/esercizi

### Fase 4 - Dashboard Educatore

- Lista utenti assegnati
- Statistiche
- Assegnazione esercizi

### Fase 5-6 - Migrazione Esercizi

- Causa effetto
- Categorizzazione
- Memoria
- Strumenti (comunicatore, agenda)

---

## Credenziali Supabase (Riferimento)

- **Progetto**: trainingcognitivo
- **ID**: hrmrndmjhriehavqfquj
- **URL**: https://hrmrndmjhriehavqfquj.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/hrmrndmjhriehavqfquj

---

## Comandi Utili

```bash
# Sviluppo locale
npm run dev

# Build
npm run build

# Push modifiche
git add .
git commit -m "descrizione"
git push
```

Dopo ogni push, Vercel fa automaticamente il deploy!
