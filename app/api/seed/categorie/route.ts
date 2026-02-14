/**
 * API per importare categorie esercizi da database Aruba
 * POST /api/seed/categorie
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Categorie da Aruba (estratte dal dump SQL)
const CATEGORIE_ARUBA = [
  {
    nome: 'Categorizzazione',
    descrizione: "Scegliere l'immagine per la categoria",
    note: "L'esercizio carica le risposte esatte e quelle sbagliate",
    slug: 'categorizzazione'
  },
  {
    nome: 'Sequenze Temporali',
    descrizione: 'Mettere in ordine i componenti',
    note: 'Dare un ordine cronologico agli eventi',
    slug: 'sequenze-temporali'
  },
  {
    nome: 'Sequenze Logiche',
    descrizione: 'Ordina gli oggetti in una sequenza logica',
    note: null,
    slug: 'sequenze-logiche'
  },
  {
    nome: 'Causa Effetto',
    descrizione: "Esercizi per sviluppare la comprensione delle relazioni causa-effetto. Fa accadere l'evento al click del mouse, dello switch, oppure toccando l'oggetto sullo schermo",
    note: null,
    slug: 'causa-effetto'
  },
  {
    nome: 'Scrivi con le Sillabe',
    descrizione: 'Da sillabe date, scegli quelle che compongono una parola di senso compiuto',
    note: 'Possiamo lavorare con 2, o 3 sillabe',
    slug: 'scrivi-con-le-sillabe'
  },
  {
    nome: 'Test Memoria',
    descrizione: 'Esercizi per allenare la memoria visiva e uditiva',
    note: 'Categoria di test per verificare auto-generazione',
    slug: 'test-memoria'
  },
  {
    nome: 'Trascina Immagini',
    descrizione: 'Esercizi per associare immagini con drag and drop',
    note: "Serve l'abilità di trascinare immagini sullo schermo",
    slug: 'trascina-immagini'
  },
  {
    nome: 'Clicca Immagine',
    descrizione: "Cerca l'immagine corrispondente al target",
    note: 'Clicca con il mouse, fai tap sul tablet, aspetta il timer e clicca sullo switch',
    slug: 'clicca-immagine'
  },
  {
    nome: 'Strumenti',
    descrizione: 'Raccoglie tutti gli strumenti utili agli utenti realizzati nel tempo',
    note: null,
    slug: 'strumenti'
  },
  {
    nome: 'Coordinazione Visuo-Motoria',
    descrizione: 'Attività per esercitare la coordinazione occhi e mani',
    note: null,
    slug: 'coordinazione-visuomotoria'
  },
  {
    nome: 'Leggo-Scrivo',
    descrizione: 'Insieme di esercizi per la lettura e la scrittura',
    note: null,
    slug: 'leggo-scrivo'
  },
]

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Chiavi Supabase mancanti' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < CATEGORIE_ARUBA.length; i++) {
      const categoria = CATEGORIE_ARUBA[i]

      try {
        // Controlla se esiste già (per slug)
        const { data: existing } = await supabase
          .from('categorie_esercizi')
          .select('id')
          .eq('slug', categoria.slug)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Inserisci nuova categoria
        const { error: insertError } = await supabase
          .from('categorie_esercizi')
          .insert({
            nome: categoria.nome,
            descrizione: categoria.descrizione,
            note: categoria.note,
            slug: categoria.slug,
            ordine: i + 1
          })

        if (insertError) {
          errors.push(`${categoria.nome}: ${insertError.message}`)
          continue
        }

        created++
      } catch (err: any) {
        errors.push(`${categoria.nome}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Create ${created} categorie. Skippate ${skipped} (già esistenti).`
    })

  } catch (error: any) {
    console.error('Errore seed categorie:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
