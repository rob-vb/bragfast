import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const svgBuffer = await readFile(
    join(process.cwd(), "public", "logo-icon.svg")
  );
  const logoSrc = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF8F0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={120} height={124} />
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#4A3326",
              letterSpacing: "-2px",
            }}
          >
            brag.fast
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#4A3326",
              opacity: 0.7,
              maxWidth: "700px",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Auto-generate social images for your launches
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            {["landscape", "square", "portrait"].map((fmt) => (
              <div
                key={fmt}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  backgroundColor: "#F8AF3C",
                  color: "#4A3326",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {fmt}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
