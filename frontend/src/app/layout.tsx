import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manuel Gallego · Full-Stack Developer (Java, Spring Boot, Next.js)",
  description:
    "Full-Stack Developer y Líder de Desarrollo en Manizales, Colombia. Java/Spring Boot, Next.js/React, Kafka y AWS. ERP con microservicios, SaaS multi-tenant y plataformas de pago en producción.",
  authors: [{ name: "Manuel Alejandro Gallego Alarcón" }],
  metadataBase: new URL("https://alejandrogallego.dev"),
  alternates: {
    canonical: "https://alejandrogallego.dev/",
  },
  openGraph: {
    type: "website",
    url: "https://alejandrogallego.dev/",
    title: "Manuel Gallego · Full-Stack Developer",
    description:
      "Java/Spring Boot, Next.js y AWS. Software en producción para miles de usuarios.",
    locale: "es_CO",
    images: [
      {
        url: "https://alejandrogallego.dev/assets/og.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://alejandrogallego.dev/assets/og.png"],
  },
  icons: {
    icon: "/assets/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Manuel Alejandro Gallego Alarcón",
  url: "https://alejandrogallego.dev/",
  jobTitle: "Líder de Desarrollo de Software · Full-Stack Developer",
  email: "mailto:alejandrogallego030@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Manizales",
    addressCountry: "CO",
  },
  sameAs: [
    "https://github.com/ManuelGallego1",
    "https://linkedin.com/in/manuel-alejandro-gallego-alarcon",
  ],
  knowsAbout: [
    "Java",
    "Spring Boot",
    "Next.js",
    "React",
    "Apache Kafka",
    "AWS",
    "PostgreSQL",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

