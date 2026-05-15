import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at 20% 15%, rgba(37,99,235,0.30), transparent 35%), radial-gradient(circle at 80% 20%, rgba(13,148,136,0.25), transparent 35%), linear-gradient(135deg, #f8fbff 0%, #eef6ff 55%, #eaf9f5 100%)",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#1d4ed8" }}>
          CodeHaven Education AI
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 980 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
            AI Learning Intelligence System
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#334155" }}>
            Smart Exam Platform with Deep Analytics
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#0f766e", fontWeight: 600 }}>
          codehaveneduai.com
        </div>
      </div>
    ),
    size
  );
}
