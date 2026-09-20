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
  apiMessages: Record<ApiMessageCode, string>;
}
