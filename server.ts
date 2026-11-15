import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './backend/src/config/database';
import { createApiRouter } from './backend/src/app';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  await connectDatabase();

  const app = express();
  app.set('trust proxy', 1);

  // Mount full-stack API routes
  app.use('/api', createApiRouter());

  if (isProd) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            workerSrc: ["'self'", 'blob:'],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Echoes of the Dark running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Fatal] Server startup failed:', err);
  process.exit(1);
});
