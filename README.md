# Mission Control - QR Intake with Lemonade

A Lemonade developer contest demo that demonstrates:
1. **Lemonade model lifecycle** (download + load + serving)
2. **Mission Control routing** - A lightweight policy-based request router
3. **QR code intake** - Web app for scanning QR codes and routing visitor requests

## What This Demo Shows

This application demonstrates:

- **Lemonade Integration**: Explicit model download, load, and serving workflow
- **Policy-Based Routing**: Deterministic evaluation of visitor intake requests using 4 hardcoded policies
- **QR Code Processing**: Multiple input methods (camera, file import, gallery) for QR code scanning
- **LLM Enhancement**: Required explanation enhancement using Lemonade VLM (no fallback)

### Architecture

- **Backend**: Node.js + TypeScript + Express
  - Policy evaluation engine
  - Lemonade API client
  - Intake endpoint (`POST /intake`)

- **Frontend**: Vite + React + TypeScript
  - Camera-based QR scanning
  - QR image import
  - Pre-generated QR gallery
  - Result visualization

## Lemonade Setup

**IMPORTANT**: 
- This demo assumes Lemonade is already installed locally
- The backend does NOT manage Lemonade lifecycle
- **VLM is REQUIRED** - The workflow will fail if Lemonade is unavailable (no fallback)

### Step 1: Pull the Model

```bash
lemonade pull Qwen3-VL-4B-Instruct-GGUF
```

Or use another Lemonade-supported model of your choice.

### Step 2: Load the Model

```bash
lemonade load Qwen3-VL-4B-Instruct-GGUF
```

### Step 3: Start Lemonade Server

```bash
lemonade serve
```

