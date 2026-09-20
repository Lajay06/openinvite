import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The Openinvite couple app. The web build in dist/ is bundled into the
 * native project; the app never points at the live URL, so a release is a
 * store build, not a deploy. Start path is handled in src/App.jsx: when the
 * shell runs natively, "/" sends the couple to /m.
 */
const config: CapacitorConfig = {
  appId: 'au.com.openinvite.app',
  appName: 'Openinvite',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#F5F5F4',
    // The web view sits under the status bar and the shell pads with
    // env(safe-area-inset-*), which viewport-fit=cover makes available.
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#F5F5F4',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#F5F5F4',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F5F5F4',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
