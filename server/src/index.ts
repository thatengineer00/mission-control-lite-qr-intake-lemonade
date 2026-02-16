import express from 'express';
import cors from 'cors';
import { handleIntake } from './intake.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Intake endpoint
app.post('/intake', handleIntake);

app.listen(PORT, () => {
  console.log(`Mission Control server running on http://localhost:${PORT}`);
  console.log(`Lemonade base URL: ${process.env.LEMONADE_BASE_URL || 'http://localhost:8000'}`);
  console.log(`Lemonade model: ${process.env.LEMONADE_MODEL_NAME || 'Qwen3-VL-4B-Instruct-GGUF'}`);
  console.log('⚠️  VLM is REQUIRED - workflow will fail if Lemonade is unavailable');
});

