type IconName = "arrow-left" | "arrow-right" | "flip" | "undo";

interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  const paths = {
    "arrow-left": <path d="M19 12H5m6-6-6 6 6 6" />,
    "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
    flip: <path d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3-3m-3 3 3 3" />,
    undo: <path d="m9 7-5 5 5 5m-5-5h9a7 7 0 0 1 7 7" />,
  };

  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
