import { buildApp } from './app';
import { initSchema } from './db';
import { logger } from './logger';

const PORT = Number(process.env.PORT) || 3001;
const app = buildApp();

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'API server running');
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to initialize database, refusing to start');
    process.exit(1);
  });
