import type { SupportedLanguage } from "./translations";
import { HOME_EN } from "./home-en";
import { HOME_SI } from "./home-si";
import { HOME_TA } from "./home-ta";

export type HomeCopyKey = keyof typeof HOME_EN;

export const HOME_COPY: Record<SupportedLanguage, Record<HomeCopyKey, string>> = {
  en: HOME_EN,
  si: HOME_SI,
  ta: HOME_TA,
};

export const DEFAULT_FLOOD_WATCH_EN = HOME_EN.broadcast_default_flood_watch;
