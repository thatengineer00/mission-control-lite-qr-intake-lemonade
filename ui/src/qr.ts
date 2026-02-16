import { BrowserQRCodeReader } from '@zxing/library';
import { IntakePayload } from './types';

const codeReader = new BrowserQRCodeReader();
let activeScanning: { stop: () => void } | null = null;

export async function startCameraScan(
  videoElement: HTMLVideoElement,
  onResult: (text: string) => void,
  onError: (error: Error) => void
): Promise<MediaStream> {
  try {
    // Request camera access - use 'user' for front camera (laptops) or try 'environment' first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // Try back camera first, fallback to any
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
    });
    
    videoElement.srcObject = stream;
    
    // Wait for video to be ready before starting scan
    await new Promise<void>((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play()
          .then(() => resolve())
          .catch(reject);
      };
      videoElement.onerror = () => reject(new Error('Video element failed to load'));
      
      // If already loaded
      if (videoElement.readyState >= 2) {
        videoElement.play()
          .then(() => resolve())
          .catch(reject);
      }
    });

    // Start scanning after video is ready
    const scanning = codeReader.decodeFromVideoDevice(undefined, videoElement, (result: any, error: any) => {
      if (result) {
        onResult(result.getText());
      }
      // Silently ignore NotFoundException - it's expected when no QR is in view
      // Only call onError for unexpected errors
      if (error && error.name !== 'NotFoundException' && error.name !== 'No QR Code Found') {
        onError(error);
      }
    });
    
    activeScanning = scanning;

    return stream;
  } catch (error) {
    throw new Error(`Camera access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function stopCameraScan(stream: MediaStream | null): void {
  // Stop QR code scanning
  if (activeScanning) {
    try {
      activeScanning.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
    activeScanning = null;
  }
  
  // Stop camera stream
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

export async function decodeQRFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      
      // Use the same retry logic as decodeQRFromImageUrl
      const attemptDecode = async (delay: number): Promise<string> => {
        // Create an Image element to ensure it's fully loaded
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((imgResolve, imgReject) => {
          img.onload = () => {
            // Wait a bit more to ensure image is fully rendered
            setTimeout(() => imgResolve(), delay);
          };
          img.onerror = () => imgReject(new Error('Image failed to load'));
          img.src = imageUrl;
          
          // If already loaded (cached)
          if (img.complete && img.naturalWidth > 0) {
            setTimeout(() => imgResolve(), delay);
          }
        });
        
        // Now decode - image is guaranteed to be loaded
        const result = await codeReader.decodeFromImageUrl(imageUrl);
        return result.getText();
      };
      
      try {
        // First attempt with 200ms delay
        const text = await attemptDecode(200);
        resolve(text);
      } catch (error) {
        // Retry with longer delay
        try {
          const text = await attemptDecode(500);
          resolve(text);
        } catch (retryError) {
          reject(new Error('No QR code found in image'));
        }
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function decodeQRFromImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use the same approach as file upload - convert to data URL
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Convert blob to data URL (same as file upload)
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageUrl = e.target?.result as string;
          
          // Try decoding with retry logic
          const attemptDecode = async (delay: number): Promise<string> => {
            // Create an Image element to ensure it's fully loaded
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise<void>((imgResolve, imgReject) => {
              img.onload = () => {
                // Wait a bit more to ensure image is fully rendered
                setTimeout(() => imgResolve(), delay);
              };
              img.onerror = () => imgReject(new Error('Image failed to load'));
              img.src = imageUrl;
              
              // If already loaded (cached)
              if (img.complete && img.naturalWidth > 0) {
                setTimeout(() => imgResolve(), delay);
              }
            });
            
            // Now decode - image is guaranteed to be loaded
            const result = await codeReader.decodeFromImageUrl(imageUrl);
            return result.getText();
          };
          
          try {
            // First attempt with 200ms delay
            const text = await attemptDecode(200);
            resolve(text);
          } catch (error) {
            // Retry with longer delay
            try {
              const text = await attemptDecode(500);
              resolve(text);
            } catch (retryError) {
              reject(new Error('No QR code found in image'));
            }
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        reject(new Error(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      });
  });
}

export function parseQRContent(text: string): IntakePayload {
  // Try JSON first
  try {
    const parsed = JSON.parse(text);
    return {
      visitor_id: parsed.visitor_id || '',
      purpose: parsed.purpose || 'other',
      time: parsed.time || '',
      host: parsed.host || '',
      badge_required: parsed.badge_required ?? false,
      pre_registered: parsed.pre_registered ?? false,
    };
  } catch {
    // Fallback to key=value format
    const pairs: Record<string, string> = {};
    text.split(';').forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        pairs[key] = value;
      }
    });

    return {
      visitor_id: pairs.visitor_id || '',
      purpose: (pairs.purpose as any) || 'other',
      time: pairs.time || '',
      host: pairs.host || '',
      badge_required: pairs.badge_required === 'true',
      pre_registered: pairs.pre_registered === 'true',
    };
  }
}

