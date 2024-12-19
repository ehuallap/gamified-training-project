"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { useRouter } from 'next/navigation';

const PlayerDetection = () => {
  const [playerPosition, setPlayerPosition] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("Detectando cámara");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const router = useRouter(); // Para redirigir a la ruta "/second"

  useEffect(() => {
    const setupDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    };

    setupDevices();
  }, []);

  useEffect(() => {
    let stream = null;
    let noPointsDetectedCounter = 0;

    const setupCamera = async () => {
      if (!selectedDeviceId) return;

      const video = videoRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId },
      });
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      detectPose();
    };

    const detectPose = async () => {
      await tf.ready();
      await tf.setBackend('webgl');

      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const detect = async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          requestAnimationFrame(detect);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const poses = await detector.estimatePoses(video);

        if (poses && poses.length > 0 && poses[0].keypoints.some((kp) => kp.score > 0.5)) {
          noPointsDetectedCounter = 0;
          setCameraStatus("Cámara detectada");
          const keypoints = poses[0].keypoints;
          drawKeypoints(keypoints, ctx);

          const isStanding = checkIfStanding(keypoints);
          setPlayerPosition(isStanding ? 'standing' : 'sitting');
          setAnalysisComplete(true);

          // Verificar si los brazos están levantados
          if (checkIfArmsRaised(keypoints)) {
            router.push("/game"); // Redirigir a "/second" si los brazos están levantados
          }
        } else {
          noPointsDetectedCounter++;

          if (noPointsDetectedCounter >= 120) { // Aproximadamente 2 segundos (60 fps)
            switchCamera();
            noPointsDetectedCounter = 0;
          }
        }

        requestAnimationFrame(detect);
      };

      detect();
    };

    const switchCamera = () => {
      const currentIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
      setCameraStatus("Detectando cámara");
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, devices, router]);

  const checkIfStanding = (keypoints) => {
    const leftHip = keypoints.find((kp) => kp.name === 'left_hip');
    const rightHip = keypoints.find((kp) => kp.name === 'right_hip');
    const leftKnee = keypoints.find((kp) => kp.name === 'left_knee');
    const rightKnee = keypoints.find((kp) => kp.name === 'right_knee');

    if (leftHip && rightHip && leftKnee && rightKnee) {
      const hipAverageY = (leftHip.y + rightHip.y) / 2;
      const kneeAverageY = (leftKnee.y + rightKnee.y) / 2;

      return hipAverageY < kneeAverageY;
    }

    return false;
  };

  const checkIfArmsRaised = (keypoints) => {
    const leftShoulder = keypoints.find((kp) => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find((kp) => kp.name === 'right_shoulder');
    const leftElbow = keypoints.find((kp) => kp.name === 'left_elbow');
    const rightElbow = keypoints.find((kp) => kp.name === 'right_elbow');

    // Verificar si los codos están más arriba que los hombros
    return (
      leftShoulder && rightShoulder && leftElbow && rightElbow &&
      leftElbow.y < leftShoulder.y && rightElbow.y < rightShoulder.y
    );
  };

  const drawKeypoints = (keypoints, ctx) => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'blue';
        ctx.fill();
      }
    });
  };

  return (
    <div style={{
      backgroundColor: '#f0f8ff',
      color: '#003366',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
    }}>
      <h1 style={{
        fontSize: '36px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center',
        color: '#003366',
      }}>MONKA!</h1>

      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#003366',
        marginBottom: '20px',
      }}>
        {cameraStatus}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div style={{ position: 'relative', width: '640px', height: '480px', marginRight: '40px' }}>
          <video ref={videoRef} style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }} playsInline muted></video>
          <canvas ref={canvasRef} style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}></canvas>
        </div>

        {analysisComplete && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '10px',
            border: '2px solid #003366',
            width: '250px', // Aumento el tamaño del cuadro del GIF
          }}>
            <img src="https://media.tenor.com/TXJfK9SC8k0AAAAM/dr-mike-sarahmcfadyen.gif" alt="loading" style={{
              width: '120px', // Aumento el tamaño del GIF
              height: '120px',
              marginBottom: '20px',
            }} />
            <p style={{
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>PARA INICIAR</p>
          </div>
        )}
      </div>

      {analysisComplete ? (
        <div style={{
          padding: '10px 20px',
          border: '2px solid #003366',
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          marginBottom: '20px',
          fontSize: '18px',
          color: '#003366',
        }}>
          <p>Vas a realizar la pausa activa: <strong>{playerPosition === 'standing' ? 'PARADO' : 'SENTADO'}</strong></p>
        </div>
      ) : (
        <div style={{
          padding: '10px 20px',
          border: '2px solid #003366',
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          marginBottom: '20px',
        }}>
          <p>Analizando la posición del jugador...</p>
        </div>
      )}
    </div>
  );
};

export default PlayerDetection;
