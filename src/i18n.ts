import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Check if we are on a public route where we want language detection
const isPublicRoute = window.location.pathname.includes('/submit-story/') || window.location.pathname.includes('/interview/');

const params = new URLSearchParams(window.location.search);
let langParam = params.get('lang');
// Normalize pt variations to pt-BR
if (langParam?.toLowerCase() === 'pt-br' || langParam?.toLowerCase() === 'pt') {
    langParam = 'pt-BR';
}

void i18n
    // load translation using http -> see /public/locales
    // learn more: https://github.com/i18next/i18next-http-backend
    .use(Backend)
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        // If 'lang' query param is present, force that language.
        // On public routes without a query param, start with 'en' baseline until
        // the form controller resolves the form's single source of truth default language.
        lng: langParam || 'en',
        load: 'currentOnly', // Prevent loading parent languages (e.g. 'pt' for 'pt-BR') which don't exist
        fallbackLng: 'en',
        supportedLngs: ['en', 'de', 'pt-BR', 'es', 'fr', 'it', 'nl'],
        lowerCaseLng: false, // Ensure casing is preserved
        debug: import.meta.env.DEV, // Enable debug in development

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        // Detection options: On public routes, do NOT read or write to localStorage/cookie
        // so that an administrator's session language never overrides the form's configured locale.
        detection: {
            order: isPublicRoute ? ['querystring'] : ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
            lookupQuerystring: 'lang',
            caches: isPublicRoute ? [] : ['localStorage', 'cookie'],
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
    });

export default i18n;
