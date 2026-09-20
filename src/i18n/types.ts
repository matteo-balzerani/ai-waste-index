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
  apiMessages: Record<ApiMessageCode, string>;
}

interface InputModeCopy {
  tabLabel: string;
  title: string;
  description: string;
  fieldLabel: string;
  fieldHint: string;
}
