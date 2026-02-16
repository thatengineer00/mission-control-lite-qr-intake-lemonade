import { Request, Response } from 'express';
import { IntakePayload } from './policies.js';
import { evaluateIntake } from './evaluate.js';
import { enhanceExplanation } from './lemonade.js';

export interface IntakeRequest {
  source: 'qr_scan' | 'import' | 'gallery';
  payload: IntakePayload;
}

export interface IntakeResponse {
  decision: 'approve' | 'deny' | 'review';
  route: 'front_desk' | 'security' | 'none';
  explanation: string;
  policy_id: string;
  model_used?: string;
}

export async function handleIntake(req: Request, res: Response): Promise<void> {
  try {
    const body: IntakeRequest = req.body;

    // Validate request
    if (!body.payload || !body.source) {
      res.status(400).json({ error: 'Missing required fields: source, payload' });
      return;
    }

    const payload = body.payload;

    // Validate payload fields
    if (
      !payload.visitor_id ||
      !payload.purpose ||
      !payload.time ||
      !payload.host ||
      typeof payload.badge_required !== 'boolean' ||
      typeof payload.pre_registered !== 'boolean'
    ) {
      res.status(400).json({ error: 'Invalid payload structure' });
      return;
    }

    // Step 1: Evaluate using deterministic policies
    const evaluation = evaluateIntake(payload);

    // Step 2: REQUIRED - Enhance explanation with Lemonade VLM
    // This will throw an error if Lemonade is unavailable (no fallback)
    const enhanced = await enhanceExplanation(evaluation.explanation);

    const response: IntakeResponse = {
      decision: evaluation.decision,
      route: evaluation.route,
      explanation: enhanced.explanation,
      policy_id: evaluation.policy_id,
      model_used: enhanced.model_used,
    };

    res.json(response);
  } catch (error) {
    console.error('Intake handler error:', error);
    
    // Check if it's a Lemonade/VLM error
    if (error instanceof Error && error.message.includes('Lemonade')) {
      res.status(503).json({ 
        error: 'VLM service unavailable',
        message: error.message,
        details: 'Lemonade model is required for this workflow. Please ensure Lemonade is running.'
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

