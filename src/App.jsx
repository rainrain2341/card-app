import { useEffect, useRef, useState } from 'react';

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);

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

  // 撮影処理（ガイド枠サイズ240x336を中央から切り出す）
  const captureToCanvas = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const guideWidth = 240;
    const guideHeight = 336;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const sx = (videoWidth - guideWidth) / 2;
    const sy = (videoHeight - guideHeight) / 2;

    canvas.width = guideWidth;
    canvas.height = guideHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      video,
      sx, sy, guideWidth, guideHeight,
      0, 0, guideWidth, guideHeight
    );

    const imageData = canvas.toDataURL('image/png');
    console.log("📸 撮影完了:", imageData);
    // OCR や AI に imageData を渡す処理はここに追加
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

      {/* ポケモンカード型ガイド枠 */}
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

      {/* カメラON/OFFボタン */}
      <button
        onClick={toggleCamera}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: cameraOn ? 'red' : 'green',
          color: 'white',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        {cameraOn ? 'カメラOFF' : 'カメラON'}
      </button>

      {/* 撮影ボタン */}
      <button
        onClick={captureToCanvas}
        style={{
          position: 'absolute',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        撮影して識別
      </button>
    </div>
  );
}

export default App;
