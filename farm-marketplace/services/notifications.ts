import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

// Configure how notifications are shown when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Returns true if the app is running inside Expo Go.
 * Remote push notifications are NOT supported in Expo Go since SDK 53.
 * They only work in custom development builds or production APK/IPA builds.
 */
function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Requests push notification permissions and retrieves the Expo Push Token.
 * Safely skips in Expo Go, on Web, and on simulators.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Web is not supported
  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications are not supported on Web.');
    return null;
  }

  // Expo Go (SDK 53+) does not support remote push notifications.
  // Skip gracefully so the rest of the app continues to function.
  if (isRunningInExpoGo()) {
    console.log(
      '[Notifications] Running in Expo Go — remote push notifications are disabled since SDK 53. ' +
        'Build a development build (npx expo run:android) to test push notifications.'
    );
    return null;
  }

  // Push notifications require a physical device
  if (!Device.isDevice) {
    console.log('[Notifications] Running on simulator/emulator — push notifications skipped.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission denied by the user.');
      return null;
    }

    // Retrieve the EAS project ID from app.json config
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        '[Notifications] No EAS projectId found. ' +
          'Add extra.eas.projectId to your app.json to enable push notifications.'
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Notifications] Push token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Failed to retrieve Expo push token:', error);
    return null;
  }
}

/**
 * Sends the device push token to the backend for storage against the current user.
 */
export async function savePushToken(token: string): Promise<void> {
  try {
    const response = await api.put('/users/push-token', { pushToken: token });
    if (response.data.success) {
      console.log('[Notifications] Push token successfully registered to backend.');
    }
  } catch (error) {
    console.error('[Notifications] Failed to save push token to backend:', error);
  }
}
