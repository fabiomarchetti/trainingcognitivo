/**
 * Schemi di validazione Zod per i form
 */
import { z } from 'zod'

// Messaggi di errore in italiano
const errorMessages = {
  required: 'Campo obbligatorio',
  email: 'Email non valida',
  minLength: (min: number) => `Minimo ${min} caratteri`,
  maxLength: (max: number) => `Massimo ${max} caratteri`,
  passwordMatch: 'Le password non coincidono',
}

/**
 * Schema login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, errorMessages.required)
    .email(errorMessages.email),
  password: z
    .string()
    .min(1, errorMessages.required)
    .min(6, errorMessages.minLength(6)),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Schema registrazione utente
 */
export const registerSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  cognome: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  email: z
    .string()
    .min(1, errorMessages.required)
    .email(errorMessages.email),
  password: z
    .string()
    .min(1, errorMessages.required)
    .min(8, errorMessages.minLength(8)),
  confirmPassword: z
    .string()
    .min(1, errorMessages.required),
  ruolo: z.enum([
    'amministratore',
    'direttore',
    'casemanager',
    'educatore',
    'utente'
  ]),
  id_sede: z.number().nullable().optional(),
  id_settore: z.number().nullable().optional(),
  id_classe: z.number().nullable().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: errorMessages.passwordMatch,
  path: ['confirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Schema sede
 */
export const sedeSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  indirizzo: z.string().max(255).nullable().optional(),
  citta: z.string().max(100).nullable().optional(),
  provincia: z.string().length(2, 'Sigla provincia 2 caratteri').nullable().optional(),
  cap: z.string().max(10).nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  email: z.string().email(errorMessages.email).nullable().optional(),
  stato: z.enum(['attiva', 'sospesa', 'chiusa']).default('attiva'),
})

export type SedeFormData = z.infer<typeof sedeSchema>

/**
 * Schema settore
 */
export const settoreSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  descrizione: z.string().nullable().optional(),
  id_sede: z.number().nullable().optional(),
  ordine: z.number().default(0),
  stato: z.enum(['attivo', 'sospeso']).default('attivo'),
})

export type SettoreFormData = z.infer<typeof settoreSchema>

/**
 * Schema classe
 */
export const classeSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(50, errorMessages.maxLength(50)),
  descrizione: z.string().max(255).nullable().optional(),
  id_settore: z.number(),
  ordine: z.number().default(0),
  stato: z.enum(['attiva', 'sospesa']).default('attiva'),
})

export type ClasseFormData = z.infer<typeof classeSchema>

/**
 * Schema categoria esercizi
 */
export const categoriaSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  descrizione: z
    .string()
    .min(1, errorMessages.required)
    .max(255, errorMessages.maxLength(255)),
  note: z.string().max(255).nullable().optional(),
  slug: z
    .string()
    .min(1, errorMessages.required)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Solo lettere minuscole, numeri e trattini'),
  icona: z.string().max(50).nullable().optional(),
  ordine: z.number().default(0),
})

export type CategoriaFormData = z.infer<typeof categoriaSchema>

/**
 * Schema esercizio
 */
export const esercizioSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(150, errorMessages.maxLength(150)),
  descrizione: z
    .string()
    .min(1, errorMessages.required),
  id_categoria: z.number(),
  slug: z
    .string()
    .min(1, errorMessages.required)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Solo lettere minuscole, numeri e trattini'),
  stato: z.enum(['attivo', 'sospeso', 'archiviato']).default('attivo'),
  config: z.record(z.string(), z.unknown()).default({}),
})

export type EsercizioFormData = z.infer<typeof esercizioSchema>

/**
 * Schema agenda
 */
export const agendaSchema = z.object({
  nome: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  id_utente: z.string().uuid(),
  id_educatore: z.string().uuid().nullable().optional(),
  id_parent: z.number().nullable().optional(),
  tipo: z.enum(['principale', 'sottomenu']).default('principale'),
  stato: z.enum(['attivo', 'sospeso', 'archiviato']).default('attivo'),
})

export type AgendaFormData = z.infer<typeof agendaSchema>

/**
 * Schema agenda item
 */
export const agendaItemSchema = z.object({
  id_agenda: z.number(),
  tipo: z.enum(['semplice', 'link_agenda', 'video_youtube']).default('semplice'),
  titolo: z
    .string()
    .min(1, errorMessages.required)
    .max(255, errorMessages.maxLength(255)),
  posizione: z.number().default(0),
  tipo_immagine: z.enum(['arasaac', 'upload', 'nessuna']).default('nessuna'),
  id_arasaac: z.number().nullable().optional(),
  url_immagine: z.string().url().max(500).nullable().optional(),
  id_agenda_collegata: z.number().nullable().optional(),
  video_youtube_id: z.string().max(50).nullable().optional(),
  video_youtube_title: z.string().max(255).nullable().optional(),
  frase_tts: z.string().nullable().optional(),
  stato: z.enum(['attivo', 'sospeso', 'archiviato']).default('attivo'),
})

export type AgendaItemFormData = z.infer<typeof agendaItemSchema>

/**
 * Helper per generare slug da nome
 */
export function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-z0-9\s-]/g, '')    // Rimuove caratteri speciali
    .trim()
    .replace(/\s+/g, '-')            // Spazi -> trattini
    .replace(/-+/g, '-')             // Trattini multipli -> singolo
}
