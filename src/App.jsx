import { useEffect, useRef, useState } from 'react';

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null); // プレビュー画像用

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          console.log("✅ カメラ取得成功");
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

  const toggleCamera = () => {
    setCameraOn(prev => !prev);
  };

  // ⬇️ グレースケール処理関数（補正）
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
          data[i] = data[i + 1] = data[i + 2] = avg; // グレースケール化
        }

        ctx.putImageData(imageData, 0, 0);

        const preprocessed = canvas.toDataURL();
        resolve(preprocessed);
      };
    });
  };

  // ⬇️ 撮影＋補正処理
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

      const preprocessed = await preprocessImage(dataUrl); // ←補正後画像を保存
      setCapturedImage(preprocessed);
    }
  };

  return (
    <div className="container" style={{
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
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {/* ガイド枠 */}
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
          border: 'none',
          backgroundColor: cameraOn ? 'red' : 'green',
          color: 'white',
          cursor: 'pointer'
        }}>
          {cameraOn ? 'カメラOFF' : 'カメラON'}
        </button>
        <button onClick={captureToCanvas} style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'blue',
          color: 'white',
          cursor: 'pointer'
        }}>
          撮影
        </button>
      </div>

      {/* Canvas (非表示) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 撮影画像プレビュー */}
      {capturedImage && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          border: '2px solid white'
        }}>
          <img src={capturedImage} alt="preview" style={{ width: '120px', height: '168px' }} />
        </div>
      )}
    </div>
  );
}

export default App;