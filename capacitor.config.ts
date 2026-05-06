import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.ezygoataxiservices.app',
  appName: 'EzyGoa',
  webDir: 'www/browser',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4b2aad',
      showSpinner: false,
    },
  },
};

export default config;
