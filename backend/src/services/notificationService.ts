import User from '../models/User';

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushToken) {
      console.log(`[Push Notification] Skipped: User ${userId} has no registered push token.`);
      return false;
    }

    if (!user.pushToken.startsWith('ExponentPushToken[')) {
      console.warn(`[Push Notification] Invalid token format for user ${userId}: ${user.pushToken}`);
      return false;
    }

    console.log(`[Push Notification] Sending to User: ${user.name} (${userId})`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    const resData = await response.json();
    console.log('[Push Notification] Expo response:', resData);
    return true;
  } catch (error) {
    console.error('[Push Notification] Error sending notification:', error);
    return false;
  }
};
