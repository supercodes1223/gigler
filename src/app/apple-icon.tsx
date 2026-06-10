import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon: full-bleed square (iOS applies its own corner mask).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #6cc197 0%, #2f8f63 100%)",
          color: "#ffffff",
          fontSize: 116,
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
