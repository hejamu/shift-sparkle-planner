import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

// One shared i18n instance for tests. English as default so assertions can
// match on user-visible English text directly. Locale files are bundled
// the same way the app uses them, so missing-key regressions surface.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    interpolation: { escapeValue: false },
  });
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

interface WrapperOptions {
  initialPath?: string;
  client?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, opts: WrapperOptions & RenderOptions = {}) {
  const { initialPath = '/', client = makeClient(), ...rest } = opts;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { ...render(ui, { wrapper: Wrapper, ...rest }), client };
}
