import { IntakePayload } from './types';

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

export async function submitIntake(
  source: 'qr_scan' | 'import' | 'gallery',
  payload: IntakePayload
): Promise<IntakeResponse> {
  try {
    const response = await fetch('/api/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source,
        payload,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the server is running on http://localhost:8080');
    }
    throw error;
  }
}

