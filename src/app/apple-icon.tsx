import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 104,
          background: "linear-gradient(135deg, #020617 0%, #1e1b4b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          borderRadius: 36,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        B
      </div>
    ),
    { ...size }
  );
}