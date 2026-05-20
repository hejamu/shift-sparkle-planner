import express from 'express';
import cookieParser from 'cookie-parser';
import { initSchema } from './db';
import { registerAuthRoutes } from './auth';
import { registerAdminRoutes } from './routes/admin';
import { registerSettingsRoutes } from './routes/settings';
import { registerEmployeeRoutes } from './routes/employees';
import { registerShiftRoutes } from './routes/shifts';
import { registerShiftTypeRoutes } from './routes/shiftTypes';
import { registerShiftApplicationRoutes } from './routes/shiftApplications';
import { registerCinetixxRoutes } from './routes/cinetixx';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(cookieParser());

registerAuthRoutes(app);
registerAdminRoutes(app);
registerSettingsRoutes(app);
registerEmployeeRoutes(app);
registerShiftRoutes(app);
registerShiftTypeRoutes(app);
registerShiftApplicationRoutes(app);
registerCinetixxRoutes(app);

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database, refusing to start:', err);
    process.exit(1);
  });
