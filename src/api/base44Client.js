import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { token, functionsVersion } = appParams;
const APP_ID = import.meta.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

// In production (Vercel), route all base44 API calls through the same-origin Vercel
// proxy rewrite (/api/apps/* → https://base44.app/api/apps/*) to avoid cross-origin
// CORS failures. In development, use direct connection to base44.app (CORS allowed
// for localhost by base44).
const serverUrl = import.meta.env.PROD ? '' : undefined;

export const base44 = createClient({
  appId: APP_ID,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl: 'https://base44.app',
  serverUrl,
});
