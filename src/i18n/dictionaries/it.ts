import type { Dictionary } from "../types";

export const it = {
  metadata: {
    title: "AI Waste Index",
    description:
      "Stima il consumo energetico di una generazione IA e i relativi consumi ambientali.",
  },
  navigation: {
    languageSelectorLabel: "Scegli la lingua",
    italian: "Italiano",
    english: "English",
  },
  landing: {
    screenshotTitle: "Scegli e scopri.",
    brand: "AI Waste Index",
    title: "Incolla e scopri.",
    description:
      "Parti dal testo visibile per stimare energia, CO2e e acqua di una singola generazione nello scenario di riferimento.",
    estimateNoticeTitle: "Una stima, non un giudizio",
    estimateNoticeBody:
      "Le stime sperimentali usano assunzioni convenzionali. Non misurano il consumo originale, non riconoscono testi generati da IA e non giudicano il valore del contenuto.",
  },
  inputShell: {
    sectionLabel: "01 / Input",
    title: "Scegli cosa analizzare",
    introduction:
      "Parti da una sola fonte. La bozza esiste solo in questa pagina e non viene mai salvata.",
    modeSelectorLabel: "Tipo di input",
    estimateLink: "Info e metodo",
    privacyNotice:
      "Cambiare tipo di input o lingua, lasciare la pagina o aggiornarla elimina la bozza corrente.",
    modes: {
      text: {
        tabLabel: "Testo",
        title: "Incolla il testo qui…",
        description:
          "Usa direttamente il testo visibile. Il punteggio rappresenta il consumo energetico stimato nello scenario di riferimento.",
        fieldLabel: "Contenuto da analizzare",
        fieldHint:
          "Il testo inserito direttamente non richiede una conferma dell’estrazione.",
      },
      url: {
        tabLabel: "Link",
        title: "Incolla un link…",
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
        fieldLabel: "Scegli uno screenshot",
        fieldHint:
          "Il testo estratto sarà sempre modificabile e richiederà una conferma esplicita prima dell’analisi.",
      },
    },
  },
  analysis: {
    loadingLabel: "Analisi…",
    submit: "Analizza",
    pending: "Analisi in corso…",
    cancel: "Annulla",
    newAnalysis: "Nuova analisi",
    emptyInput: "Incolla un testo.",
    textLimit: "Caratteri massimi",
    unavailableMode:
      "Questo tipo di input sarà disponibile in una fase successiva della demo locale.",
    resultTitle: "Il tuo risultato",
    scoreLabel: "AI Waste Score",
    classLabel: "Classe",
    estimatesTitle: "Stime ambientali",
    estimatedValue: "Valore stimato",
    estimatedRange: "Intervallo dello scenario",
    energy: "Energia",
    carbon: "CO2e",
    water: "Acqua",
    methodologyTitle: "Dettagli della stima",
    methodologyBody:
      "Il punteggio si basa sull’energia stimata in Wh per una singola generazione del testo visibile, senza bozze scartate o revisioni. CO2e e acqua sono stime separate; l’acqua comprende raffreddamento dei data center e produzione elettrica. Le assunzioni sono convenzionali e non modificabili qui. Il risultato non misura il processo originale né stabilisce se il testo sia stato generato da IA. Qualità, raffinatezza e utilità del contenuto non vengono valutate.",
    methodologyVersion: "Metodo",
    disclaimer:
      "Stime, non misurazioni. Gli intervalli descrivono variazioni nello scenario di riferimento, non intervalli di confidenza o l’incertezza complessiva.",
    experimentalLabel: "Stima sperimentale",
    experimentalNotice: "Stima sperimentale: accuratezza fisica non ancora verificata.",
    zeroScoreNotice: "Un punteggio arrotondato a zero non significa consumo nullo.",
    demoNotice:
      "Dimostrazione locale: questi sono valori di prova, non stime del modello.",
    privacy:
      "Questo risultato esiste solo in questa pagina. Aggiornare, cambiare lingua o lasciare la pagina lo elimina.",
  },
  extraction: {
    loadingLabel: "Estrazione…",
    submit: "Estrai il testo",
    pending: "Estrazione del testo…",
    previewTitle: "Controlla il testo",
    previewLabel: "Testo da analizzare",
    confirmation: "Ho controllato e confermo questo testo.",
    analyze: "Analizza",
    changeUrl: "Cambia URL",
    urlLimit: "Caratteri massimi dell’URL",
    availability:
      "Usa una pagina pubblica HTML o di testo. Le pagine che richiedono accesso o JavaScript potrebbero non essere leggibili. In alternativa puoi incollare direttamente il testo.",
  },
  ocr: {
    pending: "Lettura del testo…",
    changeImage: "Cambia screenshot",
    formats:
      "PNG / JPEG",
    limits:
      "Limiti: {bytes} MB, {width} × {height} pixel per lato, {pixels} megapixel totali.",
    failed:
      "Non è stato possibile leggere l’immagine. Prova un PNG o JPEG più nitido oppure incolla direttamente il testo.",
    timeout:
      "La lettura dell’immagine ha richiesto troppo tempo ed è stata interrotta. Prova uno screenshot più piccolo oppure incolla direttamente il testo.",
  },
  sharing: {
    title: "Portalo con te.",
    description:
      "Copia il risultato o un badge compatto, oppure prepara una scheda da condividere tu.",
    context: "Consumo di generazione IA stimato",
    disclaimer: "Valori stimati, non misurati.",
    copyText: "Copia testo",
    copyBadge: "Copia testo badge",
    open: "Condividi",
    close: "Chiudi",
    zoomIn: "Ingrandisci",
    zoomOut: "Adatta",
    formatLabel: "Formato immagine",
    showBadge: "Badge",
    badgeTitle: "Badge da condividere",
    copyBadgeImage: "Copia immagine",
    showCard: "Scheda",
    copyImage: "Copia immagine",
    cardTitle: "Scheda da condividere",
    screenshotHint:
      "Puoi anche fare uno screenshot di questa scheda. Includi la versione della metodologia e il disclaimer di stima.",
    pending: "Copia in corso…",
    textCopied: "Testo del risultato copiato.",
    badgeCopied: "Testo del badge copiato.",
    imageCopied: "Immagine copiata.",
    textFallback:
      "La copia automatica non è disponibile. Seleziona e copia il testo qui sotto.",
    imageFallback: "Non è stato possibile copiare l’immagine. Puoi fare uno screenshot dell’anteprima.",
    manualLabel: "Testo da copiare manualmente",
  },
  apiMessages: {
    EXTRACTION_CONFIRMATION_REQUIRED:
      "Controlla e conferma il testo estratto prima dell’analisi.",
    INVALID_INPUT: "Controlla i dati inseriti e riprova.",
    ESTIMATE_OUT_OF_DOMAIN: "Stima non disponibile per questo testo.",
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
