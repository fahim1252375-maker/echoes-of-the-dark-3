import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  generateEchoHint,
  generateEchoLore,
  generateJourneyRecap,
  generateTrialBlueprint,
  generateTrialFromImage,
  LoreTrigger,
  NarrationLanguage,
  TrialDifficulty,
} from '../services/geminiService';
import { normalizeLanguage } from '../services/aiFallbacks';
import { validateBase64TrialImage } from '../services/imageValidator';

export async function postLore(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const body = req.body as {
      trigger: LoreTrigger;
      levelNumber: number;
      levelName: string;
      fragmentsCollected?: number;
      pulsesUsed?: number;
      elapsedSeconds?: number;
      deaths?: number;
      statueInscription?: string;
      language?: NarrationLanguage;
    };

    const result = await generateEchoLore({
      trigger: body.trigger,
      levelNumber: Number(body.levelNumber),
      levelName: body.levelName,
      fragmentsCollected: Number(body.fragmentsCollected ?? 0),
      pulsesUsed: Number(body.pulsesUsed ?? 0),
      elapsedSeconds: Number(body.elapsedSeconds ?? 0),
      deaths: Number(body.deaths ?? 0),
      statueInscription: body.statueInscription,
      language: normalizeLanguage(body.language),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postHint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const body = req.body as {
      levelNumber: number;
      levelName: string;
      fragmentsCollected?: number;
      fragmentsMissing?: number;
      mechanismsActivated?: number;
      mechanismsRequired?: number;
      secondsStuck?: number;
      language?: NarrationLanguage;
    };

    const result = await generateEchoHint({
      levelNumber: Number(body.levelNumber),
      levelName: body.levelName,
      fragmentsCollected: Number(body.fragmentsCollected ?? 0),
      fragmentsMissing: Number(body.fragmentsMissing ?? 0),
      mechanismsActivated: Number(body.mechanismsActivated ?? 0),
      mechanismsRequired: Number(body.mechanismsRequired ?? 0),
      secondsStuck: Number(body.secondsStuck ?? 0),
      language: normalizeLanguage(body.language),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postRecap(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const body = req.body as {
      levelNumber: number;
      levelName: string;
      completionTimeSeconds: number;
      pulsesUsed?: number;
      deaths?: number;
      fragmentsCollected?: number;
      hintsUsed?: number;
      medal?: 'gold' | 'silver' | 'bronze' | null;
      language?: NarrationLanguage;
    };

    const result = await generateJourneyRecap({
      levelNumber: Number(body.levelNumber),
      levelName: body.levelName,
      completionTimeSeconds: Number(body.completionTimeSeconds),
      pulsesUsed: Number(body.pulsesUsed ?? 0),
      deaths: Number(body.deaths ?? 0),
      fragmentsCollected: Number(body.fragmentsCollected ?? 0),
      hintsUsed: Number(body.hintsUsed ?? 0),
      medal:
        body.medal === 'gold' || body.medal === 'silver' || body.medal === 'bronze'
          ? body.medal
          : null,
      language: normalizeLanguage(body.language),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postTrialBlueprint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const body = req.body as {
      seed?: number;
      difficulty?: TrialDifficulty;
      themeHint?: string;
    };

    const rawSeed =
      typeof body.seed === 'number' && Number.isFinite(body.seed)
        ? body.seed
        : Math.floor(100000 + Math.random() * 900000000);
    const difficulty: TrialDifficulty = body.difficulty ?? 'Explorer';
    const result = await generateTrialBlueprint(rawSeed, difficulty, body.themeHint);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postTrialFromImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const body = req.body as {
      imageBase64?: unknown;
      mimeType?: unknown;
      difficulty?: TrialDifficulty;
    };

    const validated = validateBase64TrialImage(body.imageBase64, body.mimeType);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const difficulty: TrialDifficulty = body.difficulty ?? 'Explorer';
    const result = await generateTrialFromImage(validated.data, difficulty);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
