import pino from 'pino';

// JSON logs in production, pretty in dev. Pretty transport is loaded only
// when actually used so the slim image doesn't need pino-pretty.
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]', '*.password', '*.token'],
    censor: '[redacted]',
  },
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss.l', colorize: true } } }),
});
