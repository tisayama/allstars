/**
 * Application configuration loaded from environment variables
 */

export interface AppConfig {
  firebase: {
    useEmulators: boolean;
    projectId: string;
    apiKey: string;
    authDomain: string;
    storageBucket: string;
  };
  socketServer: {
    url: string;
  };
  audio: {
    assetsBucket: string;
  };
}

/**
 * Load and validate environment variables
 * @throws Error if required environment variables are missing
 */
export function loadConfig(): AppConfig {
  const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const socketServerUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
  const audioAssetsBucket = import.meta.env.VITE_AUDIO_ASSETS_BUCKET;

  // Validate required fields
  if (!projectId) {
    throw new Error('VITE_FIREBASE_PROJECT_ID is required');
  }
  if (!apiKey) {
    throw new Error('VITE_FIREBASE_API_KEY is required');
  }
  if (!authDomain) {
    throw new Error('VITE_FIREBASE_AUTH_DOMAIN is required');
  }
  if (!storageBucket) {
    throw new Error('VITE_FIREBASE_STORAGE_BUCKET is required');
  }
  if (!audioAssetsBucket) {
    throw new Error('VITE_AUDIO_ASSETS_BUCKET is required');
  }

  return {
    firebase: {
      useEmulators,
      projectId,
      apiKey,
      authDomain,
      storageBucket,
    },
    socketServer: {
      url: socketServerUrl,
    },
    audio: {
      assetsBucket: audioAssetsBucket,
    },
  };
}

/**
 * Application configuration singleton
 */
export const config = loadConfig();
