/**
 * Development environment. Replaced by `environment.prod.ts` in production builds via the
 * `fileReplacements` entry in `angular.json`.
 *
 * `apiBaseUrl` points straight at the deployed backend, so the dev server's origin
 * (http://localhost:4200) must be in the backend's `CORS_ALLOWED_ORIGINS`. To use a locally running
 * backend instead, set it to `/backend`: `proxy.conf.json` forwards that to http://localhost:8081.
 * Unit tests override `API_BASE_URL` themselves, so they never depend on this value.
 *
 * The Firebase web config is not a secret — it identifies the project to Google's servers and is
 * visible in any browser bundle. Access is enforced by the backend verifying the ID token and its
 * `role: 'admin'` claim, not by hiding these values.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://maplibera-backend-853674363885.us-central1.run.app',
  firebase: {
    apiKey: 'AIzaSyCkIZvS2m7UGc2FhQZj-v4xIj7MyTsUlOI',
    authDomain: 'maplibera.firebaseapp.com',
    projectId: 'maplibera',
    appId: '1:853674363885:web:8fac2cac64cea15eef35e4',
  },
};
