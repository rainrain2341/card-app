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
    </div>
  );
}

export default App;
