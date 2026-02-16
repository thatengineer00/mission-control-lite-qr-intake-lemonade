import { policies, Policy, IntakePayload } from './policies.js';

export interface EvaluationResult {
  decision: 'approve' | 'deny' | 'review';
  route: 'front_desk' | 'security' | 'none';
  explanation: string;
  policy_id: string;
}

export function evaluateIntake(payload: IntakePayload): EvaluationResult {
  // First-match-wins policy evaluation
  for (const policy of policies) {
    if (policy.evaluate(payload)) {
      return {
        decision: policy.decision,
        route: policy.route,
        explanation: policy.explanation,
        policy_id: policy.id,
      };
    }
  }

  // Fallback (should never reach here due to default_unknown_v1)
  const defaultPolicy = policies[policies.length - 1];
  return {
    decision: defaultPolicy.decision,
    route: defaultPolicy.route,
    explanation: defaultPolicy.explanation,
    policy_id: defaultPolicy.id,
  };
}

