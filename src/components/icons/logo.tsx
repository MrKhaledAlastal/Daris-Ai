import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 200 50"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="32"
        fontWeight="bold"
        fill="hsl(var(--primary))"
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
      >
        Tawjihi AI Pro
      </text>
    </svg>
  );
}
