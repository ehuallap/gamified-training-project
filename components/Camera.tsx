import React, { useEffect } from 'react';

interface CameraProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const Camera: React.FC<CameraProps> = ({ videoRef }) => {
  useEffect(() => {
    const setupCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
            };
          }
        } catch (error) {
          console.error('Error accessing the camera', error);
        }
      }
    };

    setupCamera();
  }, [videoRef]);

  return <video ref={videoRef} width="600" height="450" autoPlay playsInline />;
};

export default Camera;
