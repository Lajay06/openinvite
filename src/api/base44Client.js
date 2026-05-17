import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { token, functionsVersion } = appParams;
const APP_ID = import.meta.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

//Create a client with authentication required
export const base44 = createClient({
  appId: APP_ID,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl: 'https://base44.app',
});
