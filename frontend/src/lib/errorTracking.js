import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/browser';

export const initSentry = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
      ],
      // Deshabilitar el widget de Sentry en desarrollo
      showReportDialog: false,
      // Configuración del widget
      widgetStyle: 'none', // Ocultar el widget
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: process.env.NODE_ENV,
      beforeSend(event) {
        // No enviar PII (Información Personal Identificable)
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
  }
};

export const logError = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    console.error(error);
  }
};

export const setUserContext = (user) => {
  if (process.env.NODE_ENV === 'production' && user) {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      role: user.role
    });
  }
};
