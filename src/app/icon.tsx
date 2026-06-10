import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: white G on the spring gradient, matching the brand avatar.
export default function Icon() {
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
          borderRadius: 14,
          color: "#ffffff",
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
