"use client";

import React, { useState, useEffect } from 'react';
import styles from './Game.module.css';

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
    const playerRect = document.querySelector(`.${styles.player}`)!.getBoundingClientRect();
    obstacles.forEach(obstacle => {
      const obstacleRect = document.querySelector(`.${styles.obstacle}[data-id="${obstacle.id}"]`)!.getBoundingClientRect();
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

    const enemyRect = document.querySelector(`.${styles.enemy}`)!.getBoundingClientRect();
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

  useEffect(() => {
    const enemyInterval = setInterval(() => {
      setEnemyPosition(prev => {
        const playerRect = document.querySelector(`.${styles.player}`)!.getBoundingClientRect();
        const enemyRect = document.querySelector(`.${styles.enemy}`)!.getBoundingClientRect();

        if (!movingForward) {
          const enemyX = prev.x + (playerRect.left - enemyRect.left) * 0.05;
          const enemyY = prev.y + (playerRect.top - enemyRect.top) * 0.05;
          return { x: enemyX, y: enemyY };
        } else {
          const enemyLane = Math.floor(playerLeft / (gameWidth / 3));
          const targetX = enemyLane * (gameWidth / 3) + (gameWidth / 3 - 100) / 2;
          return {
            x: prev.x + (targetX - prev.x) * 0.1,
            y: window.innerHeight - 100
          };
        }
      });
    }, 50);

    return () => clearInterval(enemyInterval);
  }, [movingForward, playerLeft]);

  const obstacleElements = obstacles.map((obstacle) => (
    <div
      key={obstacle.id}
      className={styles.obstacle}
      data-id={obstacle.id}
      style={{ top: `${obstacle.y}px`, left: `${obstacle.lane * (gameWidth / 3) + (gameWidth / 3 - 100) / 2}px` }}
    />
  ));

  const enemyElement = (
    <div
      className={styles.enemy}
      style={{ top: `${enemyPosition.y}px`, left: `${enemyPosition.x}px` }}
    />
  );

  return (
    <div className={styles.gameContainer} style={{ width: `${gameWidth}px`, height: '100vh' }}>
      <div className={styles.player} style={{ left: `${playerLeft}px`, top: `${playerTop}px` }} />
      {obstacleElements}
      {enemyElement}
      <div className={styles.score}>Score: {score}</div>
    </div>
  );
};

export default Game;
