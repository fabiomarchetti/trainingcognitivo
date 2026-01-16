/**
 * Tipi TypeScript per il database Supabase
 * Generati dallo schema PostgreSQL
 */

// Tipi ENUM
export type RuoloUtente =
  | 'sviluppatore'
  | 'amministratore'
  | 'direttore'
  | 'casemanager'
  | 'educatore'
  | 'utente'

export type StatoAccount = 'attivo' | 'sospeso' | 'eliminato'
export type StatoSede = 'attiva' | 'sospesa' | 'chiusa'
export type StatoSettore = 'attivo' | 'sospeso'
export type StatoClasse = 'attiva' | 'sospesa'
export type StatoEducatore = 'attivo' | 'sospeso' | 'in_formazione' | 'eliminato'
export type StatoEsercizio = 'attivo' | 'sospeso' | 'archiviato'
export type TipoAgenda = 'principale' | 'sottomenu'
export type TipoItem = 'semplice' | 'link_agenda' | 'video_youtube'
export type TipoImmagine = 'arasaac' | 'upload' | 'nessuna'
export type EsitoAccesso = 'successo' | 'fallimento'

// Interfacce Tabelle
export interface Sede {
  id: number
  nome: string
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  telefono: string | null
  email: string | null
  stato: StatoSede
  created_at: string
  updated_at: string
}

export interface Settore {
  id: number
  id_sede: number | null
  nome: string
  descrizione: string | null
  ordine: number
  stato: StatoSettore
  created_at: string
}

export interface Classe {
  id: number
  id_settore: number | null
  nome: string
  descrizione: string | null
  ordine: number
  stato: StatoClasse
  created_at: string
}

export interface Profile {
  id: string // UUID
  nome: string
  cognome: string
  ruolo: RuoloUtente
  id_sede: number | null
  id_settore: number | null
  id_classe: number | null
  telefono: string | null
  email_contatto: string | null
  note: string | null
  stato: StatoAccount
  ultimo_accesso: string | null
  created_at: string
  updated_at: string
}

export interface EducatoreUtente {
  id: number
  id_educatore: string // UUID
  id_utente: string // UUID
  is_attiva: boolean
  note: string | null
  created_at: string
}

export interface CategoriaEsercizi {
  id: number
  nome: string
  descrizione: string
  note: string | null
  slug: string
  icona: string | null
  ordine: number
  created_at: string
}

export interface Esercizio {
  id: number
  id_categoria: number | null
  nome: string
  descrizione: string
  slug: string
  stato: StatoEsercizio
  config: Record<string, unknown>
  created_at: string
}

export interface UtenteEsercizio {
  id: number
  id_utente: string // UUID
  id_esercizio: number
  id_assegnante: string | null // UUID
  stato: StatoEsercizio
  note: string | null
  created_at: string
}

export interface RisultatoEsercizio {
  id: number
  id_utente: string | null // UUID
  id_educatore: string | null // UUID
  id_esercizio: number | null
  sessione_numero: number
  tempo_latenza_ms: number | null
  items_totali: number | null
  items_corretti: number | null
  dati_sessione: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  started_at: string
  ended_at: string | null
}

export interface Agenda {
  id: number
  nome: string
  id_utente: string // UUID
  id_educatore: string | null // UUID
  id_parent: number | null
  tipo: TipoAgenda
  stato: StatoEsercizio
  created_at: string
}

export interface AgendaItem {
  id: number
  id_agenda: number
  tipo: TipoItem
  titolo: string
  posizione: number
  tipo_immagine: TipoImmagine
  id_arasaac: number | null
  url_immagine: string | null
  id_agenda_collegata: number | null
  video_youtube_id: string | null
  video_youtube_title: string | null
  frase_tts: string | null
  stato: StatoEsercizio
  created_at: string
}

export interface LogAccesso {
  id: number
  id_utente: string | null // UUID
  email: string | null
  esito: EsitoAccesso
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Interfaccia Database per Supabase
export interface Database {
  public: {
    Tables: {
      sedi: {
        Row: Sede
        Insert: Omit<Sede, 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Sede, 'id'>>
      }
      settori: {
        Row: Settore
        Insert: Omit<Settore, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<Settore, 'id'>>
      }
      classi: {
        Row: Classe
        Insert: Omit<Classe, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<Classe, 'id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id'>>
      }
      educatori_utenti: {
        Row: EducatoreUtente
        Insert: Omit<EducatoreUtente, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<EducatoreUtente, 'id'>>
      }
      categorie_esercizi: {
        Row: CategoriaEsercizi
        Insert: Omit<CategoriaEsercizi, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<CategoriaEsercizi, 'id'>>
      }
      esercizi: {
        Row: Esercizio
        Insert: Omit<Esercizio, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<Esercizio, 'id'>>
      }
      utenti_esercizi: {
        Row: UtenteEsercizio
        Insert: Omit<UtenteEsercizio, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<UtenteEsercizio, 'id'>>
      }
      risultati_esercizi: {
        Row: RisultatoEsercizio
        Insert: Omit<RisultatoEsercizio, 'id' | 'started_at'> & {
          id?: number
          started_at?: string
        }
        Update: Partial<Omit<RisultatoEsercizio, 'id'>>
      }
      agende: {
        Row: Agenda
        Insert: Omit<Agenda, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<Agenda, 'id'>>
      }
      agende_items: {
        Row: AgendaItem
        Insert: Omit<AgendaItem, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<AgendaItem, 'id'>>
      }
      log_accessi: {
        Row: LogAccesso
        Insert: Omit<LogAccesso, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<LogAccesso, 'id'>>
      }
    }
    Enums: {
      ruolo_utente: RuoloUtente
      stato_account: StatoAccount
      stato_sede: StatoSede
      stato_settore: StatoSettore
      stato_classe: StatoClasse
      stato_educatore: StatoEducatore
      stato_esercizio: StatoEsercizio
      tipo_agenda: TipoAgenda
      tipo_item: TipoItem
      tipo_immagine: TipoImmagine
      esito_accesso: EsitoAccesso
    }
  }
}

// Tipi estesi con relazioni (per query con join)
export interface ProfileWithRelations extends Profile {
  sede?: Sede | null
  settore?: Settore | null
  classe?: Classe | null
}

export interface EsercizioWithCategoria extends Esercizio {
  categoria?: CategoriaEsercizi | null
}

export interface AgendaWithItems extends Agenda {
  items?: AgendaItem[]
}

// Tipi per form
export type SedeFormData = Database['public']['Tables']['sedi']['Insert']
export type ProfileFormData = Database['public']['Tables']['profiles']['Insert']
export type EsercizioFormData = Database['public']['Tables']['esercizi']['Insert']
