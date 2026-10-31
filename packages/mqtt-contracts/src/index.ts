export const getTelemetryTopic = (deviceId: string) => `factory/${deviceId}/telemetry`;
export const getCommandTopic = (deviceId: string) => `factory/${deviceId}/command`;
export const getConfigTopic = (deviceId: string) => `factory/${deviceId}/config`;
export const getStatusTopic = (deviceId: string) => `factory/${deviceId}/status`;
export const getSensorTopic = (deviceId: string, sensorId: string) => `factory/${deviceId}/sensors/${sensorId}`;
export const getActuatorTopic = (deviceId: string, actuatorId: string) => `factory/${deviceId}/actuators/${actuatorId}`;
export const getAutomationEventsTopic = (deviceId: string) => `factory/${deviceId}/automation-events`;
export const getAlertsTopic = (deviceId: string) => `factory/${deviceId}/alerts`;

// Topic pattern matchers for subscriptions
export const TELEMETRY_SUBSCRIPTION = 'factory/+/telemetry';
export const STATUS_SUBSCRIPTION = 'factory/+/status';
export const ACTUATOR_SUBSCRIPTION = 'factory/+/actuators/+';
export const COMMAND_SUBSCRIPTION = 'factory/+/command';

export const extractDeviceIdFromTopic = (topic: string): string | null => {
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'factory') {
    return parts[1];
  }
  return null;
};

export const extractActuatorIdFromTopic = (topic: string): string | null => {
  const parts = topic.split('/');
  if (parts.length >= 4 && parts[0] === 'factory' && parts[2] === 'actuators') {
    return parts[3];
  }
  return null;
};
