import { z } from 'zod';
import { ActuatorCommand, MachineState, DeviceType } from '@smart-factory/shared-types';

export const machineDataSchema = z.object({
  id: z.string(),
  state: z.nativeEnum(MachineState),
  rpm: z.number(),
  temperature: z.number(),
  vibration: z.number(),
  current: z.number(),
  power: z.number(),
  runtimeSeconds: z.number()
});

export const telemetryPayloadSchema = z.object({
  deviceId: z.string(),
  timestamp: z.string().datetime(),
  sequence: z.number(),
  source: z.string(),
  electrical: z.object({
    voltage: z.number(),
    current: z.number(),
    power: z.number(),
    powerFactor: z.number(),
    energy: z.number()
  }),
  environment: z.object({
    temperature: z.number(),
    humidity: z.number(),
    smoke: z.number(),
    gas: z.number()
  }),
  people: z.object({
    count: z.number()
  }),
  machines: z.array(machineDataSchema)
});

export const commandPayloadSchema = z.object({
  commandId: z.string(),
  deviceId: z.string(),
  actuatorId: z.string(),
  command: z.nativeEnum(ActuatorCommand),
  value: z.number().optional(),
  duration: z.number().optional(),
  timestamp: z.string().datetime()
});

export const deviceRegistrationSchema = z.object({
  deviceId: z.string(),
  type: z.nativeEnum(DeviceType),
  capabilities: z.object({
    sensors: z.array(z.string()),
    actuators: z.array(z.string())
  })
});

// Infer types
export type ValidatedTelemetry = z.infer<typeof telemetryPayloadSchema>;
export type ValidatedCommand = z.infer<typeof commandPayloadSchema>;
export type ValidatedRegistration = z.infer<typeof deviceRegistrationSchema>;
