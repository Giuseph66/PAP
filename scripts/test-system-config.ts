import { systemConfigService } from '@/services/system-config.service';

// Test the system configuration service
async function testSystemConfigService() {
  console.log('Testing System Configuration Service...');
  
  try {
    // Load configuration
    const config = await systemConfigService.loadConfig();
    console.log('Loaded config:', config);
    
    // Test pricing configuration
    const pricingConfig = systemConfigService.getPricingConfig();
    console.log('Pricing config:', pricingConfig);
    
    // Test notification configuration
    const notificationConfig = systemConfigService.getNotificationConfig();
    console.log('Notification config:', notificationConfig);
    
    // Test shipment configuration
    const shipmentConfig = systemConfigService.getShipmentConfig();
    console.log('Shipment config:', shipmentConfig);
    
    console.log('System Configuration Service test completed successfully!');
  } catch (error) {
    console.error('Error testing System Configuration Service:', error);
  }
}

// Run the test
testSystemConfigService();