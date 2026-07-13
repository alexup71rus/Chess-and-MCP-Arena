type IconName =
  | "arrow-left"
  | "arrow-right"
  | "flip"
  | "undo"
  | "volume"
  | "volume-off"
  | "settings";

interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  const paths = {
    "arrow-left": <path d="M19 12H5m6-6-6 6 6 6" />,
    "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
    flip: <path d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3-3m-3 3 3 3" />,
    undo: <path d="m9 7-5 5 5 5m-5-5h9a7 7 0 0 1 7 7" />,
    volume: (
      <path d="M5 10v4h3l4 3V7l-4 3H5Zm11.5-1.5a5 5 0 0 1 0 7m2.5-10a9 9 0 0 1 0 13" />
    ),
    "volume-off": <path d="M5 10v4h3l4 3V7l-4 3H5Zm11 1 4 4m0-4-4 4" />,
    settings: (
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm0-12.2v2m0 13.8v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m0-12.72 1.42 1.42m9.88 9.88 1.42 1.42" />
    ),
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
