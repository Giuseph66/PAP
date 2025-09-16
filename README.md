# NeoArchitect Courier - Firebase-first Delivery App

Sistema de entrega ponto-a-ponto sob demanda construído com React Native, Expo e Firebase.

## 🚀 Características

- **Firebase-first**: Sem servidor próprio, apenas Cloud Functions serverless
- **Apps Mobile**: Cliente e Entregador (React Native + Expo + TypeScript)
- **Tempo Real**: Rastreamento de localização e status via Firebase Realtime Database
- **Pagamentos**: Integração PIX via Cloud Functions
- **Offline**: Cache local com SQLite e Firestore offline

## 📱 Apps

- **Cliente**: Criar envios, pagamentos, rastreamento
- **Entregador**: Receber ofertas, realizar entregas, ganhos
- **Admin Web**: Console administrativo (Firebase Hosting)

## 🛠 Tecnologias

### Frontend
- React Native + Expo + TypeScript
- Expo Router (file-based routing)
- Firebase SDK (Auth, Firestore, Realtime DB, Storage)
- Expo Location, Notifications, Secure Store

### Backend
- Firebase Auth (Phone OTP, Email/Password)
- Firestore (dados principais)
- Realtime Database (localização, presença)
- Cloud Storage (fotos, documentos)
- Cloud Functions (pagamentos, matching)
- Cloud Messaging (push notifications)

## 📦 Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd PAP
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o Firebase**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com)
   - Ative Authentication, Firestore, Realtime Database, Storage
   - Baixe os arquivos de configuração:
     - `google-services.json` (Android)
     - `GoogleService-Info.plist` (iOS)

4. **Configure as variáveis de ambiente**
   ```bash
   # Crie um arquivo .env na raiz do projeto
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com/
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF
   ```

5. **Inicie o desenvolvimento**
   ```bash
   npx expo start
   ```

## 🏗 Estrutura do Projeto

```
PAP/
├── app/                    # Telas (Expo Router)
│   ├── (tabs)/            # Navegação principal
│   ├── auth/              # Autenticação
│   ├── courier/           # Telas do entregador
│   └── create-shipment.tsx
├── components/            # Componentes reutilizáveis
│   ├── ui/               # Componentes base
│   └── business/         # Componentes de negócio
├── config/               # Configurações
│   └── firebase.ts       # Setup Firebase
├── services/             # Lógica de negócio
│   ├── auth.service.ts
│   ├── shipment.service.ts
│   └── location.service.ts
├── types/                # Definições TypeScript
└── constants/            # Constantes e temas
```

## 🔥 Configuração Firebase

### 1. Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, update: if request.auth.uid == uid;
      allow create: if request.auth != null;
    }
    match /shipments/{id} {
      allow create: if request.auth != null && 
        request.resource.data.clienteUid == request.auth.uid;
      allow read: if resource.data.clienteUid == request.auth.uid || 
        resource.data.courierUid == request.auth.uid;
      allow update: if request.auth.uid == resource.data.clienteUid || 
        request.auth.uid == resource.data.courierUid;
    }
  }
}
```

### 2. Realtime Database Rules
```json
{
  "rules": {
    "courierLocations": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### 3. Índices Firestore
```json
{
  "indexes": [
    {
      "collectionGroup": "shipments",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "clienteUid", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "shipments",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "state", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

## 🚚 Fluxo de Entrega

1. **Cliente cria envio** → Estado: `CREATED`
2. **Sistema calcula preço** → Estado: `PRICED`
3. **Cliente confirma e paga** → Estado: `PAYMENT_PENDING` → `PAID`
4. **Sistema busca entregadores** → Estado: `DISPATCHING`
5. **Entregador aceita** → Estado: `ASSIGNED`
6. **Entregador chega na coleta** → Estado: `ARRIVED_PICKUP`
7. **Pacote coletado** → Estado: `PICKED_UP`
8. **Em trânsito** → Estado: `EN_ROUTE`
9. **Chegada na entrega** → Estado: `ARRIVED_DROPOFF`
10. **Entregue** → Estado: `DELIVERED`

## 🔐 Autenticação

- **Phone OTP**: Código via SMS (produção)
- **Email/Password**: Login tradicional
- **Roles**: `cliente`, `courier`, `admin`

## 📍 Localização

- **Rastreamento em tempo real** via Realtime Database
- **Geohash** para busca eficiente de entregadores próximos
- **ETA dinâmico** baseado na localização atual

## 💳 Pagamentos

- **PIX**: Via Cloud Functions (segredos protegidos)
- **Webhooks**: Confirmação automática de pagamento
- **Payouts**: Transferência para entregadores

## 📱 Funcionalidades por App

### App Cliente
- ✅ Criar envios com endereços
- ✅ Calcular cotações
- ✅ Pagamento PIX
- ✅ Rastreamento em tempo real
- ✅ Chat com entregador
- ✅ Histórico de envios

### App Entregador
- ✅ Toggle online/offline
- ✅ Receber ofertas de entrega
- ✅ Navegação GPS
- ✅ Checkpoints de entrega
- ✅ Ganhos e extratos
- ✅ Avaliações

## 🧪 Desenvolvimento

```bash
# Executar no iOS
npx expo start --ios

# Executar no Android  
npx expo start --android

# Executar na web
npx expo start --web

# Build de produção
eas build --platform all
```

## 📚 Documentação Adicional

- [Plano Completo](./passos.json) - Roadmap detalhado com 16 passos
- [Firebase Setup](https://firebase.google.com/docs/web/setup)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/docs/getting-started)

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte, entre em contato através dos issues do GitHub.# PAP
