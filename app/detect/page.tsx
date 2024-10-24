"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Define el tipo para ACTION_NAMES
const ACTION_NAMES: { [key: number]: string } = {
  1: 'Corriendo recto',
  2: 'Parado',
  3: 'Corriendo y Habilidad Especial',
  4: 'Corriendo y Yendo a Izquierda',
  5: 'Corriendo y Yendo a Derecha',
  6: 'Corriendo y Saltando a la izquierda',
  7: 'Corriendo y Saltando a la derecha',
  8: 'Corriendo y Saltando hacia adelante',
  0: 'Desconocido',
};

export default function Detect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseCode, setPoseCode] = useState<number | null>(null);
  
  // Añadido para la validación de detecciones
  const [detectionHistory, setDetectionHistory] = useState<number[]>([]);
  const historyLength = 2; // Número de fotogramas para verificar consistencia
  const minConsistency = 0.7; // Porcentaje mínimo de consistencia

  useEffect(() => {
    const onResults = (results: any) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw landmarks and connections
          if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 4,
            });
            drawLandmarks(ctx, results.poseLandmarks, {
              color: '#FF0000',
              lineWidth: 2,
            });

            // Classify the action based on the landmarks
            const actionCode = classifyAction(results.poseLandmarks);
            
            // Actualizar historial de detecciones
            setDetectionHistory(prevHistory => {
              const newHistory = [...prevHistory, actionCode].slice(-historyLength);
              if (newHistory.length === historyLength) {
                // Verificar consistencia
                const counts = newHistory.reduce((acc: any, code: number) => {
                  acc[code] = (acc[code] || 0) + 1;
                  return acc;
                }, {});
                const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                const consistency = counts[mostFrequent] / historyLength;
                
                if (consistency >= minConsistency) {
                  setPoseCode(Number(mostFrequent));
                }
              }
              return newHistory;
            });
          }
        }
      }
    };

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75,
    });
    pose.onResults(onResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await pose.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  const calculateAngle = (a: any, b: any, c: any) => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  const classifyAction = (landmarks: any) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    const leftWristY = leftWrist.y;
    const rightWristY = rightWrist.y;
    const leftShoulderY = leftShoulder.y;
    const rightShoulderY = rightShoulder.y;
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    const isBothWristsBelowHead = leftWrist.y > leftShoulder.y && rightWrist.y > rightShoulder.y;
    const isBothWristsNear = Math.abs(leftWrist.x - rightWrist.x) < 0.1 && Math.abs(leftWrist.y - rightWrist.y) < 0.1;
    const isBothWristsNearHip = Math.abs(leftWrist.y - leftHip.y) < 0.1 && Math.abs(rightWrist.y - rightHip.y) < 0.1;
    const isLeftArmStretched = leftElbowAngle >= 90 && leftElbowAngle <= 180;
    const isRightArmStretched = rightElbowAngle >= 90 && rightElbowAngle <= 180;
    const isBothArmsStretched = isLeftArmStretched && isRightArmStretched;

    // Codificación de acciones
    const ACTION_CODES = {
      RUNNING_STRAIGHT: 1,
      STANDING: 2,
      RUNNING_SPECIAL: 3,
      RUNNING_LEFT: 4,
      RUNNING_RIGHT: 5,
      JUMPING_LEFT: 6,
      JUMPING_RIGHT: 7,
      JUMPING_FORWARD: 8,
      UNKNOWN: 0,
    };

    if (isBothWristsBelowHead) {
      if (isBothWristsNear) {
        return ACTION_CODES.RUNNING_STRAIGHT;
      } else {
        if (isBothWristsNearHip) {
          return ACTION_CODES.STANDING;
        } else {
          if (isBothArmsStretched) {
            return ACTION_CODES.RUNNING_SPECIAL;
          } else if (isLeftArmStretched && !isRightArmStretched) {
            return ACTION_CODES.RUNNING_LEFT;
          } else if (isRightArmStretched && !isLeftArmStretched) {
            return ACTION_CODES.RUNNING_RIGHT;
          } else {
            return ACTION_CODES.RUNNING_STRAIGHT;
          }
        }
      }
    } else {
      if (leftWristY < leftShoulderY && rightWristY > rightShoulderY) {
        return ACTION_CODES.JUMPING_LEFT;
      } else if (rightWristY < rightShoulderY && leftWristY > leftShoulderY) {
        return ACTION_CODES.JUMPING_RIGHT;
      } else if (leftWristY < leftShoulderY && rightWristY < rightShoulderY) {
        return ACTION_CODES.JUMPING_FORWARD;
      }
    }
    return ACTION_CODES.UNKNOWN;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">Pose Detection</h1>
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} width="640" height="480" />
      <div className="mt-4 text-2xl">
        Action: {poseCode !== null ? ACTION_NAMES[poseCode as number] : 'N/A'}
      </div>
    </div>
  );
}
