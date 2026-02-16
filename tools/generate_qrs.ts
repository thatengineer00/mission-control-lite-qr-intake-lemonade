import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';

interface QRTestCase {
  filename: string;
  payload: {
    visitor_id: string;
    purpose: 'interview' | 'contractor' | 'delivery' | 'other';
    time: string;
    host: string;
    badge_required: boolean;
    pre_registered: boolean;
  };
}

const testCases: QRTestCase[] = [
  {
    filename: 'interview_business_hours_v1_1.png',
    payload: {
      visitor_id: 'V-10293',
      purpose: 'interview',
      time: '10:30',
      host: 'eng',
      badge_required: true,
      pre_registered: true,
    },
  },
  {
    filename: 'interview_business_hours_v1_2.png',
    payload: {
      visitor_id: 'V-10456',
      purpose: 'interview',
      time: '14:15',
      host: 'product',
      badge_required: true,
      pre_registered: true,
    },
  },
  {
    filename: 'contractor_after_hours_v1_1.png',
    payload: {
      visitor_id: 'V-20111',
      purpose: 'contractor',
      time: '18:00',
      host: 'facilities',
      badge_required: false,
      pre_registered: false,
    },
  },
  {
    filename: 'contractor_after_hours_v1_2.png',
    payload: {
      visitor_id: 'V-20122',
      purpose: 'contractor',
      time: '20:30',
      host: 'facilities',
      badge_required: true,
      pre_registered: false,
    },
  },
  {
    filename: 'delivery_no_badge_v1_1.png',
    payload: {
      visitor_id: 'V-30111',
      purpose: 'delivery',
      time: '11:00',
      host: 'reception',
      badge_required: false,
      pre_registered: false,
    },
  },
  {
    filename: 'delivery_no_badge_v1_2.png',
    payload: {
      visitor_id: 'V-30122',
      purpose: 'delivery',
      time: '15:45',
      host: 'reception',
      badge_required: false,
      pre_registered: true,
    },
  },
  {
    filename: 'default_unknown_v1_1.png',
    payload: {
      visitor_id: 'V-40111',
      purpose: 'other',
      time: '12:00',
      host: 'unknown',
      badge_required: false,
      pre_registered: false,
    },
  },
  {
    filename: 'default_unknown_v1_2.png',
    payload: {
      visitor_id: 'V-40122',
      purpose: 'other',
      time: '16:30',
      host: 'unknown',
      badge_required: true,
      pre_registered: false,
    },
  },
];

async function generateQRs() {
  const outputDir = join(process.cwd(), 'ui', 'public', 'qrs');
  
  // Create directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  console.log(`Generating ${testCases.length} QR codes...`);

  for (const testCase of testCases) {
    const jsonString = JSON.stringify(testCase.payload);
    const outputPath = join(outputDir, testCase.filename);

    try {
      await QRCode.toFile(outputPath, jsonString, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 2,
      });
      console.log(`✓ Generated: ${testCase.filename}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${testCase.filename}:`, error);
    }
  }

  console.log(`\nAll QR codes generated in: ${outputDir}`);
}

generateQRs().catch(console.error);

