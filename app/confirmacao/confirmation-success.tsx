import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConfirmationSuccessScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleContinue = () => {
    // Navigate back to main app screen
    router.replace('/(tabs)/cliente/business-home');
  };

  const handleViewDeliveryStatus = () => {
    // Navigate to shipment details screen
    router.push('/(tabs)/cliente/company-stats');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Confirmação</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={styles.content}>
        <Card style={styles.successCard}>
          <MaterialIcons 
            name="check-circle" 
            size={80} 
            color="#10b981" 
            style={styles.icon} 
          />
          
          <Text style={[styles.title, { color: colors.text }]}>
            Entrega Confirmada!
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A entrega foi registrada com sucesso no sistema
          </Text>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="local-shipping" size={24} color={colors.text} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Entrega Confirmada</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={24} color={colors.text} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Data:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={24} color={colors.text} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Hora:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button 
            onPress={handleViewDeliveryStatus}
            variant="secondary"
            style={styles.button}
          >
            <MaterialIcons name="receipt-long" size={20} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Ver Status da Entrega</Text>
          </Button>
          
          <Button 
            onPress={handleContinue}
            style={styles.button}
          >
            <MaterialIcons name="home" size={20} color="white" />
            <Text style={styles.buttonText}>Voltar para Início</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 40,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  icon: {
    alignSelf: 'center',
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});