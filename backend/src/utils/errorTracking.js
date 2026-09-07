const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

const initSentry = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express(),
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      environment: process.env.NODE_ENV,
    });
  }
};

const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Solo capturar errores específicos o con ciertos códigos de estado
    return error.status >= 500 || error.name === 'ValidationError';
  },
});

const captureError = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    console.error('Error:', error);
    console.error('Context:', context);
  }
};

module.exports = {
  initSentry,
  sentryErrorHandler,
  captureError,
};
