"use client";

import type { SVGProps } from "react";

export function CookieIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="18" cy="18" r="18" fill="#1A6AFF" fillOpacity="0.1" />
      <circle cx="18" cy="18" r="10" fill="#1A6AFF" fillOpacity="0.15" />
      {/* Cookie body */}
      <circle cx="18" cy="18" r="8" fill="#1A6AFF" />
      {/* Chips */}
      <circle cx="15" cy="15" r="1.5" fill="white" />
      <circle cx="20" cy="14" r="1" fill="white" />
      <circle cx="21" cy="20" r="1.5" fill="white" />
      <circle cx="15" cy="21" r="1" fill="white" />
      <circle cx="18" cy="18" r="1" fill="white" />
      {/* Bite */}
      <circle cx="24" cy="12" r="4" fill="#1A6AFF" fillOpacity="0.1" />
      <path d="M22 10 Q26 10 26 14 Q24 12 22 10Z" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M15 5L5 15M5 5l10 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CookieYesLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      height="13"
      viewBox="0 0 78 13"
      width="78"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5.49 1.82C8.09 1.82 10.03 3.21 10.66 5.49H7.74C7.3 4.58 6.46 4.15 5.46 4.15C3.83 4.15 2.7 5.31 2.7 7.18C2.7 9.05 3.83 10.22 5.46 10.22C6.46 10.22 7.3 9.76 7.74 8.88H10.66C10.03 11.15 8.09 12.55 5.49 12.55C2.26 12.52 0 10.32 0 7.16C0 3.99 2.26 1.82 5.49 1.82Z"
        fill="currentColor"
      />
      <path
        d="M15.96 12.57C13.41 12.57 11.5 10.93 11.5 8.27C11.5 5.62 13.47 3.97 16.01 3.97C18.56 3.97 20.53 5.62 20.53 8.27C20.53 10.93 18.51 12.57 15.96 12.57ZM15.96 10.35C16.91 10.35 17.8 9.66 17.8 8.27C17.8 6.85 16.93 6.2 15.99 6.2C15.02 6.2 14.18 6.85 14.18 8.27C14.2 9.66 14.99 10.35 15.96 10.35Z"
        fill="currentColor"
      />
      <path
        d="M25.81 12.57C23.26 12.57 21.34 10.93 21.34 8.27C21.34 5.62 23.31 3.97 25.86 3.97C28.41 3.97 30.38 5.62 30.38 8.27C30.38 10.93 28.35 12.57 25.81 12.57ZM25.81 10.35C26.75 10.35 27.65 9.66 27.65 8.27C27.65 6.85 26.78 6.2 25.83 6.2C24.86 6.2 24.02 6.85 24.02 8.27C24.02 9.66 24.84 10.35 25.81 10.35Z"
        fill="currentColor"
      />
      <path
        d="M31.32 1.82H33.97V7.49L36.6 4.09H39.88L36.28 8.27L39.93 12.45H36.65L34 8.93V12.45H31.35V1.82H31.32Z"
        fill="currentColor"
      />
      <path
        d="M40.51 1.84C40.51 1.06 41.14 0.45 42.08 0.45C43.03 0.45 43.66 1.06 43.66 1.84C43.66 2.6 43.03 3.21 42.08 3.21C41.14 3.21 40.51 2.6 40.51 1.84ZM40.77 4.07H43.42V12.42H40.77V4.07Z"
        fill="currentColor"
      />
      <path
        d="M48.78 12.57C46.23 12.57 44.39 10.93 44.39 8.27C44.39 5.62 46.21 3.97 48.78 3.97C51.3 3.97 53.11 5.59 53.11 8.15C53.11 8.37 53.08 8.65 53.06 8.9H47.05C47.15 9.99 47.83 10.5 48.7 10.5C49.43 10.5 49.85 10.14 50.09 9.69H52.93C52.48 11.31 50.96 12.57 48.78 12.57ZM47.07 7.46H50.41C50.41 6.55 49.67 6.02 48.78 6.02C47.89 6.02 47.23 6.53 47.07 7.46Z"
        fill="currentColor"
      />
      <path
        d="M65.37 12.57C62.83 12.57 60.99 10.93 60.99 8.27C60.99 5.62 62.8 3.97 65.37 3.97C67.89 3.97 69.7 5.59 69.7 8.15C69.7 8.37 69.68 8.65 69.65 8.9H63.64C63.74 9.99 64.43 10.5 65.29 10.5C66.03 10.5 66.45 10.14 66.68 9.69H69.52C69.07 11.31 67.52 12.57 65.37 12.57ZM63.64 7.46H66.97C66.97 6.55 66.24 6.02 65.35 6.02C64.48 6.02 63.8 6.53 63.64 7.46Z"
        fill="currentColor"
      />
      <path
        d="M74.51 12.57C72.2 12.57 70.65 11.33 70.52 9.71H73.14C73.19 10.3 73.75 10.68 74.48 10.68C75.16 10.68 75.53 10.37 75.53 9.99C75.53 8.65 70.81 9.61 70.81 6.55C70.81 5.13 72.07 3.97 74.32 3.97C76.56 3.97 77.82 5.16 77.97 6.8H75.51C75.43 6.25 74.98 5.87 74.22 5.87C73.59 5.87 73.25 6.1 73.25 6.5C73.25 7.84 77.95 6.88 78 10.02C78.03 11.46 76.69 12.57 74.51 12.57Z"
        fill="currentColor"
      />
      <path d="M55.87 4.22H53.11L55.63 8.73H58.39L55.87 4.22Z" fill="currentColor" />
      <path d="M55.58 8.6L55.66 8.73H58.41L56.6 5.56L55.58 8.6Z" fill="currentColor" />
      <path d="M60.62 0.43L55.66 8.73H58.41L63.38 0.43H60.62Z" fill="currentColor" />
      <path d="M55.66 9.96H58.34V12.57H55.66V9.96Z" fill="currentColor" />
    </svg>
  );
}

