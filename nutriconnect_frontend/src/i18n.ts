import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      login: {
        sign_in_with_health_portal: "Sign in with Health Portal",
        username: "Username",
        password: "Password",
        submit: "Submit",
        or: "OR",
        dont_have_existing_account: "Don't have an existing account?",
        sign_up_here: "Sign up here",
        sign_in_with_sludi: "Sign in with SLUDI"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;
