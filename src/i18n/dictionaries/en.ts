import type { Dictionary } from "../types";

export const en = {
  metadata: {
    title: "AI Waste Index",
    description:
      "Estimate avoidable AI compute and its derived environmental impact.",
  },
  navigation: {
    languageSelectorLabel: "Choose language",
    italian: "Italiano",
    english: "English",
  },
  landing: {
    brand: "AI Waste Index",
    title: "Estimate avoidable AI compute.",
    description:
      "Understand the estimated compute associated with producing visible content and its derived energy, carbon and water impact.",
    estimateNoticeTitle: "An estimate, not a judgement",
    estimateNoticeBody:
      "Results are estimates based on conventional assumptions. They do not measure environmental impact or judge the quality, truth or value of the content.",
  },
  inputShell: {
    sectionLabel: "01 / Input",
    title: "Choose what to analyse",
    introduction:
      "Start with one source. Draft content exists only on this page and is never saved.",
    modeSelectorLabel: "Input type",
    estimateLink: "How to interpret the estimate",
    privacyNotice:
      "Changing input type or language, leaving the page or refreshing discards the current draft.",
    modes: {
      text: {
        tabLabel: "Text",
        title: "Paste text",
        description:
          "Use the visible content directly. The score estimates avoidable compute, not the content’s value.",
        fieldLabel: "Content to analyse",
        fieldHint:
          "Direct text does not require an extraction confirmation step.",
      },
      url: {
        tabLabel: "URL",
        title: "Enter a public URL",
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
        fieldLabel: "Screenshot or image",
        fieldHint:
          "Extracted text will always be editable and require explicit confirmation before analysis.",
      },
    },
  },
  analysis: {
    submit: "Analyse text",
    pending: "Analysing…",
    cancel: "Cancel",
    newAnalysis: "Start a new analysis",
    textLimit: "Maximum characters",
    unavailableMode:
      "This input mode will be available in a later step of the local demo.",
    resultTitle: "Your result",
    scoreLabel: "AI Waste Score",
    classLabel: "Class",
    estimatesTitle: "Derived environmental estimates",
    estimatedValue: "Estimated value",
    estimatedRange: "Estimated range",
    energy: "Energy",
    carbon: "CO2e",
    water: "Water",
    methodologyTitle: "What this estimates",
    methodologyBody:
      "The score estimates avoidable compute associated with producing the visible content. The model may consider generation, retries and refinements. Energy, carbon and water estimates derive from compute assumptions; they do not determine the score. Assumptions are conventional and cannot be adjusted here. Content quality, truth and value are not assessed.",
    methodologyVersion: "Methodology version",
    disclaimer:
      "Estimated, not measured. Ranges are estimates, not measurement error bars or confidence intervals.",
    demoNotice:
      "Local demonstration: these are test values, not real estimates. The scoring methodology is not yet available.",
    privacy:
      "This result exists only on this page. Refreshing, changing language or leaving the page discards it.",
  },
  extraction: {
    submit: "Extract text",
    pending: "Extracting text…",
    previewTitle: "Review the extracted text",
    previewLabel: "Text to analyse",
    confirmation: "I have reviewed and confirm this text.",
    analyze: "Analyse confirmed text",
    changeUrl: "Change URL",
    urlLimit: "Maximum URL characters",
    availability:
      "Use a public HTML or text page. Pages that require sign-in or JavaScript may not be readable. You can paste the text directly instead.",
  },
  ocr: {
    pending: "Reading text in your browser…",
    changeImage: "Choose another screenshot",
    formats:
      "Choose a static PNG or JPEG. Text is read in Italian and English, entirely in your browser.",
    limits:
      "Limits: {bytes} MB, {width} × {height} pixels per side, {pixels} megapixels in total.",
    failed:
      "The image could not be read. Try a clearer PNG or JPEG, or paste the text directly.",
    timeout:
      "Reading the image took too long and was stopped. Try a smaller screenshot or paste the text directly.",
  },
  sharing: {
    title: "Share this result",
    description:
      "Copy the result or a compact badge, or prepare a card to share yourself.",
    context: "Estimated avoidable AI compute",
    disclaimer: "Estimated, not measured.",
    copyText: "Copy result text",
    copyBadge: "Copy badge text",
    showCard: "Show share card",
    copyImage: "Copy card image",
    cardTitle: "Your share card",
    screenshotHint:
      "You can also take a screenshot of this card. Include the methodology version and estimate disclaimer.",
    pending: "Copying…",
    textCopied: "Result text copied.",
    badgeCopied: "Badge text copied.",
    imageCopied: "Card image copied.",
    textFallback:
      "Automatic copying is unavailable. Select and copy the text below.",
    imageFallback:
      "The image could not be copied in this browser. Take a screenshot of the card instead.",
    manualLabel: "Text to copy manually",
  },
  apiMessages: {
    EXTRACTION_CONFIRMATION_REQUIRED:
      "Review and confirm the extracted text before analysis.",
    INVALID_INPUT: "Check the input and try again.",
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
