import { Button } from '@/components/ui/button';
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

async function ensurePermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted;
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

async function presentImmediatePush() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste Imediato',
      body: 'Notificação enviada agora',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });
}

export function TestNotification() {
  const [granted, setGranted] = React.useState<boolean | null>(null);
  const [countdown, setCountdown] = React.useState(10);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const ok = await ensurePermissions();
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

  const handleImmediate = async () => {
    const ok = await ensurePermissions();
    setGranted(ok);
    if (!ok) return;
    await presentImmediatePush();
  };

  const handleDelayed = async () => {
    const ok = await ensurePermissions();
    setGranted(ok);
    if (!ok) return;
    setCountdown(10);
    setRunning(true);
    await scheduleLocalPush(10);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teste de Notificações (Local)</Text>
      <Text style={styles.subtitle}>
        Feche o app após iniciar o teste de 10s. Você deve receber a notificação.
      </Text>
      <Text style={styles.status}>
        Permissão: {granted === null ? '...' : granted ? 'Concedida' : 'Negada'}
      </Text>
      <Text style={styles.timer}>Timer: {running ? countdown : '-'}</Text>
      <View style={styles.row}>
        <Button title={'Teste imediato'} onPress={handleImmediate} />
        <Button title={running ? 'Aguardando...' : 'Teste em 10s'} onPress={handleDelayed} disabled={running} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 16, fontWeight: '600' ,color: 'white' },
  subtitle: { fontSize: 12, opacity: 0.8 ,color: 'white' },
  status: { fontSize: 12 ,color: 'white' },
  timer: { fontSize: 24, fontWeight: 'bold' ,color: 'white'},
  row: { flexDirection: 'row', gap: 12 , color: 'white'}, 
});


