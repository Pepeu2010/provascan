"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";

export function PixQrCode({ payload }: { payload: string }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    if (!payload) return undefined;
    void QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#171329", light: "#FFFFFF" } }).then((nextImage) => { if (active) setImage(nextImage); });
    return () => { active = false; };
  }, [payload]);
  if (!image) return <div className="grid aspect-square w-44 place-items-center rounded-2xl bg-[var(--surface)] text-center text-xs text-[var(--muted-foreground)]">Preparando QR Code...</div>;
  return <Image unoptimized className="w-44 rounded-2xl bg-white p-2 shadow-sm" src={image} width={176} height={176} alt="QR Code PIX para apoiar o ProvaScan" />;
}
