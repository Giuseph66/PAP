import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/auth.service';
import { shipmentFirestoreService } from '@/services/shipment-firestore.service';
import { CourierOffer, Shipment } from '@/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface OfferModalProps {
  visible: boolean;
  shipment: Shipment | null;
  onClose: () => void;
  onOfferSubmitted: (offer: CourierOffer) => void;
}

export default function OfferModal({ visible, shipment, onClose, onOfferSubmitted }: OfferModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [offeredPrice, setOfferedPrice] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log('🎯 OfferModal renderizado:', { visible, shipment: !!shipment });

  if (!shipment) return null;

  const originalPrice = shipment.quote.preco;
  const priceDifference = offeredPrice ? parseFloat(offeredPrice) - originalPrice : 0;
  const percentageChange = originalPrice > 0 ? (priceDifference / originalPrice) * 100 : 0;

  const handleSubmitOffer = async () => {
    if (!offeredPrice || parseFloat(offeredPrice) <= 0) {
      Alert.alert('Erro', 'Digite um valor válido para sua oferta');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await authService.getSession();
      if (!session) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const offer: CourierOffer = {
        courierUid: session.userId,
        courierName: 'Entregador', // TODO: Buscar nome do entregador
        offeredPrice: parseFloat(offeredPrice),
        message: message.trim() || undefined,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      };

      // Adiciona oferta ao envio
      const currentOffers = shipment.offers || [];
      const updatedOffers = [...currentOffers, offer];

      await shipmentFirestoreService.updateShipmentState(shipment.id, 'COUNTER_OFFER', {
        offers: updatedOffers,
        currentOffer: offer
      });

      // Adiciona evento à timeline
      await shipmentFirestoreService.addTimelineEvent(shipment.id, {
        tipo: 'COUNTER_OFFER_MADE',
        descricao: `Entregador fez contra-oferta de R$ ${offer.offeredPrice.toFixed(2)}`,
        payload: {
          courierUid: session.userId,
          offeredPrice: offer.offeredPrice,
          originalPrice: originalPrice,
          message: offer.message
        }
      });

      Alert.alert(
        'Oferta Enviada!',
        'Sua oferta foi enviada para o cliente. Aguarde a resposta.',
        [{ text: 'OK', onPress: onClose }]
      );

      onOfferSubmitted(offer);
    } catch (error) {
      console.error('Error submitting offer:', error);
      Alert.alert('Erro', 'Falha ao enviar oferta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriceChangeColor = () => {
    if (priceDifference > 0) return '#4CAF50'; // Verde para aumento
    if (priceDifference < 0) return '#FF9800'; // Laranja para redução
    return colors.tabIconDefault; // Neutro para igual
  };

  const getPriceChangeIcon = () => {
    if (priceDifference > 0) return 'trending-up';
    if (priceDifference < 0) return 'trending-down';
    return 'trending-flat';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Fazer Oferta
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.shipmentCard}>
            <Text style={[styles.shipmentTitle, { color: colors.text }]}>
              Detalhes da Entrega
            </Text>
            
            <View style={styles.shipmentInfo}>
              <View style={styles.infoRow}>
                <MaterialIcons name="place" size={20} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {shipment.pickup.endereco}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {shipment.dropoff.endereco}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="local-shipping" size={20} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {shipment.pacote.pesoKg}kg • {shipment.quote.distKm.toFixed(1)}km
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.offerCard}>
            <Text style={[styles.offerTitle, { color: colors.text }]}>
              Sua Oferta
            </Text>
            
            <View style={styles.priceSection}>
              <Text style={[styles.originalPriceLabel, { color: colors.tabIconDefault }]}>
                Preço Original:
              </Text>
              <Text style={[styles.originalPrice, { color: colors.text }]}>
                R$ {originalPrice.toFixed(2)}
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Seu Valor:
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={[styles.currencySymbol, { color: colors.tabIconDefault }]}>R$</Text>
                <Input
                  placeholder="0,00"
                  value={offeredPrice}
                  onChangeText={setOfferedPrice}
                  keyboardType="decimal-pad"
                  containerStyle={styles.priceInput}
                />
              </View>
              
              {offeredPrice && (
                <View style={styles.priceChangeContainer}>
                  <MaterialIcons 
                    name={getPriceChangeIcon()} 
                    size={16} 
                    color={getPriceChangeColor()} 
                  />
                  <Text style={[styles.priceChangeText, { color: getPriceChangeColor() }]}>
                    {priceDifference > 0 ? '+' : ''}R$ {priceDifference.toFixed(2)} 
                    ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.messageSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Mensagem (opcional):
              </Text>
              <Input
                placeholder="Explique por que está fazendo esta oferta..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                containerStyle={styles.messageInput}
              />
            </View>

            <View style={styles.tipsContainer}>
              <MaterialIcons name="lightbulb" size={16} color={colors.tint} />
              <Text style={[styles.tipsText, { color: colors.tabIconDefault }]}>
                Dica: Ofereça um valor competitivo para aumentar suas chances de conseguir a entrega
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button
            title="Enviar Oferta"
            onPress={handleSubmitOffer}
            loading={isSubmitting}
            disabled={!offeredPrice || isSubmitting}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  shipmentCard: {
    marginBottom: 20,
  },
  shipmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  shipmentInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  offerCard: {
    marginBottom: 20,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  originalPriceLabel: {
    fontSize: 14,
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    marginTop: 0,
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  priceChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageSection: {
    marginBottom: 20,
  },
  messageInput: {
    marginTop: 0,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  tipsText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
