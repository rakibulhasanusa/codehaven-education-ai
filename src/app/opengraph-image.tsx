import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 1020,
            background: "rgba(255,255,255,0.74)",
            border: "2px solid rgba(15,23,42,0.12)",
            borderRadius: 24,
            padding: "24px 28px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.14)",
          }}
        >
          <div style={{ display: "flex", fontSize: 72, fontWeight: 900, lineHeight: 1.06, color: "#0b1220" }}>
            AI Learning Intelligence
          </div>
          <div style={{ display: "flex", fontSize: 33, color: "#1e293b", fontWeight: 600 }}>
            Smart Exam Generation • Performance Analytics • Weakness Detection
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#0f766e", fontWeight: 700 }}>
          For BCS, Academic Learners, Coaching Centers & Institutions
        </div>
      </div>
    ),
    size
  );
}
