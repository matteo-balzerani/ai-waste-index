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
  inputShell: {
    sectionLabel: "01 / Input",
    title: "Scegli cosa analizzare",
    introduction:
      "Parti da una sola fonte. La bozza esiste solo in questa pagina e non viene mai salvata.",
    modeSelectorLabel: "Tipo di input",
    estimateLink: "Come interpretare la stima",
    privacyNotice:
      "Cambiare tipo di input o lingua, lasciare la pagina o aggiornarla elimina la bozza corrente.",
    modes: {
      text: {
        tabLabel: "Testo",
        title: "Incolla il testo",
        description:
          "Usa direttamente il contenuto visibile. Il punteggio stima il calcolo evitabile, non il valore del contenuto.",
        fieldLabel: "Contenuto da analizzare",
        fieldHint:
          "Il testo inserito direttamente non richiede una conferma dell’estrazione.",
      },
      url: {
        tabLabel: "URL",
        title: "Inserisci un URL pubblico",
        description:
          "Il testo leggibile della pagina verrà estratto tramite un flusso server protetto.",
        fieldLabel: "URL del contenuto pubblico",
        fieldHint:
          "Il testo estratto sarà sempre modificabile e richiederà una conferma esplicita prima dell’analisi.",
      },
      screenshot: {
        tabLabel: "Screenshot",
        title: "Scegli uno screenshot",
        description:
          "Il riconoscimento del testo avverrà localmente nel browser; l’immagine non verrà caricata.",
        fieldLabel: "Screenshot o immagine",
        fieldHint:
          "Il testo estratto sarà sempre modificabile e richiederà una conferma esplicita prima dell’analisi.",
      },
    },
  },
  analysis: {
    submit: "Analizza il testo",
    pending: "Analisi in corso…",
    cancel: "Annulla",
    newAnalysis: "Inizia una nuova analisi",
    textLimit: "Caratteri massimi",
    unavailableMode:
      "Questo tipo di input sarà disponibile in una fase successiva della demo locale.",
    resultTitle: "Il tuo risultato",
    scoreLabel: "AI Waste Score",
    classLabel: "Classe",
    estimatesTitle: "Stime ambientali derivate",
    estimatedValue: "Valore stimato",
    estimatedRange: "Intervallo stimato",
    energy: "Energia",
    carbon: "CO2e",
    water: "Acqua",
    methodologyTitle: "Cosa viene stimato",
    methodologyBody:
      "Il punteggio stima il calcolo evitabile associato alla produzione del contenuto visibile. Il modello può considerare generazione, tentativi e revisioni. Le stime di energia, carbonio e acqua derivano dalle assunzioni sul calcolo e non determinano il punteggio. Le assunzioni sono convenzionali e non modificabili qui. Qualità, verità e valore del contenuto non vengono valutati.",
    methodologyVersion: "Versione della metodologia",
    disclaimer:
      "Stime, non misurazioni. Gli intervalli sono stime, non barre di errore di misura o intervalli di confidenza.",
    demoNotice:
      "Dimostrazione locale: questi sono valori di prova, non stime reali. La metodologia di calcolo non è ancora disponibile.",
    privacy:
      "Questo risultato esiste solo in questa pagina. Aggiornare, cambiare lingua o lasciare la pagina lo elimina.",
  },
  extraction: {
    submit: "Estrai il testo",
    pending: "Estrazione del testo…",
    previewTitle: "Controlla il testo estratto",
    previewLabel: "Testo da analizzare",
    confirmation: "Ho controllato e confermo questo testo.",
    analyze: "Analizza il testo confermato",
    changeUrl: "Cambia URL",
    urlLimit: "Caratteri massimi dell’URL",
    availability:
      "Usa una pagina pubblica HTML o di testo. Le pagine che richiedono accesso o JavaScript potrebbero non essere leggibili. In alternativa puoi incollare direttamente il testo.",
  },
  ocr: {
    pending: "Lettura del testo nel browser…",
    changeImage: "Scegli un altro screenshot",
    formats:
      "Scegli un PNG o JPEG statico. Il testo viene letto in italiano e inglese, interamente nel browser.",
    limits:
      "Limiti: {bytes} MB, {width} × {height} pixel per lato, {pixels} megapixel totali.",
    failed:
      "Non è stato possibile leggere l’immagine. Prova un PNG o JPEG più nitido oppure incolla direttamente il testo.",
    timeout:
      "La lettura dell’immagine ha richiesto troppo tempo ed è stata interrotta. Prova uno screenshot più piccolo oppure incolla direttamente il testo.",
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
    GUARD_UNAVAILABLE:
      "La protezione del servizio non è temporaneamente disponibile.",
    ESTIMATOR_UNAVAILABLE:
      "Il servizio di stima non è temporaneamente disponibile.",
    INTERNAL_ERROR: "Si è verificato un errore tecnico. Riprova più tardi.",
  },
} satisfies Dictionary;
