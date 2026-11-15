import 'dotenv/config';
import { connectDatabase } from './config/database';
import { createStandaloneBackendApp } from './app';

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await connectDatabase();
  const app = createStandaloneBackendApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Echoes of the Dark API listening on port ${PORT}`);
  });
}

start();
