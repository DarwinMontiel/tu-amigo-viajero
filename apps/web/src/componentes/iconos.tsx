import type { SVGProps } from 'react';

/** Íconos de trazo propios (24×24), decorativos: siempre acompañados de texto. */
function Icono({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icono"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoAvion = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4.5-4.5c1-1 2.6-1.2 3.3-.5.7.7.5 2.3-.5 3.3L14.8 13.3l1 7.5L14.3 22l-2.5-7.5" />
    <path d="m6.5 17.5-2 .5.5-2 1.5-1.5" />
  </Icono>
);

export const IconoCama = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.8" />
  </Icono>
);

export const IconoMaleta = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <rect x="4" y="7" width="16" height="13" rx="2.5" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 11v5M15 11v5" />
  </Icono>
);

export const IconoSol = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icono>
);

export const IconoLuna = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icono>
);

export const IconoMenu = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icono>
);

export const IconoCerrar = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icono>
);

export const IconoExterno = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icono>
);

export const IconoChispa = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6Z" />
    <path d="M19 15c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" />
  </Icono>
);

export const IconoBuscar = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icono>
);

export const IconoIntercambiar = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </Icono>
);

export const IconoGithub = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </Icono>
);

export const IconoLinkedin = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
  </Icono>
);

export const IconoEstrella = (p: SVGProps<SVGSVGElement>) => (
  <Icono {...p} fill="currentColor" strokeWidth={1}>
    <path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8L12 3Z" />
  </Icono>
);