export function RevisitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.96 35.71C8.19 35.71 0.29 27.79 0.29 18L0.29 16.03L1.65 16.3C1.73 16.31 1.79 16.33 1.85 16.34C2.19 16.41 2.36 16.44 2.59 16.44C4.02 16.44 5.2 15.57 5.7 14.39L6.09 13.46L7.06 13.74C7.54 13.88 8.02 13.95 8.49 13.95C11.51 13.95 14 11.46 14 8.42C14 7.95 13.93 7.53 13.84 7.03L13.72 6.27L14.38 5.87C15.27 5.33 15.91 4.29 15.99 3.07C15.98 2.71 15.88 2.38 15.71 1.87L15.31 0.65L16.57 0.4C17.1 0.29 17.61 0.29 18 0.29L18.04 0.29C27.81 0.29 35.71 8.21 35.71 18C35.71 27.79 27.72 35.71 17.96 35.71ZM2.59 18.72C2.96 26.92 9.7 33.43 17.96 33.43C26.47 33.43 33.43 26.52 33.43 18C33.43 9.53 26.65 2.67 18.23 2.57C18.25 2.74 18.27 2.91 18.27 3.1L18.27 3.13L18.27 3.16C18.18 4.81 17.42 6.35 16.2 7.36C16.24 7.68 16.27 8.04 16.27 8.42C16.27 12.71 12.78 16.22 8.49 16.22C8.11 16.22 7.72 16.19 7.34 16.13C6.36 17.67 4.63 18.72 2.59 18.72C2.59 18.72 2.59 18.72 2.59 18.72Z"
        fill="white"
      />
      <path
        d="M11.41 2.53C11.41 1.35 10.45 0.39 9.27 0.39C8.09 0.39 7.14 1.35 7.14 2.53C7.14 3.71 8.09 4.66 9.27 4.66C10.45 4.66 11.41 3.71 11.41 2.53Z"
        fill="white"
      />
      <path
        d="M10.24 9.2C10.24 8.34 9.55 7.64 8.69 7.64C7.83 7.64 7.14 8.34 7.14 9.2C7.14 10.05 7.83 10.75 8.69 10.75C9.55 10.75 10.24 10.05 10.24 9.2Z"
        fill="white"
      />
      <path
        d="M4.12 10.28C4.12 9.4 3.41 8.68 2.52 8.68C1.64 8.68 0.92 9.4 0.92 10.28C0.92 11.16 1.64 11.88 2.52 11.88C3.41 11.88 4.12 11.16 4.12 10.28Z"
        fill="white"
      />
      <path
        d="M16.71 17.25L17.73 19.1L18.35 20.22L23.16 12H26.88L20.14 23.49H16.43L13 17.25H16.71Z"
        fill="white"
      />
      <path d="M19.94 25.79H16.47V29.24H19.94V25.79Z" fill="white" />
    </svg>
  );
}

export function CookieSmallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="7" fill="currentColor" />
      <circle cx="10" cy="10" r="1.2" fill="white" />
      <circle cx="14" cy="10" r="0.9" fill="white" />
      <circle cx="14" cy="14" r="1.2" fill="white" />
      <circle cx="10" cy="14" r="0.9" fill="white" />
      <circle cx="12" cy="12" r="0.9" fill="white" />
    </svg>
  );
}
