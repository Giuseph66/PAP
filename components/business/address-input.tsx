import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AddressRef } from '@/types';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddressSuggestion {
  id: string;
  description: string;
  lat: number;
  lng: number;
}

interface AddressInputProps {
  label: string;
  value?: AddressRef;
  onSelect: (address: AddressRef) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  savedAddresses?: AddressRef[];
}

export function AddressInput({
  label,
  value,
  onSelect,
  placeholder = 'Digite o endereço...',
  error,
  required = false,
  savedAddresses = [],
}: AddressInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [searchText, setSearchText] = useState(value?.endereco || '');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock geocoding function - replace with actual service
  const searchAddresses = useCallback(async (query: string): Promise<AddressSuggestion[]> => {
    if (query.length < 3) return [];

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockResults: AddressSuggestion[] = [
      {
        id: '1',
        description: `${query}, São Paulo - SP, Brasil`,
        lat: -23.5505,
        lng: -46.6333,
      },
      {
        id: '2',
        description: `Rua ${query}, Centro, São Paulo - SP`,
        lat: -23.5489,
        lng: -46.6388,
      },
      {
        id: '3',
        description: `Avenida ${query}, Paulista, São Paulo - SP`,
        lat: -23.5614,
        lng: -46.6562,
      },
    ];
    
    setIsLoading(false);
    return mockResults;
  }, []);

  const handleSearchChange = useCallback(async (text: string) => {
    setSearchText(text);
    
    if (text.length >= 3) {
      const results = await searchAddresses(text);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, [searchAddresses]);

  const handleAddressSelect = (address: AddressSuggestion | AddressRef) => {
    const selectedAddress: AddressRef = {
      id: address.id,
      label: 'endereco' in address ? address.label : 'Endereço',
      lat: address.lat,
      lng: address.lng,
      endereco: 'endereco' in address ? address.endereco : address.description,
    };
    
    setSearchText(selectedAddress.endereco);
    onSelect(selectedAddress);
    setIsModalVisible(false);
    setSuggestions([]);
  };

  const openModal = () => {
    setIsModalVisible(true);
    if (searchText.length >= 3) {
      searchAddresses(searchText).then(setSuggestions);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={openModal}>
        <Input
          label={label}
          value={searchText}
          placeholder={placeholder}
          error={error}
          required={required}
          editable={false}
          pointerEvents="none"
          leftIcon={
            <IconSymbol name="location.circle.fill" size={20} color={colors.tint} />
          }
          rightIcon={
            <IconSymbol name="chevron.down" size={16} color={colors.tabIconDefault} />
          }
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecionar Endereço
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Input
            placeholder={placeholder}
            value={searchText}
            onChangeText={handleSearchChange}
            leftIcon={
              <IconSymbol name="magnifyingglass" size={20} color={colors.tabIconDefault} />
            }
            containerStyle={styles.searchInput}
          />

          {isLoading && <Loading text="Buscando endereços..." />}

          <FlatList
            data={[
              ...savedAddresses.map(addr => ({ ...addr, isSaved: true })),
              ...suggestions.map(addr => ({ ...addr, isSaved: false })),
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleAddressSelect(item)}
                style={styles.suggestionItem}
              >
                <Card style={styles.suggestionCard}>
                  <View style={styles.suggestionContent}>
                    <IconSymbol
                      name={item.isSaved ? 'bookmark.fill' : 'location.circle'}
                      size={20}
                      color={item.isSaved ? colors.tint : colors.tabIconDefault}
                    />
                    <View style={styles.suggestionText}>
                      <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                        {'endereco' in item ? item.endereco : item.description}
                      </Text>
                      {item.isSaved && (
                        <Text style={[styles.suggestionLabel, { color: colors.tint }]}>
                          Endereço Salvo • {item.label}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              !isLoading && searchText.length >= 3 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                    Nenhum endereço encontrado
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  searchInput: {
    marginHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  suggestionItem: {
    marginBottom: 8,
  },
  suggestionCard: {
    padding: 12,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
