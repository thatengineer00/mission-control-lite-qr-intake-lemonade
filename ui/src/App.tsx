import { useState, useRef, useEffect } from 'react';
import { startCameraScan, stopCameraScan, decodeQRFromImageFile, decodeQRFromImageUrl, parseQRContent } from './qr';
import { submitIntake } from './api';
import { IntakePayload } from './types';
import type { IntakeResponse } from './api';

type InputSource = 'camera' | 'import' | 'gallery' | null;

const QR_GALLERY = [
  { name: 'Interview (business hours)', file: 'interview_business_hours_v1_1.png' },
  { name: 'Interview (business hours) #2', file: 'interview_business_hours_v1_2.png' },
  { name: 'Contractor (after hours)', file: 'contractor_after_hours_v1_1.png' },
  { name: 'Contractor (after hours) #2', file: 'contractor_after_hours_v1_2.png' },
  { name: 'Delivery (no badge)', file: 'delivery_no_badge_v1_1.png' },
  { name: 'Delivery (no badge) #2', file: 'delivery_no_badge_v1_2.png' },
  { name: 'Unknown (default)', file: 'default_unknown_v1_1.png' },
  { name: 'Unknown (default) #2', file: 'default_unknown_v1_2.png' },
];

function App() {
  const [cameraActive, setCameraActive] = useState(false);
  const [decodedText, setDecodedText] = useState<string>('');
  const [parsedPayload, setParsedPayload] = useState<IntakePayload | null>(null);
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [inputSource, setInputSource] = useState<InputSource>(null);
  const [lastScannedQR, setLastScannedQR] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopCameraScan(streamRef.current);
      }
    };
  }, []);

  const handleStartCamera = async () => {
    try {
      setError('');
      setResult(null); // Clear previous result when starting camera
      
      if (!videoRef.current) {
        setError('Video element not available');
        return;
      }
      
      setCameraActive(true); // Set active to show video
      
      const stream = await startCameraScan(
        videoRef.current,
        (text) => {
          // Skip if this is the same QR code as the last one scanned
          if (text === lastScannedQR) {
            return; // No need to decode the same QR again
          }
          
          // Only prevent scanning if there's a decoded QR waiting to be submitted (no result yet)
          // If result exists, previous QR was submitted, so allow scanning new QR
          if (decodedText && !result) {
            return; // Don't scan new QR until current one is submitted
          }
          
          // This is a new/different QR code - process it
          setLastScannedQR(text);
          setDecodedText(text);
          setResult(null); // Clear previous result when new QR is detected
          setError(''); // Clear any previous errors
          try {
            const payload = parseQRContent(text);
            setParsedPayload(payload);
            setInputSource('camera');
          } catch (err) {
            setError(`Failed to parse QR content: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        },
        () => {
          // Silently ignore scanning errors
          // NotFoundException and other errors are expected when no QR code is in view
        }
      );
      streamRef.current = stream;
    } catch (err) {
      setCameraActive(false);
      setError(`Camera error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      stopCameraScan(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setLastScannedQR(''); // Reset so same QR can be scanned again if camera restarts
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setResult(null); // Clear previous result
      const text = await decodeQRFromImageFile(file);
      setDecodedText(text);
      const payload = parseQRContent(text);
      setParsedPayload(payload);
      setInputSource('import');
    } catch (err) {
      setError(`Failed to decode QR: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDecodedText('');
      setParsedPayload(null);
      setResult(null); // Clear result on error too
    }
  };

  const handleGalleryClick = async (filename: string) => {
    if (decoding) return; // Prevent double clicks
    
    try {
      setDecoding(true);
      setError('');
      setDecodedText(''); // Clear previous
      setParsedPayload(null); // Clear previous
      setResult(null); // Clear previous result
      const url = `/qrs/${filename}`;
      const text = await decodeQRFromImageUrl(url);
      setDecodedText(text);
      const payload = parseQRContent(text);
      setParsedPayload(payload);
      setInputSource('gallery');
    } catch (err) {
      setError(`Failed to decode QR: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDecodedText('');
      setParsedPayload(null);
      setResult(null); // Clear result on error too
    } finally {
      setDecoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!parsedPayload) {
      setError('No payload to submit');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const source = inputSource === 'camera' ? 'qr_scan' : inputSource === 'import' ? 'import' : 'gallery';
      const response = await submitIntake(source, parsedPayload);
      setResult(response); // Update result with new submission
      // After successful submission, allow new QR scans
      setLastScannedQR(''); // Reset so new QR can be scanned
    } catch (err) {
      setError(`Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSamplePayload = () => {
    setResult(null); // Clear previous result
    const sample: IntakePayload = {
      visitor_id: 'V-10293',
      purpose: 'interview',
      time: '10:30',
      host: 'eng',
      badge_required: true,
      pre_registered: true,
    };
    setParsedPayload(sample);
    setDecodedText(JSON.stringify(sample, null, 2));
    setInputSource('gallery');
  };

  return (
    <div>
      <h1>Mission Control - QR Intake</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <section>
          <h2>Camera Scan</h2>
          {!cameraActive ? (
            <button onClick={handleStartCamera}>Start Camera</button>
          ) : (
            <button onClick={handleStopCamera}>Stop Camera</button>
          )}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              marginTop: '0.5rem', 
              maxHeight: '200px', 
              width: '100%', 
              borderRadius: '0.5rem',
              display: cameraActive ? 'block' : 'none'
            }} 
          />
        </section>

        <section>
          <h2>Import QR Image</h2>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileUpload}
            style={{ marginTop: '0.5rem' }}
          />
        </section>

        <section>
          <h2>Sample Payload</h2>
          <button onClick={handleSamplePayload} style={{ marginTop: '0.5rem' }}>Use Sample Payload</button>
        </section>
      </div>

      <section>
        <h2>QR Gallery</h2>
        <div className="qr-gallery">
          {QR_GALLERY.map((item) => (
            <button
              key={item.file}
              onClick={() => handleGalleryClick(item.file)}
              disabled={decoding}
            >
              {decoding ? 'Decoding...' : item.name}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      {decodedText && (
        <section>
          <h2>Decoded QR Content</h2>
          <div className="payload-display">
            {(() => {
              try {
                // Try to parse and pretty-print JSON
                const parsed = JSON.parse(decodedText);
                return JSON.stringify(parsed, null, 2);
              } catch {
                // If not JSON, display as-is
                return decodedText;
              }
            })()}
          </div>
          {parsedPayload && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem' }}>
                <strong>Source:</strong>
                <span className="source-badge">{inputSource || 'unknown'}</span>
              </div>
              <button onClick={handleSubmit} disabled={loading || !parsedPayload}>
                {loading && <span className="loading-spinner"></span>}
                {loading ? 'Submitting...' : 'Submit to Mission Control'}
              </button>
            </div>
          )}
        </section>
      )}

      {result && (
        <section>
          <h2>Mission Control Result</h2>
          <div className="result-card">
            <h3>Decision</h3>
            <p>
              <span className={`decision-badge ${result.decision}`}>
                {result.decision}
              </span>
            </p>
          </div>
          <div className="result-card">
            <h3>Route</h3>
            <p>{result.route.replace('_', ' ')}</p>
          </div>
          <div className="result-card">
            <h3>Explanation</h3>
            <p>{result.explanation}</p>
          </div>
          <div className="result-card">
            <h3>Policy ID</h3>
            <p style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{result.policy_id}</p>
          </div>
          {result.model_used && result.model_used !== 'fallback' && (
            <div className="result-card">
              <h3>Model Used</h3>
              <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--primary-light)' }}>
                {result.model_used}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;

