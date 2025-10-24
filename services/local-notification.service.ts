import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true as any,
    shouldShowList: true as any,
  }) as any,
});

export type LocalNotificationData = Record<string, unknown>;

class LocalNotificationService {
  async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  }

  async register(): Promise<boolean> {
    await this.ensureAndroidChannel();

    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const asked = await Notifications.requestPermissionsAsync();
      if (!asked.granted) return false;
    }
    return true;
  }

  async sendNow(title: string, body: string, data: LocalNotificationData = {}): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    });
  }

  async scheduleIn(seconds: number, title: string, body: string, data: LocalNotificationData = {}): Promise<void> {
    const secs = Math.max(5, Math.floor(seconds));
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secs,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    } as Notifications.NotificationTriggerInput;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger,
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
