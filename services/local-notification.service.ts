import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // campos opcionais em versões recentes
    shouldShowBanner: true as any,
    shouldShowList: true as any,
  }) as any,
});

export type LocalNotificationData = Record<string, unknown>;

class LocalNotificationService {
  async register(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const asked = await Notifications.requestPermissionsAsync();
      if (!asked.granted) return false;
    }
    return true;
  }

  async sendNow(title: string, body: string, data: LocalNotificationData = {}): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
      trigger: null,
    });
  }

  async scheduleIn(seconds: number, title: string, body: string, data: LocalNotificationData = {}): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
      trigger: { seconds, channelId: 'default' },
    });
  }

  setupListeners() {
    const fg = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received (fg):', notification);
    });
    const tap = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });
    return () => {
      fg.remove();
      tap.remove();
    };
  }
}

export const localNotificationService = new LocalNotificationService();
