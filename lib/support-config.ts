export const supportConfig = {
  pix: {
    key: process.env.NEXT_PUBLIC_SUPPORT_PIX_KEY?.trim() ?? "",
    name: process.env.NEXT_PUBLIC_SUPPORT_PIX_NAME?.trim() ?? "",
    city: process.env.NEXT_PUBLIC_SUPPORT_PIX_CITY?.trim() ?? "",
    message: "Apoio ProvaScan",
  },
} as const;

export const isPixConfigured = Boolean(supportConfig.pix.key && supportConfig.pix.name && supportConfig.pix.city);
