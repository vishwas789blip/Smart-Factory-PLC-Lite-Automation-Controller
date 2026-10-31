import cron from 'node-cron';
import { Schedule } from '../models/Schedule';
import { AutomationExecution } from '../models/AutomationExecution';
import { Actuator } from '../models/Actuator';
import { mqttClient } from './mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from './wsService';

const activeJobs = new Map<string, any>();

export const loadSchedules = async () => {
  // Clear existing
  for (const job of activeJobs.values()) {
    job.stop();
  }
  activeJobs.clear();

  const schedules = await Schedule.find({ enabled: true });
  for (const schedule of schedules) {
    scheduleJob(schedule);
  }
};

export const scheduleJob = (schedule: any) => {
  const scheduleId = schedule._id.toString();
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId)?.stop();
    activeJobs.delete(scheduleId);
  }

  if (!schedule.enabled || !schedule.cronExpression) return;

  // Validate cron expression
  if (!cron.validate(schedule.cronExpression)) {
    console.error(`[SCHEDULE ERROR] Invalid cron expression: ${schedule.cronExpression} for schedule ${schedule.name}`);
    return;
  }

  const job = cron.schedule(schedule.cronExpression, async () => {
    try {
      const now = new Date();
      const actionsExecuted = [];
      
      for (const action of schedule.actions || []) {
        let targetDeviceId = action.deviceId;
        const actuator = await Actuator.findOne({ actuatorId: action.actuatorId });
        if (actuator) {
          targetDeviceId = actuator.deviceId;
        } else if (!targetDeviceId) {
          targetDeviceId = 'plc-001';
        }

        const commandId = uuidv4();
        const payload = {
          commandId,
          deviceId: targetDeviceId,
          actuatorId: action.actuatorId,
          command: action.command,
          value: action.value,
          timestamp: now.toISOString()
        };

        if (actuator) {
          actuator.lastCommand = action.command;
          actuator.lastCommandId = commandId;
          actuator.lastCommandStatus = 'REQUESTED';
          await actuator.save();
        }

        mqttClient.publish(getCommandTopic(targetDeviceId), JSON.stringify(payload));

        if (actuator) {
          actuator.lastCommandStatus = 'SENT';
          await actuator.save();
        }

        actionsExecuted.push(payload);
      }
      
      schedule.lastRun = now;
      await schedule.save();
      
      await AutomationExecution.create({
        automationId: schedule._id,
        triggeredAt: now,
        conditionSnapshot: { type: 'SCHEDULE', cron: schedule.cronExpression, name: schedule.name },
        actionsExecuted,
        result: 'SUCCESS'
      });

      broadcastEvent({
        type: 'automation_event',
        automationId: schedule._id,
        name: schedule.name,
        result: 'SUCCESS',
        actionsExecuted
      });
    } catch (err) {
      console.error(`[SCHEDULE ERROR] Failed executing schedule ${schedule.name}:`, err);
    }
  }, { timezone: schedule.timezone || 'UTC' });

  activeJobs.set(scheduleId, job);
};

export const deleteJob = (scheduleId: string) => {
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId)?.stop();
    activeJobs.delete(scheduleId);
  }
};
