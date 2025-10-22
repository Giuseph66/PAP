import { Button } from '@/components/ui/button';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Config canal Android
Notifications.setNotificationChannelAsync('default', {
  name: 'Padrão',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
});

async function requestPermissionsAsync() {
  if (!Constants.isDevice) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return asked.status === 'granted';
  }
  return true;
}

async function scheduleLocalPush(seconds: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste de Notificação',
      body: `Esta notificação foi agendada para ${seconds}s`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { seconds, channelId: 'default' },
  });
}

export function TestNotification() {
  const [granted, setGranted] = React.useState<boolean | null>(null);
  const [countdown, setCountdown] = React.useState(10);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const ok = await requestPermissionsAsync();
      setGranted(ok);
    })();
  }, []);

  React.useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    if (running && countdown > 0) {
      t = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    if (running && countdown === 0) {
      setRunning(false);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [running, countdown]);

  const handleStart = async () => {
    if (!granted) {
      const ok = await requestPermissionsAsync();
      setGranted(ok);
      if (!ok) return;
    }
    setCountdown(10);
    setRunning(true);
    await scheduleLocalPush(10);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teste de Notificações (Local)</Text>
      <Text style={styles.subtitle}>
        Feche o app após iniciar. Você deve receber a notificação em 10s.
      </Text>
      <Text style={styles.status}>
        Permissão: {granted === null ? '...' : granted ? 'Concedida' : 'Negada'}
      </Text>
      <Text style={styles.timer}>Timer: {running ? countdown : '-'}</Text>
      <Button title={running ? 'Aguardando...' : 'Iniciar teste (10s)'} onPress={handleStart} disabled={running} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12, opacity: 0.8 },
  status: { fontSize: 12 },
  timer: { fontSize: 24, fontWeight: 'bold' },
});


