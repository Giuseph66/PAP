import { authService } from '@/services/auth.service';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function AppIndexGate() {
  useEffect(() => {
    const userData = authService.getSession();
    console.log('userDataaaaaaaaaa', userData);
    if (userData?.role === 'courier') {
      router.replace('/(tabs)/courier/courier-home');
    } else {
      router.replace('/(tabs)/cliente/business-home');
    } 
  }, []);

  return null;
}