By default, Lemonade serves on `http://localhost:8000`. The backend will call:
- Endpoint: `http://localhost:8000/v1/chat/completions`
- Model: `Qwen3-VL-4B-Instruct-GGUF` (or the model you specified

### Step 4: Configure Backend (Optional)

Set environment variables if your Lemonade instance differs:

```bash
export LEMONADE_BASE_URL=http://localhost:8000
export LEMONADE_MODEL_NAME=Qwen3-VL-4B-Instruct-GGUF
```

## Running the Application

**IMPORTANT**: All commands below should be run from the **project root directory** (`mission-control-lite-qr-intake-lemonade/`), not from `server/` or `ui/` subdirectories.

### Prerequisites

- Node.js 18+ and npm
- Lemonade installed and running (see above)

### Installation

From the project root:

```bash
# Install root dependencies (for QR generation)
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install UI dependencies
cd ui && npm install && cd ..
```

### Generate QR Test Images

From the project root:

```bash
npm run gen:qrs
```

This generates 8 QR code images in `ui/public/qrs/` for testing.

### Start Backend

From the project root:

```bash
npm run dev:server
```

Or manually:
```bash
cd server && npm run dev
```

Server runs on `http://localhost:8080`

### Start Frontend

From the project root:

```bash
npm run dev:ui
```

Or manually:
```bash
cd ui && npm run dev
```

UI runs on `http://localhost:3000`

## 60-Second Demo Script

**Note**: Run all commands from the project root directory.

### Step 1: Start Services (10 seconds)
1. **Start Lemonade first** (REQUIRED): `lemonade serve` (in terminal 1)
2. Start backend: `npm run dev:server` (in terminal 2, from project root)
3. Start frontend: `npm run dev:ui` (in terminal 3, from project root)

**Important**: Lemonade must be running before starting the backend, as VLM is required.

### Step 2: Test QR Gallery (20 seconds)
1. Open `http://localhost:3000` in browser
2. Scroll to "QR Gallery" section
3. Click "Load: Interview (business hours)"
4. Verify decoded payload appears
5. Click "Submit to Mission Control"

### Step 3: Verify Result (10 seconds)
- Check that result shows:
  - **Decision**: APPROVE
  - **Route**: front_desk
  - **Explanation**: (enhanced by Lemonade VLM - required)
  - **Policy ID**: interview_business_hours_v1
  - **Model Used**: Qwen3-VL-4B-Instruct-GGUF (or your configured model)

### Step 4: Test Other Policies (20 seconds)
- Click "Load: Contractor (after hours)" → Should route to `security` with `review` decision
- Click "Load: Delivery (no badge)" → Should route to `front_desk` with `approve` decision
- Click "Load: Unknown (default)" → Should route to `security` with `review` decision

## Judge Mode

If you don't want to use the camera:

1. **QR Gallery**: Open the QR Gallery section and click any scenario button
2. **File Import**: Use the "Import QR Image" section to upload a QR PNG from `ui/public/qrs/`
3. **Sample Payload**: Click "Use Sample Payload" to bypass QR scanning entirely

All input methods produce the same result format.

## Sample QR Payloads

The QR codes contain JSON payloads. Example:

```json
{
  "visitor_id": "V-10293",
  "purpose": "interview",
  "time": "10:30",
  "host": "eng",
  "badge_required": true,
  "pre_registered": true
}
```

### Supported Formats

1. **JSON** (preferred):
   ```json
   {"visitor_id":"V-10293","purpose":"interview","time":"10:30","host":"eng","badge_required":true,"pre_registered":true}
   ```

2. **Key-Value Pairs** (fallback):
   ```
   visitor_id=V-10293;purpose=interview;time=10:30;host=eng;badge_required=true;pre_registered=true
   ```

## API Contract

### POST /intake

**Request:**
```json
{
  "source": "qr_scan|import|gallery",
  "payload": {
    "visitor_id": "string",
    "purpose": "interview|contractor|delivery|other",
    "time": "HH:MM",
    "host": "string",
    "badge_required": true|false,
    "pre_registered": true|false
  }
}
```

**Response:**
```json
{
  "decision": "approve|deny|review",
  "route": "front_desk|security|none",
  "explanation": "string",
  "policy_id": "string",
  "model_used": "string"
}
```

## Policies

The system includes 4 hardcoded policies (first-match-wins):

1. **interview_business_hours_v1**
   - Matches: `purpose=interview`, business hours (9-17), `pre_registered=true`
   - Decision: `approve`, Route: `front_desk`

2. **contractor_after_hours_v1**
   - Matches: `purpose=contractor`, outside business hours
   - Decision: `review`, Route: `security`

3. **delivery_no_badge_v1**
   - Matches: `purpose=delivery`, `badge_required=false`
   - Decision: `approve`, Route: `front_desk`

4. **default_unknown_v1**
   - Matches: everything else (fallback)
   - Decision: `review`, Route: `security`

**Note**: After policy evaluation, the explanation is enhanced by the Lemonade VLM (required step - no fallback).

## Generate More QR Codes

To generate additional test QR codes (from project root):

```bash
npm run gen:qrs
```

Edit `tools/generate_qrs.ts` to add more test cases. Generated images are saved to `ui/public/qrs/`.

## Project Structure

```
mission-control-qr-intake-lemonade/
├── server/
│   └── src/
│       ├── index.ts          # Express server
│       ├── intake.ts         # Intake endpoint handler
│       ├── policies.ts       # Policy definitions
│       ├── evaluate.ts       # Policy evaluation
│       └── lemonade.ts       # Lemonade API client
├── ui/
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   ├── qr.ts             # QR scanning utilities
│   │   ├── api.ts            # API client
│   │   └── types.ts          # TypeScript types
│   └── public/
│       └── qrs/              # Generated QR images
├── tools/
│   └── generate_qrs.ts      # QR generation script
└── README.md
```

## Troubleshooting

### Lemonade Connection Failed
- Verify Lemonade is running: `curl http://localhost:8000/health` (if available)
- Check `LEMONADE_BASE_URL` environment variable
- **VLM is required** - The workflow will return HTTP 503 if Lemonade is unavailable
- Ensure Lemonade is started before running the backend

### QR Not Detected
- Ensure QR code has sufficient contrast
- Try different QR images from the gallery
- Check browser console for errors

### Camera Access Denied
- Use QR Gallery or file import instead
- Grant camera permissions in browser settings

## License

This is a demo project for the Lemonade developer contest.
