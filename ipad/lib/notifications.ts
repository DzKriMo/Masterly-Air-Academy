import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'ios') {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync();
    return tokenData;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c4943c',
    });
  }

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync();
  return tokenData;
}

export function addNotificationListeners(
  onReceive: (notification: Notifications.Notification) => void,
  onInteraction: (response: Notifications.NotificationResponse) => void,
): { removeReceive: () => void; removeInteraction: () => void } {
  const receiveSub = Notifications.addNotificationReceivedListener(onReceive);
  const interactionSub = Notifications.addNotificationResponseReceivedListener(onInteraction);

  return {
    removeReceive: () => receiveSub.remove(),
    removeInteraction: () => interactionSub.remove(),
  };
}
