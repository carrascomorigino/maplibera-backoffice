import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Every route is behind Firebase Auth, which only exists in the browser: there is no session and
    // no id token on the server, so rendering there would either prerender an empty shell or fire
    // unauthenticated backend calls. The Express server still serves the app and /api/translate.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
