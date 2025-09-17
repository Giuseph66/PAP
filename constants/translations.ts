// Dicionário de traduções para termos técnicos
export const Translations = {
  // Estados de navegação
  pickup: 'Coleta',
  dropoff: 'Entrega',
  destination: 'Destino',
  
  // Status da corrida
  navigating_to_pickup: 'Navegando para coleta',
  arrived_at_pickup: 'Chegou na coleta',
  navigating_to_destination: 'Navegando para entrega',
  completed: 'Finalizada',
  
  // Labels da interface
  pickup_label: 'Coleta',
  destination_label: 'Entrega',
  pickup_contact: 'Quem vai entregar',
  destination_contact: 'Quem vai receber',
  
  // Botões e ações
  arrived_at_pickup_button: 'Cheguei na Coleta',
  start_trip_button: 'Iniciar Entrega',
  complete_trip_button: 'Finalizar Entrega',
  
  // Status badges
  pickup_badge: 'COLETA',
  waiting_badge: 'AGUARDANDO',
  delivery_badge: 'ENTREGA',
  completed_badge: 'FINALIZADA',
  
  // ETA labels
  going_to_pickup: 'INDO para coleta:',
  going_to_destination: 'INDO para entrega:',
  waiting_for_pickup: 'Aguardando entrega do produto',
  trip_completed: 'Entrega finalizada',
  
  // Proximidade
  near_pickup: '✅ Próximo da coleta',
  near_destination: '✅ Próximo da entrega',
  distance_to_pickup: 'm da coleta',
  distance_to_destination: 'm da entrega',
  
  // Alertas
  too_far_pickup: 'Muito Longe da Coleta',
  too_far_destination: 'Muito Longe da Entrega',
  arrived_pickup_title: 'Chegou na coleta',
  arrived_pickup_message: 'Você chegou no ponto de coleta. Aguarde o cliente entregar o produto.',
  trip_completed_title: 'Entrega Finalizada',
  trip_completed_message: 'Entrega concluída com sucesso!',
  
  // Instruções
  pickup_instructions: 'Instruções da coleta',
  destination_instructions: 'Instruções da entrega',
  
  // Status para timeline (português)
  ride_status_navigating_to_pickup: 'Navegando para coleta',
  ride_status_arrived_at_pickup: 'Chegou na coleta',
  ride_status_navigating_to_destination: 'Navegando para entrega',
  ride_status_completed: 'Entrega finalizada',
} as const;

export type TranslationKey = keyof typeof Translations;
