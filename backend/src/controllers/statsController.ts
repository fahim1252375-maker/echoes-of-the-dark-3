import { Request, Response, NextFunction } from 'express';
import { isDatabaseConnected } from '../config/database';
import { User } from '../models/User';
import { GameProgress } from '../models/GameProgress';
import { TrialRun } from '../models/TrialRun';

export async function getWorldStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isDatabaseConnected()) {
      res.json({
        offline: true,
        totalExplorers: 0,
        totalFragmentsCollected: 0,
        totalCampaignClears: 0,
        totalTrialRuns: 0,
        totalPulsesEmitted: 0,
      });
      return;
    }

    const [totalExplorers, progressAgg, totalTrialRuns] = await Promise.all([
      User.countDocuments({}),
      GameProgress.aggregate([
        {
          $project: {
            fragCount: { $size: { $ifNull: ['$collectedFragments', []] } },
            clearedAll: {
              $cond: [{ $gte: [{ $size: { $ifNull: ['$completedLevels', []] } }, 5] }, 1, 0],
            },
            pulses: { $ifNull: ['$pulsesEmitted', 0] },
          },
        },
        {
          $group: {
            _id: null,
            totalFragments: { $sum: '$fragCount' },
            totalClears: { $sum: '$clearedAll' },
            totalPulses: { $sum: '$pulses' },
          },
        },
      ]),
      TrialRun.countDocuments({}),
    ]);

    const aggRow = (progressAgg[0] as
      | { totalFragments?: number; totalClears?: number; totalPulses?: number }
      | undefined) ?? { totalFragments: 0, totalClears: 0, totalPulses: 0 };

    res.json({
      offline: false,
      totalExplorers,
      totalFragmentsCollected: aggRow.totalFragments ?? 0,
      totalCampaignClears: aggRow.totalClears ?? 0,
      totalTrialRuns,
      totalPulsesEmitted: aggRow.totalPulses ?? 0,
    });
  } catch (err) {
    next(err);
  }
}
