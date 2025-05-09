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
  const [cardName, setCardName] = useState('');
  const [cardId, setCardId] = useState('');

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
          const binary = avg > 150 ? 255 : 0; // 白黒のしきい値
          data[i] = data[i + 1] = data[i + 2] = binary;
        }
  
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };
  
  
  // 拡大つき切り出し
  const cropRegion = (image, x, y, width, height, scale = 2) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = image;

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = width * scale;
        canvas.height = height * scale;

        ctx.drawImage(img, x, y, width, height, 0, 0, width * scale, height * scale);
        resolve(canvas.toDataURL());
      };
    });
  };

  const runOCR = async (imageDataURL) => {
    const result = await Tesseract.recognize(imageDataURL, 'jpn+eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ',
    });
    return result.data.text.trim();
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

      const nameCrop = await cropRegion(preprocessed, 0, 20, 240, 40, 2);
      setNameImage(nameCrop);
      const nameText = await runOCR(nameCrop);
      setCardName(nameText);

      const idCrop = await cropRegion(preprocessed, 0, 316, 120, 20, 2);
      setIdImage(idCrop);
      const idText = await runOCR(idCrop);
      setCardId(idText);
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

      {/* 撮影枠 */}
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

      {/* ボタン */}
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

      {/* 非表示Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* プレビューとOCR結果 */}
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
            <p style={{ color: 'white', margin: 0 }}>🏷️ カード名：{cardName}</p>
            <img src={nameImage} alt="Card Name" style={{ width: '120px' }} />
          </div>
        )}
        {idImage && (
          <div>
            <p style={{ color: 'white', margin: 0 }}>🔢 型番：{cardId}</p>
            <img src={idImage} alt="Card ID" style={{ width: '120px' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

