import type { ApiMessageCode } from "@/contracts/codes";

export interface Dictionary {
  metadata: {
    title: string;
    description: string;
  };
  navigation: {
    languageSelectorLabel: string;
    italian: string;
    english: string;
  };
  landing: {
    brand: string;
    title: string;
    description: string;
    estimateNoticeTitle: string;
    estimateNoticeBody: string;
  };
  inputShell: {
    sectionLabel: string;
    title: string;
    introduction: string;
    modeSelectorLabel: string;
    estimateLink: string;
    privacyNotice: string;
    modes: {
      text: InputModeCopy;
      url: InputModeCopy;
      screenshot: InputModeCopy;
    };
  };
  analysis: {
    submit: string;
    pending: string;
    cancel: string;
    newAnalysis: string;
    textLimit: string;
    emptyInput: string;
    unavailableMode: string;
    resultTitle: string;
    scoreLabel: string;
    classLabel: string;
    estimatesTitle: string;
    estimatedValue: string;
    estimatedRange: string;
    energy: string;
    carbon: string;
    water: string;
    methodologyTitle: string;
    methodologyBody: string;
    methodologyVersion: string;
    disclaimer: string;
    demoNotice: string;
    experimentalNotice: string;
    experimentalLabel: string;
    zeroScoreNotice: string;
    privacy: string;
  };
  extraction: {
    submit: string;
    pending: string;
    previewTitle: string;
    previewLabel: string;
    confirmation: string;
    analyze: string;
    changeUrl: string;
    urlLimit: string;
    availability: string;
  };
  ocr: {
    pending: string;
    changeImage: string;
    formats: string;
    limits: string;
    failed: string;
    timeout: string;
  };
  sharing: {
    title: string;
    description: string;
    context: string;
    disclaimer: string;
    copyText: string;
    copyBadge: string;
    showCard: string;
    open: string;
    formatLabel: string;
    showBadge: string;
    badgeTitle: string;
    copyBadgeImage: string;
    copyImage: string;
    cardTitle: string;
    screenshotHint: string;
    pending: string;
    textCopied: string;
    badgeCopied: string;
    imageCopied: string;
    textFallback: string;
    imageFallback: string;
    manualLabel: string;
  };
  apiMessages: Record<ApiMessageCode, string>;
}

interface InputModeCopy {
  tabLabel: string;
  title: string;
  description: string;
  fieldLabel: string;
  fieldHint: string;
}
