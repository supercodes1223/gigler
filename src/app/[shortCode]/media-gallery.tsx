"use client";

import { useState } from "react";
import { S3Image } from "@/components/S3Image";

interface MediaItem {
  mediaId: string;
  s3Key: string;
  type: string | null;
  uploadedBy: string | null;
  caption: string | null;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = media.filter((m) => m.type === "photo");
  if (images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const prev = () =>
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  const next = () =>
    setLightboxIndex((i) => (i + 1) % images.length);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">Photos</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <button
            key={img.mediaId}
            onClick={() => openLightbox(idx)}
            className="relative aspect-square rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            <S3Image
              path={img.s3Key}
              alt={img.caption || `Gig photo ${idx + 1}`}
              width={200}
              height={200}
              className="group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Previous arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Full-size image */}
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw]">
            <S3Image
              path={images[lightboxIndex].s3Key}
              alt={images[lightboxIndex].caption || `Gig photo ${lightboxIndex + 1}`}
              width={1200}
              height={900}
              className="max-h-[90vh] max-w-[90vw] object-contain !w-auto !h-auto"
              fadeIn={false}
            />
          </div>

          {/* Next arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}

          {/* Caption */}
          {images[lightboxIndex].caption && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg max-w-md text-center">
              {images[lightboxIndex].caption}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
