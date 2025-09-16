module.exports = {
  // Configurações para react-native-worklets
  worklets: {
    // Habilitar worklets apenas em produção para evitar problemas de desenvolvimento
    enabled: process.env.NODE_ENV === 'production',
  },
};
