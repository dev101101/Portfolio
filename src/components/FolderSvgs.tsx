function PixelFolder() {
  return (
    <svg className="folder-svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5h6l2 3h10v1H2V6a1 1 0 0 1 1-1z" />
      <path d="M1 9h22v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9z" />
      <rect x="1" y="10" width="22" height="2" fill="rgba(0,0,0,0.15)" />
    </svg>
  );
}

function ClassicFolder() {
  return (
    <svg className="folder-svg" viewBox="0 0 24 24">
      <path
        d="M2 6h7l2 3h11v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"
        fill="#FFD700"
        stroke="#B8860B"
        strokeWidth="0.8"
      />
      <path
        d="M2 6h7l2 3h11v1H2V6z"
        fill="#FFEC80"
        stroke="#B8860B"
        strokeWidth="0.5"
      />
      <rect x="4" y="18" width="16" height="1" fill="#C5A000" />
    </svg>
  );
}

function ModernFolder() {
  return (
    <svg className="folder-svg" viewBox="0 0 128 128">
      <linearGradient
        id="a"
        gradientTransform="matrix(0.45451 0 0 0.455522 -1210.292114 616.172607)"
        gradientUnits="userSpaceOnUse"
        x1="2689.251953"
        x2="2918.069824"
        y1="-1106.802979"
        y2="-1106.802979"
      >
        <stop offset="0" stop-color="#62a0ea" />
        <stop offset="0.0576991" stop-color="#afd4ff" />
        <stop offset="0.122204" stop-color="#62a0ea" />
        <stop offset="0.873306" stop-color="#62a0ea" />
        <stop offset="0.955997" stop-color="#c0d5ea" />
        <stop offset="1" stop-color="#62a0ea" />
      </linearGradient>
      <path
        d="m 21.976562 12 c -5.527343 0 -9.976562 4.460938 -9.976562 10 v 86.03125 c 0 5.542969 4.449219 10 9.976562 10 h 84.042969 c 5.53125 0 9.980469 -4.457031 9.980469 -10 v -72.085938 c 0 -6.628906 -5.359375 -12 -11.972656 -12 h -46.027344 c -2.453125 0 -4.695312 -1.386718 -5.796875 -3.582031 l -1.503906 -2.992187 c -1.65625 -3.292969 -5.019531 -5.371094 -8.699219 -5.371094 z m 0 0"
        fill="#438de6"
      />
      <path
        d="m 65.976562 36 c -2.746093 0 -5.226562 1.101562 -7.027343 2.890625 c -2.273438 2.253906 -5.382813 5.109375 -8.632813 5.109375 h -28.339844 c -5.527343 0 -9.976562 4.460938 -9.976562 10 v 54.03125 c 0 5.542969 4.449219 10 9.976562 10 h 84.042969 c 5.53125 0 9.980469 -4.457031 9.980469 -10 v -62.03125 c 0 -5.539062 -4.449219 -10 -9.980469 -10 z m 0 0"
        fill="url(#a)"
      />
      <path
        d="m 65.976562 32 c -2.746093 0 -5.226562 1.101562 -7.027343 2.890625 c -2.273438 2.253906 -5.382813 5.109375 -8.632813 5.109375 h -28.339844 c -5.527343 0 -9.976562 4.460938 -9.976562 10 v 55.976562 c 0 5.539063 4.449219 10 9.976562 10 h 84.042969 c 5.53125 0 9.980469 -4.460937 9.980469 -10 v -63.976562 c 0 -5.539062 -4.449219 -10 -9.980469 -10 z m 0 0"
        fill="#a4caee"
      />
    </svg>
  );
}

function TerminalFolder() {
  return (
    <svg
      className="folder-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 8h7l2 3h11v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
      <path d="M6 13l3 2-3 2" strokeWidth="1" />
      <path d="M11 16h6" strokeWidth="1" />
    </svg>
  );
}

/* ---- File icons ---- */

function PixelFile() {
  return (
    <svg className="folder-svg" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="2" width="16" height="20" fill="var(--file-body, #e8dcc8)" />
      <rect x="4" y="2" width="16" height="2" fill="var(--icon-color)" />
      <rect x="4" y="4" width="12" height="2" fill="var(--file-fold, #d5ccb8)" />
      <rect x="6" y="9" width="12" height="1" fill="var(--file-lines, rgba(0,0,0,0.2))" />
      <rect x="6" y="12" width="8" height="1" fill="var(--file-lines, rgba(0,0,0,0.2))" />
      <rect x="6" y="15" width="10" height="1" fill="var(--file-lines, rgba(0,0,0,0.2))" />
    </svg>
  );
}

function ClassicFile() {
  return (
    <svg className="folder-svg" viewBox="0 0 24 24">
      <path
        d="M5 2h10l5 5v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="#ffffff"
        stroke="#808080"
        strokeWidth="0.8"
      />
      <path d="M15 2v4a1 1 0 0 0 1 1h4" fill="#e0e0e0" stroke="#808080" strokeWidth="0.5" />
      <rect x="6" y="10" width="11" height="1" fill="#c0c0c0" />
      <rect x="6" y="13" width="8" height="1" fill="#c0c0c0" />
      <rect x="6" y="16" width="10" height="1" fill="#c0c0c0" />
    </svg>
  );
}

function ModernFile() {
  return (
    <svg className="folder-svg" viewBox="0 0 128 128">
      <path
        d="M 24 8 h 56 l 16 16 v 96 a 8 8 0 0 1 -8 8 H 24 a 8 8 0 0 1 -8 -8 V 16 a 8 8 0 0 1 8 -8 z"
        fill="#e8e8e8"
        stroke="#ccc"
        strokeWidth="1"
      />
      <path d="M 80 8 v 16 h 16" fill="#d0d0d0" stroke="#ccc" strokeWidth="1" />
      <rect x="28" y="48" width="64" height="4" rx="2" fill="#bbb" />
      <rect x="28" y="64" width="48" height="4" rx="2" fill="#bbb" />
      <rect x="28" y="80" width="56" height="4" rx="2" fill="#bbb" />
    </svg>
  );
}

function TerminalFile() {
  return (
    <svg
      className="folder-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M5 2h9l5 5v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M14 2v4a1 1 0 0 0 1 1h4" />
      <path d="M7 11l3 2-3 2" strokeWidth="1" />
      <path d="M12 14h4" strokeWidth="1" />
    </svg>
  );
}

function FolderSmallSvg() {
  return (
    <svg className="filebrowser-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 6h7l2 3h11v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
    </svg>
  );
}

function FileSmallSvg() {
  return (
    <svg className="filebrowser-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M15 2v4a1 1 0 0 0 1 1h4" fill="rgba(0,0,0,0.1)" />
    </svg>
  );
}

export {
  PixelFolder,
  ClassicFolder,
  ModernFolder,
  TerminalFolder,
  PixelFile,
  ClassicFile,
  ModernFile,
  TerminalFile,
  FolderSmallSvg,
  FileSmallSvg,
};
