# Dependências Adicionais

Para completar a implementação do NeoArchitect Courier, você precisará instalar as seguintes dependências:

## Firebase
```bash
npm install firebase
```

## Localização e Mapas
```bash
npx expo install expo-location
npm install @react-native-google-maps/maps
```

## Notificações
```bash
npx expo install expo-notifications
```

## Storage Local
```bash
npx expo install expo-secure-store expo-sqlite
```

## Câmera e Imagens
```bash
npx expo install expo-image-picker expo-media-library
```

## Utilitários
```bash
npm install @tanstack/react-query zustand
npm install date-fns
```

## Desenvolvimento
```bash
npm install -D @types/node
```

## Configuração EAS (Build)
```bash
npm install -g @expo/cli
npx eas init
```

## Scripts Úteis

Adicione ao seu `package.json`:

```json
{
  "scripts": {
    "dev": "expo start --dev-client",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios"
  }
}
```

## Próximos Passos

1. **Configurar Firebase**:
   - Criar projeto no Firebase Console
   - Configurar Authentication (Phone, Email)
   - Criar databases (Firestore + Realtime)
   - Configurar Storage e Messaging

2. **Implementar Cloud Functions**:
   - Função para pagamentos PIX
   - Função para matching de entregadores
   - Webhooks de pagamento

3. **Testes**:
   - Configurar Detox para E2E
   - Testes unitários com Jest
   - Testes de integração

4. **Deploy**:
   - Configurar EAS Build
   - Deploy web no Firebase Hosting
   - Publicação nas lojas (Play Store, App Store)
