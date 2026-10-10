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
    // Ink, DESIGN_SPEC.md's black: the native launch screen and this webview
    // background are one surface, so nothing else is ever seen behind the
    // shell before it paints (goal 7).
    backgroundColor: '#0A0A0A',
    // No link previews or pinch zoom: the shell is an app, not a page.
    allowsLinkPreview: false,
    scrollEnabled: false,
    // The web view sits under the status bar and the shell pads with
    // env(safe-area-inset-*), which viewport-fit=cover makes available.
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0A0A0A',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // The shell hides it the moment it has painted its first frame
      // (MobileShell.jsx); no minimum, a short fade.
      launchAutoHide: false,
      launchFadeOutDuration: 200,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // The native launch screen is ink, so the bar starts with light
      // content; the shell switches it to dark content as it boots (native.ts).
      style: 'DARK',
      backgroundColor: '#0A0A0A',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      // Goal 7's test notification. While the app is open iOS shows nothing
      // itself: the shell draws its own banner from the received event. On
      // the lock screen and in the notification center they show as usual.
      presentationOptions: [],
      iconColor: '#E03553',
    },
  },
};

export default config;
