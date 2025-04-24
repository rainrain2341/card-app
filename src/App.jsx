import { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [nameImage, setNameImage] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const [ocrNameText, setOcrNameText] = useState('');
  const [ocrIdText, setOcrIdText] = useState('');

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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

  const preprocessImage = (image) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = image;

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  const cropRegion = (image, x, y, width, height) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = image;

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL());
      };
    });
  };

  const captureToCanvas = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      const captureWidth = 240;
      const captureHeight = 336;
      const sx = (videoWidth - captureWidth) / 2;
      const sy = (videoHeight - captureHeight) / 2;

      canvas.width = captureWidth;
      canvas.height = captureHeight;

      ctx.drawImage(video, sx, sy, captureWidth, captureHeight, 0, 0, captureWidth, captureHeight);
      const dataUrl = canvas.toDataURL('image/png');

      const preprocessed = await preprocessImage(dataUrl);
      setCapturedImage(preprocessed);

      // カード名エリア（上から20px, 高さ40px）
      const nameCrop = await cropRegion(preprocessed, 0, 20, 240, 40);
      setNameImage(nameCrop);

      // 型番エリア（左下、上から316px, 高さ20px, 幅120px）
      const idCrop = await cropRegion(preprocessed, 0, 316, 120, 20);
      setIdImage(idCrop);
    }
  };

  // OCR for nameImage
  useEffect(() => {
    if (!nameImage) return;
    Tesseract.recognize(nameImage, 'jpn', {
      logger: m => console.log("📘 name OCR progress:", m),
    }).then(({ data: { text } }) => {
      setOcrNameText(text.trim());
    });
  }, [nameImage]);

  // OCR for idImage
  useEffect(() => {
    if (!idImage) return;
    Tesseract.recognize(idImage, 'jpn', {
      logger: m => console.log("🔢 id OCR progress:", m),
    }).then(({ data: { text } }) => {
      setOcrIdText(text.trim());
    });
  }, [idImage]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'black',
    }}>
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
      }}></div>

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
        gap: '8px'
      }}>
        {capturedImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>📷 全体</p>
            <img src={capturedImage} alt="Captured" style={{ width: '120px' }} />
          </div>
        )}
        {nameImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>🏷️ カード名</p>
            <img src={nameImage} alt="Card Name" style={{ width: '120px' }} />
            <p style={{ color: 'lightgreen', fontSize: '14px' }}>{ocrNameText}</p>
          </div>
        )}
        {idImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>🔢 型番</p>
            <img src={idImage} alt="Card ID" style={{ width: '120px' }} />
            <p style={{ color: 'lightblue', fontSize: '14px' }}>{ocrIdText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
