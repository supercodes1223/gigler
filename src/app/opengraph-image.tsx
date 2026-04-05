import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Gigler - All over text. Simple. Just done.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, marginBottom: 16 }}>
          Gigler
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            opacity: 0.9,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          All over text. Simple. Just done.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 20,
            opacity: 0.7,
          }}
        >
          AI that lives in your text messages
        </div>
      </div>
    ),
    { ...size }
  );
}
