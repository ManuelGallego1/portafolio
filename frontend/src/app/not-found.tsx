"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [path, setPath] = useState("/pagina-perdida");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      setPath(window.location.pathname);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        background: "#09090B",
        backgroundImage:
          "linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        fontFamily: "'Geist Mono', monospace",
        color: "#A1A1AA",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          border: "1px solid #27272A",
          borderRadius: 16,
          background: "#0E0E11",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(212,255,58,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderBottom: "1px solid #1F1F23",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27272A",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27272A",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#D4FF3A",
            }}
          />
          <span style={{ marginLeft: 8, fontSize: 12, color: "#71717A" }}>
            manuel.gallego — zsh
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: 28,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <div>
            <span style={{ color: "#D4FF3A" }}>&gt;</span>{" "}
            <span style={{ color: "#FAFAFA" }}>cd {path}</span>
          </div>
          <div style={{ color: "#FF5F57" }}>error 404: la ruta no existe</div>
          <div
            style={{
              margin: "18px 0 10px",
              color: "#FAFAFA",
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(64px, 14vw, 120px)",
              fontWeight: 500,
              letterSpacing: "-0.06em",
              lineHeight: 1,
            }}
          >
            404<span style={{ color: "#D4FF3A" }}>_</span>
          </div>
          <div>
            Esta página no existe o se movió. / This page doesn&apos;t exist.
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{ color: "#D4FF3A" }}>&gt;</span>{" "}
            <span style={{ color: "#FAFAFA" }}>ls</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
            <Link href="/" style={{ color: "#D4FF3A" }}>
              ./inicio
            </Link>
            <Link href="/#proyectos" style={{ color: "#D4FF3A" }}>
              ./proyectos
            </Link>
            <Link href="/#contacto" style={{ color: "#D4FF3A" }}>
              ./contacto
            </Link>
            <a
              href="/assets/CV-Manuel-Gallego.pdf"
              download="CV-Manuel-Gallego.pdf"
              style={{ color: "#D4FF3A" }}
            >
              ./cv.pdf
            </a>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
            }}
          >
            <span style={{ color: "#D4FF3A" }}>&gt;</span>
            <span
              style={{
                width: 9,
                height: 18,
                background: "#D4FF3A",
                animation: "blink 1s steps(1) infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

