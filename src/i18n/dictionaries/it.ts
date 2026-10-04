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
    compactEnergy: "Energia GPU",
    compactCarbon: "CO₂e",
    compactWater: "Acqua",
    environmentInfo: "Informazioni sulla stima ambientale",
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
    energy: "Energia GPU stimata",
    carbon: "CO₂e stimata*",
    water: "Acqua consumata stimata*",
    generationNotice: "Consumo stimato per una generazione di testo IA.",
    scopeNotice: "Esclusi tentativi scartati e revisioni.",
    scoreBasis: "Score basato solo sull’energia GPU stimata in Wh; CO₂e e acqua non contribuiscono allo score.",
    environmentNotice: "* CO₂e, acqua e relativi intervalli stimano una quota infrastrutturale convenzionale attribuita all’energia GPU. CPU, memoria e altri carichi IT non quantificati e i loro impatti sono esclusi, non considerati nulli. L’acqua comprende il consumo per raffreddamento del data center e generazione elettrica, non prelievo, volume ricircolato o impronta dell’intero ciclo di vita.",
    inferenceNotice: "Non dimostra l’uso dell’IA e non misura il consumo effettivo dell’autore. Non valuta qualità, utilità, veridicità, ideologia o argomento del contenuto.",
    comparabilityNotice: "Non confrontare direttamente score di versioni metodologiche diverse.",
    demoLabel: "Valori dimostrativi",
    demoEnergy: "Energia GPU (demo)",
    demoCarbon: "CO₂e (demo)",
    demoWater: "Acqua (demo)",
    demoRange: "Intervallo dimostrativo",
    methodologyTitle: "Dettagli della stima",
    methodologyBody: "La stima riguarda una sola generazione del testo visibile secondo uno scenario tecnico convenzionale, escludendo tentativi scartati e revisioni. Le assunzioni non sono personalizzabili. Lo score descrive il consumo stimato di energia GPU in Wh. CO₂e e acqua sono stime derivate separate e non contribuiscono allo score. Sta a chi legge valutare se il consumo sia valso la pena.",
    methodologyVersion: "Metodologia",
    disclaimer: "Gli intervalli descrivono la variabilità nello scenario di riferimento, non tutta l’incertezza né intervalli convalidati di accuratezza o confidenza statistica.",
    experimentalLabel: "Stima sperimentale",
    experimentalNotice: "Stima sperimentale · Accuratezza fisica non verificata.",
    zeroScoreNotice: "Uno score arrotondato a 0 può accompagnarsi a energia stimata positiva.",
    demoNotice: "Valori dimostrativi · Non sono stime reali.",
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
    context: "Consumo stimato per una generazione di testo IA.",
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
  info: {
    privacyTitle: "Privacy",
    privacyBody: "Testi, link, immagini e risultati non vengono salvati dall’app né registrati nei log. Non ci sono account, cronologia o link pubblici al risultato. La condivisione copia testo o immagini sul tuo dispositivo.",
    inputTitle: "Link e screenshot",
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
