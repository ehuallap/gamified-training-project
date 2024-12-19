"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import './styles.css';

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

const Game = () => {
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<{ x: number; lane: number; y: number; id: number }[]>([]);
  const [jumping, setJumping] = useState(false);
  const [score, setScore] = useState(0);
  const [playerLeft, setPlayerLeft] = useState(0);
  const [movingForward, setMovingForward] = useState(false);
  const [enemyPosition, setEnemyPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startTime, setStartTime] = useState(Date.now());
  const [playerTop, setPlayerTop] = useState(0);
  const [previousPatternId, setPreviousPatternId] = useState<number | null>(null);
  const [currentPatternId, setCurrentPatternId] = useState<number | null>(null);
  const [isGrounded, setIsGrounded] = useState(true);

  const gameWidth = window.innerWidth * 0.75;

  useEffect(() => {
    if (typeof gameWidth !== 'undefined') {
      setEnemyPosition({ x: gameWidth / 2, y: window.innerHeight - 500 });
      setPlayerTop(window.innerHeight / 2 + 100);
    }
  }, []);

  const movePlayer = (direction: 'left' | 'right') => {
    if (direction === 'left' && playerLane > 0) {
      setPlayerLane(playerLane - 1);
    } else if (direction === 'right' && playerLane < 2) {
      setPlayerLane(playerLane + 1);
    }
  };

  const jump = () => {
    if (isGrounded) {
      setJumping(true);
      setIsGrounded(false);
    }
  };

  useEffect(() => {
    if (jumping) {
      const jumpDuration = 900;
      const jumpHeight = 220;
      const startTime = Date.now();
      
      const jumpInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const t = elapsed / jumpDuration;
        const jumpPeak = jumpHeight * Math.sin(Math.PI * t);

        if (elapsed < jumpDuration) {
          setPlayerTop(window.innerHeight / 2 + 100 - jumpPeak);
        } else {
          setPlayerTop(window.innerHeight / 2 + 100);
          setJumping(false);
          setIsGrounded(true);
          clearInterval(jumpInterval);
        }
      }, 16);

      return () => clearInterval(jumpInterval);
    }
  }, [jumping]);

  const checkCollisions = () => {
    const playerRect = document.querySelector('.player')!.getBoundingClientRect();
    obstacles.forEach(obstacle => {
      const obstacleRect = document.querySelector(`.obstacle[data-id="${obstacle.id}"]`)!.getBoundingClientRect();
      if (
        playerRect.left < obstacleRect.right &&
        playerRect.right > obstacleRect.left &&
        playerRect.bottom > obstacleRect.top &&
        playerRect.top < obstacleRect.bottom &&
        !jumping
      ) {
        resetGame();
      }
    });

    const enemyRect = document.querySelector('.enemy')!.getBoundingClientRect();
    if (
      playerRect.left < enemyRect.right &&
      playerRect.right > enemyRect.left &&
      playerRect.bottom > enemyRect.top &&
      playerRect.top < enemyRect.bottom
    ) {
      resetGame();
    }
  };

  const resetGame = () => {
    setObstacles([]);
    setScore(0);
    setPlayerLane(1);
    setJumping(false);
    setEnemyPosition({ x: gameWidth / 2, y: window.innerHeight - 100 });
    setStartTime(Date.now());
    setPreviousPatternId(null);
    setCurrentPatternId(null);
    setIsGrounded(true);
    setPlayerTop(window.innerHeight / 2 + 100);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        jump();
      } if (event.key === 'ArrowLeft') {
        movePlayer('left');
      } if (event.key === 'ArrowRight') {
        movePlayer('right');
      } if (event.key === 'ArrowUp') {
        setMovingForward(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setMovingForward(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerLane, jumping, isGrounded]);

  useEffect(() => {
    const interval = setInterval(() => {
      setObstacles(obstacles => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const obstacleSpawnProbability = 0.05 + Math.min(0.3, elapsedTime * 0.01);
        const speedMultiplier = 1 + score * 0.05;

        const predefinedPatterns = [
          [{ lane: 0, x: 0 }, { lane: 2, x: 1 }],
          [{ lane: 1, x: 0 }, { lane: 0, x: 1 }, { lane: 2, x: 2 }],
          [{ lane: 0, x: 0 }, { lane: 1, x: 1 }],
          [{ lane: 1, x: 0 }, { lane: 2, x: 1 }],
          [{ lane: 1, x: 0 }, { lane: 0, x: 0 }, { lane: 2, x: 0 }],
        ];

        const updatedObstacles = obstacles
          .map(obstacle => ({
            ...obstacle,
            y: movingForward ? obstacle.y + 30 * speedMultiplier : obstacle.y
          }))
          .filter(obstacle => obstacle.y < window.innerHeight * 1.1);

        checkCollisions();

        if (Math.random() < obstacleSpawnProbability) {
          let selectedPattern;
          let patternId;

          do {
            patternId = Math.floor(Math.random() * predefinedPatterns.length);
            selectedPattern = predefinedPatterns[patternId];
          } while (patternId === previousPatternId || patternId === currentPatternId);

          setPreviousPatternId(currentPatternId);
          setCurrentPatternId(patternId);

          const newObstacles = selectedPattern.map((obstacle, index) => ({
            id: Date.now() + index,
            lane: obstacle.lane,
            x: obstacle.x,
            y: -100
          }));

          const noOverlap = updatedObstacles.every(ob => {
            return !newObstacles.some(no => Math.abs(no.y - ob.y) < 200 && no.lane === ob.lane);
          });

          return noOverlap ? [...updatedObstacles, ...newObstacles] : updatedObstacles;
        }

        return updatedObstacles;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [obstacles, movingForward, startTime, score, previousPatternId, currentPatternId]);

  useEffect(() => {
    const scoreInterval = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const newScore = Math.floor(elapsedTime + Math.pow(1.05, elapsedTime) - 1);
      setScore(newScore);
    }, 1000);

    return () => clearInterval(scoreInterval);
  }, [startTime]);

  useEffect(() => {
    if (typeof gameWidth !== 'undefined') {
      setPlayerLeft(playerLane * (gameWidth / 3) + (gameWidth / 3 - 100) / 2);
    }
  }, [playerLane]);

  const obstacleElements = obstacles.map((obstacle) => (
    <div
      key={obstacle.id}
      className="obstacle"
      data-id={obstacle.id}
      style={{ top: `${obstacle.y}px`, left: `${obstacle.lane * (gameWidth / 3) + (gameWidth / 3 - 100) / 2}px` }}
    />
  ));

  const enemyElement = (
    <div
      className="enemy"
      style={{ top: `${enemyPosition.y}px`, left: `${enemyPosition.x}px` }}
    />
  );

  // Detect component starts here
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseCode, setPoseCode] = useState<number | null>(null);
  
  const [detectionHistory, setDetectionHistory] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const historyLength = 2;
  const minConsistency = 0.7;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
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

          if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 4,
            });
            drawLandmarks(ctx, results.poseLandmarks, {
              color: '#FF0000',
              lineWidth: 2,
            });

            const actionCode = classifyAction(results.poseLandmarks);

            setDetectionHistory(prevHistory => {
              const newHistory = [...prevHistory, actionCode];
              return newHistory.length > historyLength ? newHistory.slice(1) : newHistory;
            });

            const mode = determineMode();
            setPoseCode(mode);
          }
        }
      }
    };

    const pose = new Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${POSE.VERSION}/${file}`;
      }
    });
    pose.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    pose.onResults(onResults);

    const camera = new Camera(videoRef.current!, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480
    });
    camera.start();
  }, []);

  const classifyAction = (poseLandmarks: any) => {
    // Logic to classify the action based on poseLandmarks
    return 1; // For now, just a placeholder
  };

  const determineMode = () => {
    // Logic to determine mode
    return 1; // For now, just a placeholder
  };

  // Rendering of game components
  return (
    <div className="game">
      <div className="gameArea">
        <video
          ref={videoRef}
          className="video"
          autoPlay
          muted
          width="640"
          height="480"
        ></video>
        <canvas
          ref={canvasRef}
          className="canvas"
          width="640"
          height="480"
        ></canvas>
        {enemyElement}
        {obstacleElements}
        <div className="player" style={{ top: `${playerTop}px`, left: `${playerLeft}px` }} />
        <div className="scoreboard">
          <span>Score: {score}</span>
          <span>Time: {formatTime(timeRemaining)}</span>
        </div>
      </div>
    </div>
  );
};

export default Game;
