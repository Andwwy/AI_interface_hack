"use client";

import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  FilesetResolver,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";
import { useGalleryStore } from "@/store/useGalleryStore";

function handleGesture(detectedGesture: string): void {
  const { nextAlbum, prevAlbum } = useGalleryStore.getState();
  switch (detectedGesture) {
    case "Swipe_Right":
      nextAlbum();
      break;
    case "Swipe_Left":
      prevAlbum();
      break;
    default:
      break;
  }
}

const SWIPE_COOLDOWN_MS = 800;
const GESTURE_CONFIDENCE_MIN = 0.72;
const SWIPE_CONFIDENCE_MIN = 0.9;
const POINTING_INDEX_EXTENDED_MIN = 0.079;
const POINTING_DIRECTION_MIN = 0.079;

function isSingleFingerPointing(
  landmarks: { x: number; y: number }[]
): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const dIndex = dist(indexTip, indexPip);
  const dWristToIndex = dist(indexTip, wrist);
  const dWristToMiddle = dist(middleTip, wrist);
  const dWristToRing = dist(ringTip, wrist);
  const dWristToPinky = dist(pinkyTip, wrist);
  const indexExtended = dIndex >= POINTING_INDEX_EXTENDED_MIN;
  const indexLeading =
    dWristToIndex > dWristToMiddle &&
    dWristToIndex > dWristToRing &&
    dWristToIndex > dWristToPinky;
  return indexExtended && indexLeading;
}

function getPointingDirectionX(
  landmarks: { x: number; y: number }[]
): number | null {
  if (landmarks.length < 9) return null;
  const wrist = landmarks[0];
  const indexTip = landmarks[8];
  const dx = indexTip.x - wrist.x;
  if (Math.abs(dx) < POINTING_DIRECTION_MIN) return null;
  return dx;
}

function isLikelyOpenPalm(landmarks: { x: number; y: number }[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const dIndex = dist(landmarks[8], wrist);
  const dMiddle = dist(landmarks[12], wrist);
  const dRing = dist(landmarks[16], wrist);
  const dPinky = dist(landmarks[20], wrist);
  const extended = (d: number) => d > 0.1;
  return [dIndex, dMiddle, dRing, dPinky].filter(extended).length >= 3;
}

function isLikelyClosedFist(landmarks: { x: number; y: number }[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const dIndex = dist(landmarks[8], wrist);
  const dMiddle = dist(landmarks[12], wrist);
  const dRing = dist(landmarks[16], wrist);
  const dPinky = dist(landmarks[20], wrist);
  return Math.max(dIndex, dMiddle, dRing, dPinky) < 0.2;
}

export default function GestureController() {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number>();
  const lastSwipeTimeRef = useRef<number>(0);
  const [gestureRecognizer, setGestureRecognizer] =
    useState<GestureRecognizer | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        setGestureRecognizer(recognizer);
      } catch (e) {
        console.warn("Gesture recognition unavailable:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!gestureRecognizer) return;

    const predict = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const now = Date.now();
        const results = gestureRecognizer.recognizeForVideo(video, now);

        let pointingFired = false;
        const landmarks = results.landmarks?.[0];

        if (landmarks && isSingleFingerPointing(landmarks)) {
          const dirX = getPointingDirectionX(landmarks);
          const cooldownElapsed =
            now - lastSwipeTimeRef.current >= SWIPE_COOLDOWN_MS;
          if (dirX !== null && cooldownElapsed) {
            handleGesture(dirX < 0 ? "Swipe_Right" : "Swipe_Left");
            lastSwipeTimeRef.current = now;
            pointingFired = true;
          }
        }

        if (
          !pointingFired &&
          results.gestures &&
          results.gestures.length > 0
        ) {
          const top = results.gestures[0][0];
          const { categoryName } = top;
          const score = typeof top.score === "number" ? top.score : 0;

          if (
            (categoryName === "Swipe_Right" ||
              categoryName === "Swipe_Left") &&
            score >= GESTURE_CONFIDENCE_MIN &&
            score >= SWIPE_CONFIDENCE_MIN
          ) {
            const notOpenPalm = !landmarks || !isLikelyOpenPalm(landmarks);
            const notFist = !landmarks || !isLikelyClosedFist(landmarks);
            const cooldownElapsed =
              now - lastSwipeTimeRef.current >= SWIPE_COOLDOWN_MS;
            if (notOpenPalm && notFist && cooldownElapsed) {
              handleGesture(categoryName);
              lastSwipeTimeRef.current = now;
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    requestRef.current = requestAnimationFrame(predict);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gestureRecognizer]);

  return (
    <div
      className="absolute opacity-0 -z-10 pointer-events-none w-48 h-36 overflow-hidden"
      aria-hidden="true"
    >
      <Webcam
        ref={webcamRef}
        audio={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
    </div>
  );
}
