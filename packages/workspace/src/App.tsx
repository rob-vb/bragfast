import { useEffect, useState } from "react";
import { fetchRepoContext } from "./api";
import type { RepoContext } from "./types";

export default function App() {
  const [context, setContext] = useState<RepoContext | null>(null);

  useEffect(() => {
    fetchRepoContext().then(setContext).catch(() => undefined);
  }, []);

  return (
    <main
      style={{
        fontFamily: "Geist, monospace",
        background: "#FFF8F0",
        minHeight: "100vh",
        padding: "2rem",
        color: "#4A3326",
      }}
    >
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "14px",
          marginBottom: "2rem",
          borderBottom: "3px solid #4A3326",
          paddingBottom: "1rem",
          boxShadow: "none",
        }}
      >
        ▸ brag.fast Workspace
      </h1>
      {context === null ? (
        <p style={{ fontFamily: "Geist, monospace", fontSize: "14px" }}>
          Loading...
        </p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "480px",
            border: "2px solid #4A3326",
            boxShadow: "4px 4px 0 #4A3326",
          }}
        >
          <tbody>
            {(
              [
                ["name", context.name],
                ["version", context.version],
                ["sha", context.sha],
                ["tag", context.tag],
              ] as [string, string | null][]
            ).map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid #4A3326" }}>
                <td
                  style={{
                    padding: "0.5rem 1rem",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "10px",
                    width: "100px",
                    borderRight: "2px solid #4A3326",
                    background: "#4A3326",
                    color: "#F8AF3C",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "0.5rem 1rem",
                    fontFamily: "Geist Mono, monospace",
                    fontSize: "13px",
                    color: value ? "#4A3326" : "#aaa",
                  }}
                >
                  {value ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
