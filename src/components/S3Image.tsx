"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getUrl } from "aws-amplify/storage";

interface S3ImageProps {
  path?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  quality?: number;
  unoptimized?: boolean;
  fadeIn?: boolean;
  onClick?: () => void;
}

const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 55;

const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==";

const isFullUrl = (p: string) => p.startsWith("https://") || p.startsWith("http://");
const isS3Url = (p: string) => p.includes(".s3.") && p.includes("amazonaws.com");

export function S3Image({
  path,
  alt,
  width,
  height,
  className = "",
  fadeIn = true,
  onClick,
}: S3ImageProps) {
  const cdnHost = (process.env.NEXT_PUBLIC_IMG_CDN || "").replace(/\/$/, "");

  const buildCdnUrl = useCallback(
    (imagePath: string): string | null => {
      if (!imagePath) return null;
      if (isFullUrl(imagePath)) {
        if (isS3Url(imagePath) && cdnHost) {
          try {
            const url = new URL(imagePath);
            const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
            return `${cdnHost}/${encodeURI(decodeURIComponent(key))}`;
          } catch {
            return imagePath;
          }
        }
        return imagePath;
      }
      if (cdnHost) {
        const normalizedKey = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
        return `${cdnHost}/${encodeURI(normalizedKey)}`;
      }
      return null;
    },
    [cdnHost],
  );

  const initialUrl = path ? buildCdnUrl(path) || BLUR_PLACEHOLDER : BLUR_PLACEHOLDER;
  const [imageUrl, setImageUrl] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState(initialUrl === BLUR_PLACEHOLDER);
  const [error, setError] = useState(false);
  const [blur, setBlur] = useState(initialUrl === BLUR_PLACEHOLDER);
  const didRetryRef = useRef(false);

  const getSignedUrl = useCallback(async (imagePath: string): Promise<string> => {
    const cached = urlCache.get(imagePath);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.url;
    }

    const decodedPath = decodeURIComponent(imagePath);
    const signedUrl = await getUrl({
      path: decodedPath,
      options: { validateObjectExistence: true, expiresIn: 3600 },
    });

    const url = signedUrl.url.toString();
    urlCache.set(imagePath, { url, timestamp: now });
    return url;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      if (!path) {
        setImageUrl(BLUR_PLACEHOLDER);
        setIsLoading(false);
        return;
      }

      const preferred = buildCdnUrl(path);
      if (preferred && preferred !== BLUR_PLACEHOLDER) {
        if (mounted) {
          setImageUrl(preferred);
          setError(false);
          setBlur(false);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const url = await getSignedUrl(path);
        if (mounted) {
          setImageUrl(url);
          setError(false);
          setTimeout(() => setBlur(false), 100);
        }
      } catch (err) {
        console.error("Error loading S3 image:", err);
        if (mounted) {
          setImageUrl(BLUR_PLACEHOLDER);
          setError(true);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadImage();
    return () => {
      mounted = false;
    };
  }, [path, buildCdnUrl, getSignedUrl]);

  const handleError = async () => {
    if (!didRetryRef.current && path && !isFullUrl(path)) {
      try {
        didRetryRef.current = true;
        const url = await getSignedUrl(path);
        setImageUrl(url);
        setError(false);
        return;
      } catch (err) {
        console.error("Retry with signed URL failed:", err);
      }
    }
    setError(true);
    setBlur(false);
  };

  return (
    <div
      className={`relative overflow-hidden ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      style={{ width, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        className={`
          w-full h-full object-cover
          ${fadeIn ? "transition-all duration-300" : ""}
          ${fadeIn ? (isLoading ? "opacity-0" : "opacity-100") : "opacity-100"}
          ${fadeIn ? (blur ? "blur-sm scale-105" : "blur-0 scale-100") : ""}
          ${className}
        `}
        onError={handleError}
        onLoad={() => setBlur(false)}
        loading="lazy"
      />

      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ width, height }}
        />
      )}

      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          style={{ width, height }}
        >
          <span className="text-sm text-gray-500">Failed to load</span>
        </div>
      )}
    </div>
  );
}

export const clearImageCache = () => urlCache.clear();
