import type { Dictionary } from "../types";

export const it = {
  metadata: {
    title: "AI Waste Index",
    description:
      "Stima il calcolo IA evitabile e il suo impatto ambientale derivato.",
  },
  navigation: {
    languageSelectorLabel: "Scegli la lingua",
    italian: "Italiano",
    english: "English",
  },
  landing: {
    brand: "AI Waste Index",
    title: "Stima il calcolo IA evitabile.",
    description:
      "Comprendi il calcolo stimato associato alla produzione di un contenuto visibile e il relativo impatto derivato su energia, carbonio e acqua.",
    estimateNoticeTitle: "Una stima, non un giudizio",
    estimateNoticeBody:
      "I risultati sono stime basate su assunzioni convenzionali. Non misurano l’impatto ambientale e non giudicano qualità, verità o valore del contenuto.",
  },
  apiMessages: {
    EXTRACTION_CONFIRMATION_REQUIRED:
      "Controlla e conferma il testo estratto prima dell’analisi.",
    INVALID_INPUT: "Controlla i dati inseriti e riprova.",
    INPUT_TOO_LARGE: "Il contenuto inserito è troppo grande.",
    REQUEST_TIMEOUT: "La richiesta ha impiegato troppo tempo. Riprova.",
    URL_BLOCKED: "Questo URL non può essere raggiunto in sicurezza.",
    URL_FETCH_FAILED: "Non è stato possibile recuperare l’URL.",
    EXTRACTION_FAILED: "Non è stato possibile estrarre testo utilizzabile.",
    RATE_LIMITED: "Troppe richieste. Riprova più tardi.",
    GLOBAL_CAP_REACHED: "Il servizio ha raggiunto la capacità disponibile.",
    GUARD_UNAVAILABLE: "La protezione del servizio non è temporaneamente disponibile.",
    ESTIMATOR_UNAVAILABLE: "Il servizio di stima non è temporaneamente disponibile.",
    INTERNAL_ERROR: "Si è verificato un errore tecnico. Riprova più tardi.",
  },
} satisfies Dictionary;
