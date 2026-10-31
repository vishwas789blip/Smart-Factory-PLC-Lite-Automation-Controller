import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { Actuator } from '../models/Actuator';
import { mqttClient } from './mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from './wsService';

const getDotPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => (acc !== undefined && acc !== null ? acc[part] : undefined), obj);
};

const evaluateConditionNode = (node: any, telemetry: any): boolean => {
  if (!node) return true;
  if (node.type === 'AND') {
    return (node.children || []).every((child: any) => evaluateConditionNode(child, telemetry));
  }
  if (node.type === 'OR') {
    return (node.children || []).some((child: any) => evaluateConditionNode(child, telemetry));
  }
  if (node.type === 'NOT') {
    return !evaluateConditionNode(node.child || node.children?.[0], telemetry);
  }
  
  // LEAF node
  const val = getDotPath(telemetry, node.metric);
  if (val === undefined || val === null) return false;
  
  switch (node.operator) {
    case '=': return val == node.value;
    case '!=': return val != node.value;
    case '>': return val > node.value;
    case '>=': return val >= node.value;
    case '<': return val < node.value;
    case '<=': return val <= node.value;
    default: return false;
  }
};

export const evaluateAutomations = async (telemetry: any) => {
  try {
    const automations = await Automation.find({ enabled: true, triggerType: 'TELEMETRY' });
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);

    for (const auto of automations) {
      // 1. Cooldown check (in-memory)
      if (auto.lastExecutedAt && (now.getTime() - auto.lastExecutedAt.getTime()) < (auto.cooldownSeconds * 1000)) {
        continue;
      }
      
      // 2. Evaluate AST (in-memory condition check, zero I/O)
      const isTriggered = evaluateConditionNode(auto.conditions, telemetry);
      if (!isTriggered) {
        continue;
      }

      // 3. Rate limit check (database I/O, only if condition passed)
      const executionsInLastHour = await AutomationExecution.countDocuments({
        automationId: auto._id,
        triggeredAt: { $gte: hourAgo }
      });
      
      if (executionsInLastHour >= auto.maxExecutionsPerHour) {
        continue;
      }
      
      const actionsExecuted = [];
        
        for (const action of auto.actions) {
          // Look up actuator to determine real target device
          let targetDeviceId = action.deviceId;
          const actuator = await Actuator.findOne({ actuatorId: action.actuatorId });
          if (actuator) {
            targetDeviceId = actuator.deviceId;
          } else if (!targetDeviceId) {
            targetDeviceId = telemetry.deviceId;
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
        
        auto.lastExecutedAt = now;
        await auto.save();
        
        await AutomationExecution.create({
          automationId: auto._id,
          triggeredAt: now,
          conditionSnapshot: auto.conditions,
          actionsExecuted,
          result: 'SUCCESS'
        });
        
        broadcastEvent({ 
          type: 'automation_event', 
          automationId: auto._id, 
          name: auto.name, 
          result: 'SUCCESS',
          actionsExecuted 
        });
      }
  } catch (error) {
    console.error('[AUTOMATION ERROR]', error);
  }
};
