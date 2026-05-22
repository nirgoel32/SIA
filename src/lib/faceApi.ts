/**
 * Thin wrapper around @vladmandic/face-api.
 *
 * - Loads models lazily from /face-api-models (served from public/).
 * - Reads images via crossOrigin="anonymous" so the canvas isn't tainted.
 * - Computes a 128-dim face descriptor for the largest face in an image.
 * - Compares two descriptors using Euclidean distance, the metric the
 *   face_recognition_model was trained for. The library's convention is
 *   ~0.6 distance = recognition threshold; we map distance to a 0–100
 *   confidence score for display.
 */

import type * as FaceApiNS from "@vladmandic/face-api";

const MODEL_URL = "/face-api-models";

type FaceApi = typeof FaceApiNS;

let faceApiPromise: Promise<FaceApi> | null = null;
let modelsLoaded = false;

async function loadFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = import("@vladmandic/face-api").then((mod) => {
      // The package's default export is the namespace itself in ESM builds.
      return (mod.default ?? mod) as FaceApi;
    });
  }
  return faceApiPromise;
}

async function ensureModels(api: FaceApi) {
  if (modelsLoaded) return;
  await Promise.all([
    api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function preloadFaceModels(): Promise<void> {
  const api = await loadFaceApi();
  await ensureModels(api);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

export async function descriptorFromUrl(
  url: string
): Promise<Float32Array | null> {
  const api = await loadFaceApi();
  await ensureModels(api);
  const img = await loadImage(url);
  const result = await api
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return result.descriptor;
}

export async function descriptorFromFile(
  file: File
): Promise<Float32Array | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read uploaded file"));
    r.readAsDataURL(file);
  });
  return descriptorFromUrl(dataUrl);
}

/** Euclidean distance between two face descriptors. */
export function distance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Map face-api distance to a 0–100 confidence score.
 *  Library convention: distance ≤ 0.6 = same person, ≤ 0.5 = strong, ≤ 0.4 = very strong. */
export function distanceToConfidence(d: number): number {
  if (!Number.isFinite(d)) return 0;
  // Linear-ish: 0.30 → 100, 0.60 → 50, 0.85+ → 0
  const clamped = Math.max(0.3, Math.min(0.85, d));
  const pct = 100 * (1 - (clamped - 0.3) / (0.85 - 0.3));
  return Math.round(pct);
}

export type Verdict = "match" | "possible" | "different";

export function verdictFor(d: number): Verdict {
  if (d <= 0.5) return "match";
  if (d <= 0.62) return "possible";
  return "different";
}
