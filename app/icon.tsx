import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

/** A leitura permanece nítida de 16 px até o atalho instalado. */
export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="512"
        height="512"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="512" height="512" rx="116" fill="#100B1D" />
        <rect
          x="48"
          y="48"
          width="416"
          height="416"
          rx="84"
          stroke="#8B5CF6"
          strokeWidth="20"
        />
        <path
          d="M168 124H130C126.686 124 124 126.686 124 130V168"
          stroke="#C4B5FD"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M344 124H382C385.314 124 388 126.686 388 130V168"
          stroke="#C4B5FD"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M168 388H130C126.686 388 124 385.314 124 382V344"
          stroke="#C4B5FD"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M344 388H382C385.314 388 388 385.314 388 382V344"
          stroke="#C4B5FD"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="256" cy="256" r="74" stroke="#A78BFA" strokeWidth="22" />
        <path
          d="M214 258L244 288L307 220"
          stroke="white"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    size,
  );
}
