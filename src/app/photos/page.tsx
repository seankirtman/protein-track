"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { JournalCard } from "@/components/layout/JournalCard";
import {
  getPhoto,
  getPhotosInRange,
  uploadPhoto,
  savePhoto,
  deletePhoto,
} from "@/lib/database";
import { compressPhoto } from "@/lib/photoUtils";
import type { PhotoEntry } from "@/types";
import Image from "next/image";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PhotosPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [photo, setPhoto] = useState<PhotoEntry | null>(null);
  const [gallery, setGallery] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compareDate, setCompareDate] = useState<string | null>(null);
  const [comparePhoto, setComparePhoto] = useState<PhotoEntry | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const dateStr = dateKey(selectedDate);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [p, start, end] = [
          getPhoto(user.id, dateStr),
          (() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 7);
            return dateKey(d);
          })(),
          dateStr,
        ];
        const [photoData, galleryData] = await Promise.all([
          p,
          getPhotosInRange(user.id, start, end),
        ]);
        setPhoto(photoData);
        setGallery(galleryData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, dateStr, selectedDate]);

  useEffect(() => {
    if (!user || !compareDate) {
      setComparePhoto(null);
      return;
    }
    getPhoto(user.id, compareDate).then(setComparePhoto);
  }, [user?.id, compareDate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const blob = await compressPhoto(file);
      const url = await uploadPhoto(user.id, dateStr, blob);
      const entry: PhotoEntry = {
        id: dateStr,
        date: dateStr,
        photoURL: url,
      };
      await savePhoto(user.id, entry);
      setPhoto(entry);
      setGallery((prev) => {
        const filtered = prev.filter((p) => p.date !== dateStr);
        return [entry, ...filtered];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openWebcam = useCallback(async () => {
    setWebcamOpen(true);
    setWebcamReady(false);
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setWebcamReady(true);
      }
    } catch {
      setWebcamError("Unable to access camera. Please allow camera permissions.");
    }
  }, []);

  const closeWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamOpen(false);
    setWebcamReady(false);
    setWebcamError(null);
  }, []);

  const [captureError, setCaptureError] = useState<string | null>(null);

  const captureWebcam = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !user) return;

    // Grab dimensions before closing the stream
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      setCaptureError("Camera not ready yet — try again.");
      closeWebcam();
      return;
    }

    // Draw the frame to an off-screen canvas (mirrored to match preview)
    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);

    // Stop the webcam stream now — canvas already has the frame
    closeWebcam();
    setUploading(true);
    setCaptureError(null);

    try {
      // Convert canvas directly to a JPEG blob (already compressed)
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas capture failed"))),
          "image/jpeg",
          0.85
        );
      });

      const url = await uploadPhoto(user.id, dateStr, blob);
      const entry: PhotoEntry = { id: dateStr, date: dateStr, photoURL: url };
      await savePhoto(user.id, entry);
      setPhoto(entry);
      setGallery((prev) => {
        const filtered = prev.filter((p) => p.date !== dateStr);
        return [entry, ...filtered];
      });
    } catch (err: unknown) {
      console.error("Webcam capture failed:", err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setCaptureError(msg);
    } finally {
      setUploading(false);
    }
  }, [user, dateStr, closeWebcam]);

  // Clean up webcam on unmount or date change
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleTakePhoto = () => {
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      openWebcam();
    }
  };

  const handleDeletePhoto = async () => {
    if (!user || !photo) return;
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deletePhoto(user.id, dateStr);
      setPhoto(null);
      setGallery((prev) => prev.filter((p) => p.date !== dateStr));
      if (compareDate === dateStr) setCompareDate(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = dateStr === dateKey(new Date());

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ink/70">
        Sign in to use the photo tracker.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-2 py-3 sm:px-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-xs sm:text-sm text-ink/50 hover:text-rust mb-2 sm:mb-3 px-1">
        ← Dashboard
      </Link>
      <JournalCard className="!p-3 sm:!p-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={goPrevDay}
              className="rounded px-2 py-1 sm:px-3 text-ink/70 hover:bg-aged/50"
            >
              ←
            </button>
            <h1 className="font-heading text-base sm:text-xl font-bold text-ink">
              {formatShortDate(selectedDate)}
              {isToday && (
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-rust">Today</span>
              )}
            </h1>
            <button
              onClick={goNextDay}
              className="rounded px-2 py-1 sm:px-3 text-ink/70 hover:bg-aged/50"
            >
              →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="aspect-square animate-pulse rounded bg-aged" />
        ) : photo?.photoURL ? (
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded border-2 border-leather/30">
              <Image
                src={photo.photoURL}
                alt={`Photo for ${dateStr}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {captureError && (
              <p className="text-sm text-red-600">{captureError}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleTakePhoto}
                disabled={uploading}
                className="rounded bg-rust px-4 py-2 text-sm sm:text-base text-white hover:bg-rust/90 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Replace photo"}
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploading}
                className="rounded border border-rust px-4 py-2 text-sm sm:text-base text-rust hover:bg-rust/10 disabled:opacity-50"
              >
                Choose from library
              </button>
              <button
                onClick={handleDeletePhoto}
                disabled={deleting}
                className="rounded border border-red-300 px-4 py-2 text-sm sm:text-base text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete photo"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {captureError && (
              <p className="mb-3 text-sm text-red-600">{captureError}</p>
            )}
            {uploading ? (
              <div className="w-full rounded-lg border-2 border-dashed border-leather/40 py-12 text-center text-ink/60">
                Uploading…
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleTakePhoto}
                  className="flex-1 rounded-lg border-2 border-dashed border-leather/40 py-8 text-ink/60 hover:border-rust/50 hover:text-rust"
                >
                  <span className="block text-2xl mb-1">📷</span>
                  Take photo
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 rounded-lg border-2 border-dashed border-leather/40 py-8 text-ink/60 hover:border-rust/50 hover:text-rust"
                >
                  <span className="block text-2xl mb-1">🖼</span>
                  Choose from library
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-ink">
                Compare photos
              </h3>
              <p className="text-[10px] sm:text-xs text-ink/50">
                Tap a recent photo or pick a date
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={compareDate ?? ""}
                max={dateStr}
                onChange={(e) =>
                  setCompareDate(e.target.value || null)
                }
                className="rounded border border-leather/30 bg-paper px-2 py-1 text-xs sm:text-sm text-ink focus:border-rust focus:outline-none"
              />
              {compareDate && (
                <button
                  onClick={() => setCompareDate(null)}
                  className="text-xs text-ink/50 hover:text-rust"
                  title="Clear comparison"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {gallery.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {gallery.map((p) => {
                const d = new Date(p.date + "T12:00:00");
                const label = d.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const isSelected = compareDate === p.date;
                const isCurrent = p.date === dateStr;
                return (
                  <button
                    key={p.date}
                    onClick={() =>
                      setCompareDate(isSelected ? null : p.date)
                    }
                    className="flex-shrink-0 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`relative h-20 w-20 overflow-hidden rounded border-2 ${
                        isCurrent
                          ? "border-rust"
                          : isSelected
                          ? "border-rust/60"
                          : "border-leather/20 hover:border-leather/40"
                      }`}
                    >
                      <Image
                        src={p.photoURL}
                        alt={p.date}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span
                      className={`text-[10px] leading-tight ${
                        isCurrent
                          ? "font-semibold text-rust"
                          : isSelected
                          ? "font-semibold text-rust/60"
                          : "text-ink/50"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {compareDate && (
          <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <p className="mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-ink">
                {formatShortDate(selectedDate)}
              </p>
              {photo?.photoURL && (
                <div className="relative aspect-square overflow-hidden rounded border border-leather/30">
                  <Image
                    src={photo.photoURL}
                    alt={dateStr}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-ink">
                {formatShortDate(new Date(compareDate + "T12:00:00"))}
              </p>
              {comparePhoto?.photoURL ? (
                <div className="relative aspect-square overflow-hidden rounded border border-leather/30">
                  <Image
                    src={comparePhoto.photoURL}
                    alt={compareDate}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="aspect-square rounded border border-leather/20 bg-aged/30 flex items-center justify-center text-ink/50 text-sm">
                  No photo
                </div>
              )}
            </div>
            <button
              onClick={() => setCompareDate(null)}
              className="col-span-2 text-sm text-ink/60 hover:underline"
            >
              Close comparison
            </button>
          </div>
        )}
      </JournalCard>

      {/* Webcam capture modal */}
      {webcamOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
          <div className="relative w-full sm:max-w-lg rounded-t-xl sm:rounded-lg bg-paper p-4 shadow-xl">
            <h3 className="mb-3 font-heading text-lg font-bold text-ink">
              Take a photo
            </h3>

            {webcamError ? (
              <div className="rounded bg-red-50 p-4 text-center text-sm text-red-700">
                {webcamError}
              </div>
            ) : (
              <div className="relative aspect-square overflow-hidden rounded bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!webcamReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    Starting camera…
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-center gap-3">
              {!webcamError && (
                <button
                  onClick={captureWebcam}
                  disabled={!webcamReady || uploading}
                  className="rounded-full bg-rust px-6 py-2 font-medium text-white hover:bg-rust/90 disabled:opacity-50"
                >
                  {uploading ? "Saving…" : "Capture"}
                </button>
              )}
              <button
                onClick={closeWebcam}
                className="rounded-full border border-leather/40 px-6 py-2 text-ink/70 hover:bg-aged/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
