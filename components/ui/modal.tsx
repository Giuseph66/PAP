import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { Button } from './button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, title, children, style }: ModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }, style]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </RNModal>
  );
}

interface CallMessageModalProps {
  visible: boolean;
  onClose: () => void;
  phoneNumber: string;
  onCallPress: () => void;
  onMessagePress: () => void;
}

export function CallMessageModal({ 
  visible, 
  onClose, 
  phoneNumber,
  onCallPress,
  onMessagePress
}: CallMessageModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Contato"
      style={styles.callMessageModal}
    >
      <Text style={[styles.questionText, { color: colors.text }]}>Deseja ligar ou enviar mensagem via WhatsApp?</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Ligar"
          onPress={onCallPress}
          variant="primary"
          icon={<MaterialIcons name="phone" size={16} color="#fff" />}
          style={styles.button}
        />
        <Button
          title="WhatsApp"
          onPress={onMessagePress}
          variant="secondary"
          icon={<MaterialIcons name="message" size={16} color="#fff" />}
          style={styles.button}
        />
      </View>
    </Modal>
  );
}

interface AbandonRideModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function AbandonRideModal({ 
  visible, 
  onClose,
  onSubmit
}: AbandonRideModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim().length > 0) {
      onSubmit(reason);
      setReason('');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Abandonar Corrida"
      style={styles.abandonRideModal}
    >
      <Text style={[styles.questionText, { color: colors.text }]}>
        Por favor, explique o motivo pelo qual deseja abandonar esta corrida:
      </Text>
      <TextInput
        style={[styles.textInput, { 
          backgroundColor: colors.background, 
          borderColor: colors.border,
          color: colors.text
        }]}
        value={reason}
        onChangeText={setReason}
        placeholder="Digite o motivo aqui..."
        placeholderTextColor={colors.tabIconDefault}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <View style={styles.buttonRow}>
        <Button
          title="Cancelar"
          onPress={onClose}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Confirmar"
          onPress={handleSubmit}
          variant="danger"
          disabled={reason.trim().length === 0}
          style={styles.actionButton}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  callMessageModal: {
    padding: 0,
  },
  abandonRideModal: {
    padding: 0,
  },
  questionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  button: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  }
});