export interface Policy {
  id: string;
  name: string;
  evaluate: (payload: IntakePayload) => boolean;
  decision: 'approve' | 'deny' | 'review';
  route: 'front_desk' | 'security' | 'none';
  explanation: string;
}

export interface IntakePayload {
  visitor_id: string;
  purpose: 'interview' | 'contractor' | 'delivery' | 'other';
  time: string; // HH:MM format
  host: string;
  badge_required: boolean;
  pre_registered: boolean;
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

function isBusinessHours(timeStr: string): boolean {
  const { hour } = parseTime(timeStr);
  return hour >= 9 && hour < 17; // 9 AM to 5 PM
}

export const policies: Policy[] = [
  {
    id: 'interview_business_hours_v1',
    name: 'Interview during business hours',
    evaluate: (payload) => {
      return (
        payload.purpose === 'interview' &&
        isBusinessHours(payload.time) &&
        payload.pre_registered === true
      );
    },
    decision: 'approve',
    route: 'front_desk',
    explanation: 'Interview scheduled during business hours with pre-registration confirmed.',
  },
  {
    id: 'contractor_after_hours_v1',
    name: 'Contractor after business hours',
    evaluate: (payload) => {
      return (
        payload.purpose === 'contractor' &&
        !isBusinessHours(payload.time)
      );
    },
    decision: 'review',
    route: 'security',
    explanation: 'Contractor visit outside business hours requires security review.',
  },
  {
    id: 'delivery_no_badge_v1',
    name: 'Delivery without badge requirement',
    evaluate: (payload) => {
      return (
        payload.purpose === 'delivery' &&
        payload.badge_required === false
      );
    },
    decision: 'approve',
    route: 'front_desk',
    explanation: 'Delivery visit approved with no badge requirement.',
  },
  {
    id: 'default_unknown_v1',
    name: 'Default unknown case',
    evaluate: () => true, // Always matches as fallback
    decision: 'review',
    route: 'security',
    explanation: 'Visit does not match any known policy pattern. Requires manual review.',
  },
];

