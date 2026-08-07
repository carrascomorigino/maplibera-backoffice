import { config as loadEnv } from 'dotenv';
import express from 'express';
import { registerTranslateRoute } from './server/register-translate-route';

if (process.env['NODE_ENV'] !== 'production') {
  loadEnv();
}

const app = express();
app.use(express.json());
registerTranslateRoute(app);

const port = process.env['API_PORT'] || 4000;
app.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
