# Índices do Firestore Necessários

## Índice para courier-shipments.tsx

A query que está causando erro:
```javascript
const q = query(
  collection(firestore, 'shipments'),
  where('state', '==', 'CREATED'),
  orderBy('createdAt', 'asc')
);
```

### Solução 1: Criar índice no Firebase Console
1. Acesse: https://console.firebase.google.com/v1/r/project/p-a-p-8ab90/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9wLWEtcC04YWI5MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc2hpcG1lbnRzL2luZGV4ZXMvXxABGgkKBXN0YXRlEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ
2. Clique em "Create Index"

### Solução 2: Usar firestore.indexes.json
Criar arquivo `firestore.indexes.json` na raiz do projeto:

```json
{
  "indexes": [
    {
      "collectionGroup": "shipments",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "state",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

### Solução 3: Modificar query para não precisar de índice
Remover o `orderBy` e ordenar no cliente:

```javascript
const q = query(
  collection(firestore, 'shipments'),
  where('state', '==', 'CREATED')
);
// Ordenar no cliente após receber os dados
```
