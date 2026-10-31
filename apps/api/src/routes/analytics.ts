import { Router } from 'express';
import { Telemetry } from '../models/Telemetry';
import { requireAuth } from '../middleware/auth';

const router = Router();
const TARIFF = parseFloat(process.env.ENERGY_TARIFF || '0.12');

// GET /api/analytics/power?deviceId=&from=&to=&limit=
router.get('/power', requireAuth, async (req, res) => {
  try {
    const { deviceId, from, to, limit } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }
    const lim = Math.min(parseInt(limit as string) || 500, 2000);
    const data = await Telemetry.find(filter)
      .sort({ timestamp: 1 })
      .limit(lim)
      .select('timestamp electrical.power electrical.current electrical.voltage electrical.powerFactor -_id');
    res.json(data.map(d => ({
      timestamp: d.timestamp,
      power: d.electrical?.power ?? 0,
      current: d.electrical?.current ?? 0,
      voltage: d.electrical?.voltage ?? 0,
      powerFactor: d.electrical?.powerFactor ?? 0
    })));
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/analytics/energy?deviceId=&period=today|7d|30d|custom&from=&to=
router.get('/energy', requireAuth, async (req, res) => {
  try {
    const { deviceId, period, from, to } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;

    const now = new Date();
    let startDate: Date;
    if (period === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today;
    } else if (period === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 3600000);
    } else if (period === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 3600000);
    } else {
      startDate = from ? new Date(from as string) : new Date(Date.now() - 24 * 3600000);
    }
    const endDate = to ? new Date(to as string) : new Date();

    filter.timestamp = { $gte: startDate, $lte: endDate };

    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            deviceId: '$deviceId'
          },
          minEnergy: { $min: '$electrical.energy' },
          maxEnergy: { $max: '$electrical.energy' },
          peakPower: { $max: '$electrical.power' },
          avgPower: { $avg: '$electrical.power' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id.date',
          deviceId: '$_id.deviceId',
          deviceEnergyKwh: { $max: [{ $subtract: ['$maxEnergy', '$minEnergy'] }, 0] },
          peakPowerKw: '$peakPower',
          avgPowerKw: '$avgPower',
          count: '$count'
        }
      },
      {
        $group: {
          _id: '$date',
          energyKwh: { $sum: '$deviceEnergyKwh' },
          peakPowerKw: { $max: '$peakPowerKw' },
          avgPowerKw: { $avg: '$avgPowerKw' },
          count: { $sum: '$count' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          energyKwh: 1,
          peakPowerKw: 1,
          avgPowerKw: 1,
          count: 1
        }
      },
      { $sort: { date: 1 } }
    ];

    const daily: any[] = await Telemetry.aggregate(pipeline);

    let totalEnergyKwh = 0;
    let maxPeak = 0;
    let sumAvg = 0;

    daily.forEach((d: any) => {
      totalEnergyKwh += d.energyKwh || 0;
      if ((d.peakPowerKw || 0) > maxPeak) maxPeak = d.peakPowerKw;
      sumAvg += d.avgPowerKw || 0;
    });

    res.json({
      totalEnergyKwh,
      peakPowerKw: maxPeak,
      avgPowerKw: daily.length ? sumAvg / daily.length : 0,
      estimatedCost: totalEnergyKwh * TARIFF,
      dailyBreakdown: daily.map((d: any) => ({
        date: d.date,
        energyKwh: d.energyKwh || 0,
        peakPowerKw: d.peakPowerKw || 0,
        avgPowerKw: d.avgPowerKw || 0,
        cost: (d.energyKwh || 0) * TARIFF
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/analytics/machines?machineId=&from=&to=
router.get('/machines', requireAuth, async (req, res) => {
  try {
    const { machineId, from, to } = req.query;
    const filter: any = { 'machines.0': { $exists: true } };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }

    const pipeline: any[] = [
      { $match: filter },
      { $unwind: '$machines' },
      ...(machineId ? [{ $match: { 'machines.id': machineId } }] : []),
      {
        $group: {
          _id: '$machines.id',
          avgRpm: { $avg: '$machines.rpm' },
          maxRpm: { $max: '$machines.rpm' },
          avgTemperature: { $avg: '$machines.temperature' },
          maxTemperature: { $max: '$machines.temperature' },
          avgVibration: { $avg: '$machines.vibration' },
          maxVibration: { $max: '$machines.vibration' },
          avgCurrent: { $avg: '$machines.current' },
          avgPower: { $avg: '$machines.power' },
          totalRuntimeSeconds: { $max: '$machines.runtimeSeconds' },
          faultCount: {
            $sum: { $cond: [{ $eq: ['$machines.state', 'FAULT'] }, 1, 0] }
          },
          runningCount: {
            $sum: { $cond: [{ $eq: ['$machines.state', 'RUNNING'] }, 1, 0] }
          },
          idleCount: {
            $sum: { $cond: [{ $eq: ['$machines.state', 'IDLE'] }, 1, 0] }
          },
          offCount: {
            $sum: { $cond: [{ $eq: ['$machines.state', 'OFF'] }, 1, 0] }
          },
          totalSamples: { $sum: 1 }
        }
      },
      {
        $project: {
          machineId: '$_id',
          avgRpm: 1, maxRpm: 1,
          avgTemperature: 1, maxTemperature: 1,
          avgVibration: 1, maxVibration: 1,
          avgCurrent: 1, avgPower: 1,
          totalRuntimeSeconds: 1,
          faultCount: 1,
          utilization: {
            $multiply: [
              { $divide: ['$runningCount', { $max: ['$totalSamples', 1] }] },
              100
            ]
          },
          health: {
            $cond: [
              { $gt: ['$maxTemperature', 60] }, 'CRITICAL',
              {
                $cond: [
                  { $gt: ['$maxVibration', 5] }, 'CRITICAL',
                  {
                    $cond: [
                      { $gt: ['$faultCount', 0] }, 'WARNING',
                      {
                        $cond: [
                          { $gt: ['$maxTemperature', 45] }, 'WARNING',
                          'NORMAL'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ];

    const results = await Telemetry.aggregate(pipeline);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/analytics/productivity?from=&to=
router.get('/productivity', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter: any = { 'machines.0': { $exists: true } };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }

    const pipeline: any[] = [
      { $match: filter },
      { $unwind: '$machines' },
      {
        $group: {
          _id: '$machines.id',
          runningCount: { $sum: { $cond: [{ $eq: ['$machines.state', 'RUNNING'] }, 1, 0] } },
          idleCount: { $sum: { $cond: [{ $eq: ['$machines.state', 'IDLE'] }, 1, 0] } },
          offCount: { $sum: { $cond: [{ $in: ['$machines.state', ['OFF', 'FAULT', 'MAINTENANCE']] }, 1, 0] } },
          faultCount: { $sum: { $cond: [{ $eq: ['$machines.state', 'FAULT'] }, 1, 0] } },
          totalSamples: { $sum: 1 },
          maxRuntime: { $max: '$machines.runtimeSeconds' }
        }
      },
      {
        $project: {
          machineId: '$_id',
          runtimeSeconds: { $multiply: ['$runningCount', 5] }, // 5s per sample
          idleSeconds: { $multiply: ['$idleCount', 5] },
          downtimeSeconds: { $multiply: ['$offCount', 5] },
          faultCount: 1,
          utilization: {
            $multiply: [
              { $divide: ['$runningCount', { $max: ['$totalSamples', 1] }] },
              100
            ]
          }
        }
      }
    ];

    const results = await Telemetry.aggregate(pipeline);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
