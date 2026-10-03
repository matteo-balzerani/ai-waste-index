import type { Dictionary } from "../types";

export const en = {
  metadata: {
    title: "AI Waste Index",
    description:
      "Estimate the energy and environmental resource consumption of one AI generation.",
  },
  navigation: {
    languageSelectorLabel: "Choose language",
    italian: "Italiano",
    english: "English",
  },
  landing: {
    screenshotTitle: "Choose. Discover.",
    brand: "AI Waste Index",
    title: "Paste. Discover.",
    description:
      "Use the visible text to estimate energy, CO2e and water for one generation in the reference scenario.",
    estimateNoticeTitle: "An estimate, not a judgement",
    estimateNoticeBody:
      "Experimental estimates use conventional assumptions. They do not measure the original consumption, detect AI-generated text or judge the value of the content.",
  },
  inputShell: {
    sectionLabel: "01 / Input",
    title: "Choose what to analyse",
    introduction:
      "Start with one source. Draft content exists only on this page and is never saved.",
    modeSelectorLabel: "Input type",
    estimateLink: "Info & method",
    privacyNotice:
      "Changing input type or language, leaving the page or refreshing discards the current draft.",
    modes: {
      text: {
        tabLabel: "Text",
        title: "Paste your text here…",
        description:
          "Use the visible text directly. The score represents estimated energy consumption in the reference scenario.",
        fieldLabel: "Content to analyse",
        fieldHint:
          "Direct text does not require an extraction confirmation step.",
      },
      url: {
        tabLabel: "Link",
        title: "Paste a link…",
        description:
          "The page’s readable text will be extracted through a protected server flow.",
        fieldLabel: "Public content URL",
        fieldHint:
          "Extracted text will always be editable and require explicit confirmation before analysis.",
      },
      screenshot: {
        tabLabel: "Screenshot",
        title: "Choose a screenshot",
        description:
          "Text recognition will run locally in your browser; the image will not be uploaded.",
        fieldLabel: "Choose a screenshot",
        fieldHint:
          "Extracted text will always be editable and require explicit confirmation before analysis.",
      },
    },
  },
  analysis: {
    loadingLabel: "Analysing…",
    submit: "Analyse",
    pending: "Analysing…",
    cancel: "Cancel",
    newAnalysis: "New analysis",
    emptyInput: "Paste some text.",
    textLimit: "Maximum characters",
    unavailableMode:
      "This input mode will be available in a later step of the local demo.",
    resultTitle: "Your result",
    scoreLabel: "AI Waste Score",
    classLabel: "Class",
    estimatesTitle: "Environmental estimates",
    estimatedValue: "Estimated value",
    estimatedRange: "Scenario range",
    energy: "Estimated GPU energy",
    carbon: "Estimated CO₂e*",
    water: "Estimated water consumption*",
    generationNotice: "Estimated consumption for one AI text generation.",
    scopeNotice: "Excludes discarded attempts and revisions.",
    scoreBasis: "Score based only on estimated GPU energy in Wh; CO₂e and water do not contribute to the score.",
    environmentNotice: "* CO₂e, water and their ranges estimate a conventional infrastructure share allocated to GPU energy. CPU, memory and other unquantified IT loads and their impacts are excluded, not zero. Water includes consumption for data-center cooling and electricity generation, not withdrawal, recirculating volume or a full lifecycle footprint.",
    inferenceNotice: "Does not establish AI authorship or measure the author’s actual consumption. Does not assess the quality, usefulness, truthfulness, ideology or topic of the content.",
    comparabilityNotice: "Do not directly compare scores from different methodology versions.",
    demoLabel: "Demonstration values",
    demoEnergy: "GPU energy (demo)",
    demoCarbon: "CO₂e (demo)",
    demoWater: "Water (demo)",
    demoRange: "Demonstration range",
    methodologyTitle: "Estimate details",
    methodologyBody: "This estimates one generation of the visible text under a conventional technical scenario, excluding discarded attempts and revisions. The assumptions cannot be customized. The score describes estimated GPU energy consumption in Wh. CO₂e and water are separate derived estimates and do not contribute to the score. Whether the consumption was worthwhile is for readers to judge.",
    methodologyVersion: "Methodology",
    disclaimer: "Ranges describe variation within the reference scenario, not total uncertainty or validated accuracy or statistical confidence intervals.",
    experimentalLabel: "Experimental estimate",
    experimentalNotice: "Experimental estimate · Physical accuracy unverified.",
    zeroScoreNotice: "A score rounded to 0 can accompany positive estimated energy.",
    demoNotice: "Demonstration values · Not real estimates.",
    privacy:
      "This result exists only on this page. Refreshing, changing language or leaving the page discards it.",
  },
  extraction: {
    loadingLabel: "Extracting…",
    submit: "Extract text",
    pending: "Extracting text…",
    previewTitle: "Review the text",
    previewLabel: "Text to analyse",
    confirmation: "I have reviewed and confirm this text.",
    analyze: "Analyse",
    changeUrl: "Change URL",
    urlLimit: "Maximum URL characters",
    availability:
      "Use a public HTML or text page. Pages that require sign-in or JavaScript may not be readable. You can paste the text directly instead.",
  },
  ocr: {
    pending: "Reading text…",
    changeImage: "Change image",
    formats:
      "PNG / JPEG",
    limits:
      "Limits: {bytes} MB, {width} × {height} pixels per side, {pixels} megapixels in total.",
    failed:
      "The image could not be read. Try a clearer PNG or JPEG, or paste the text directly.",
    timeout:
      "Reading the image took too long and was stopped. Try a smaller screenshot or paste the text directly.",
  },
  sharing: {
    title: "Take it with you.",
    description:
      "Copy the result or a compact badge, or prepare a card to share yourself.",
    context: "Estimated consumption for one AI text generation.",
    disclaimer: "Estimated, not measured.",
    copyText: "Copy text",
    copyBadge: "Copy badge text",
    open: "Share",
    close: "Close",
    zoomIn: "Enlarge",
    zoomOut: "Fit",
    formatLabel: "Image format",
    showBadge: "Badge",
    badgeTitle: "Share badge",
    copyBadgeImage: "Copy image",
    showCard: "Card",
    copyImage: "Copy image",
    cardTitle: "Share card",
    screenshotHint:
      "You can also take a screenshot of this card. Include the methodology version and estimate disclaimer.",
    pending: "Copying…",
    textCopied: "Result text copied.",
    badgeCopied: "Badge text copied.",
    imageCopied: "Image copied.",
    textFallback:
      "Automatic copying is unavailable. Select and copy the text below.",
    imageFallback: "The image could not be copied. You can take a screenshot of the preview.",
    manualLabel: "Text to copy manually",
  },
  apiMessages: {
    EXTRACTION_CONFIRMATION_REQUIRED:
      "Review and confirm the extracted text before analysis.",
    INVALID_INPUT: "Check the input and try again.",
    ESTIMATE_OUT_OF_DOMAIN: "An estimate is not available for this text.",
    INPUT_TOO_LARGE: "The input is too large.",
    REQUEST_TIMEOUT: "The request took too long. Try again.",
    URL_BLOCKED: "This URL cannot be accessed safely.",
    URL_FETCH_FAILED: "The URL could not be fetched.",
    EXTRACTION_FAILED: "Usable text could not be extracted.",
    RATE_LIMITED: "Too many requests. Try again later.",
    GLOBAL_CAP_REACHED: "The service has reached its current capacity.",
    GUARD_UNAVAILABLE: "The service protection is temporarily unavailable.",
    ESTIMATOR_UNAVAILABLE: "The estimation service is temporarily unavailable.",
    INTERNAL_ERROR: "A technical error occurred. Try again later.",
  },
} satisfies Dictionary;
