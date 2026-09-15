import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0b0d12",
    description: "Correção guiada de provas objetivas por foto.",
    display: "standalone",
    icons: [{ src: "/provascan-mark-v2.png", sizes: "1254x1254", type: "image/png" }],
    lang: "pt-BR",
    name: "ProvaScan — Corrigir provas",
    orientation: "any",
    short_name: "ProvaScan",
    start_url: "/dashboard",
    theme_color: "#6d5dfc",
  };
}
