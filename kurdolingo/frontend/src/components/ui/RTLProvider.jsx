import { useEffect } from 'react';
import { useLangStore } from '../../i18n';

// RTL languages that need different font stack
const RTL_LANGS = ['ar', 'fa'];
const RTL_FONT  = "'Noto Sans Arabic', 'Segoe UI', sans-serif";
const LTR_FONT  = "'Nunito', sans-serif";

export default function RTLProvider({ children }) {
  const lang = useLangStore(s => s.lang);

  useEffect(() => {
    const isRTL = RTL_LANGS.includes(lang);
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Swap font for Arabic/Persian
    document.documentElement.style.setProperty(
      '--font',
      isRTL ? RTL_FONT : LTR_FONT
    );
  }, [lang]);

  return children;
}
