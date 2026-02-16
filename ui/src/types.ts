export interface IntakePayload {
  visitor_id: string;
  purpose: 'interview' | 'contractor' | 'delivery' | 'other';
  time: string; // HH:MM format
  host: string;
  badge_required: boolean;
  pre_registered: boolean;
}

