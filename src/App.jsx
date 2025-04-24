import { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [nameImage, setNameImage] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const [nameText, setNameText] = useState('');
  const [idText, setIdText] = useState('');

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("❌ カメラ取得失敗:", err);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraOn]);

  const toggleCamera = () => setCameraOn(prev => !prev);

  const cropAndScale = (image, x, y, width, height, scale = 1) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, x, y, width, height, 0, 0, width * scale, height * scale);
        resolve(canvas.toDataURL());
      };
      img.src = image;
    });
  };

  const runOCR = async (image, setter) => {
    const result = await Tesseract.recognize(image, 'jpn+eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-：',
    });
    setter(result.data.text.trim());
  };

  const captureToCanvas = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const captureWidth = 720;
      const captureHeight = 1008;
      const sx = (vw - captureWidth) / 2;
      const sy = (vh - captureHeight) / 2;

      canvas.width = captureWidth;
      canvas.height = captureHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, sx, sy, captureWidth, captureHeight, 0, 0, captureWidth, captureHeight);
      const fullImage = canvas.toDataURL('image/png');

      const nameCrop = await cropAndScale(fullImage, 0, 40, 720, 50, 3);
      const idCrop = await cropAndScale(fullImage, 0, 988 - 40, 360, 20, 3);

      setNameImage(nameCrop);
      setIdImage(idCrop);

      runOCR(nameCrop, setNameText);
      runOCR(idCrop, setIdText);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: 'black' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '240px',
        height: '336px',
        transform: 'translate(-50%, -50%)',
        border: '3px dashed red',
        borderRadius: '16px',
        pointerEvents: 'none',
        boxShadow: '0 0 10px rgba(255,0,0,0.5)'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        zIndex: 10
      }}>
        <button onClick={toggleCamera} style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          backgroundColor: cameraOn ? 'red' : 'green',
          color: 'white'
        }}>
          {cameraOn ? 'カメラOFF' : 'カメラON'}
        </button>
        <button onClick={captureToCanvas} style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          backgroundColor: 'blue',
          color: 'white'
        }}>
          撮影
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {nameImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>🏷️ カード名: {nameText}</p>
            <img src={nameImage} alt="Card Name" style={{ width: `${720 * 2}px` }} />
          </div>
        )}
        {idImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>🔢 型番: {idText}</p>
            <img src={idImage} alt="Card ID" style={{ width: `${360 * 2}px` }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
