import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '../locales/de.json'
import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import it from '../locales/it.json'
import pl from '../locales/pl.json'
import ptBR from '../locales/pt-BR.json'
import ptPT from '../locales/pt-PT.json'
import ru from '../locales/ru.json'
import uk from '../locales/uk.json'

const LANG_KEY = 'securo_lang'

// Same language set as securo, labeled in each language's own name (the
// convention securo's language menu uses).
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
]

export function currentLanguage(): string {
  return i18n.resolvedLanguage ?? 'en'
}

export function setLanguage(code: string): void {
  localStorage.setItem(LANG_KEY, code)
  void i18n.changeLanguage(code)
}

// Mirrors securo's i18n stance: English is the default and only an explicit,
// persisted user choice overrides it — never the browser/system language,
// which would silently override the default for es/pt users.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    'pt-BR': { translation: ptBR },
    'pt-PT': { translation: ptPT },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    pl: { translation: pl },
    ru: { translation: ru },
    uk: { translation: uk },
  },
  lng: localStorage.getItem(LANG_KEY) ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
