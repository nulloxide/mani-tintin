export type Speaker =
  | "Tintin"
  | "Haddock"
  | "Calculus"
  | "Snowy"
  | "Thomson & Thompson";
export function portrait(speaker: Speaker) {
  const common =
    'stroke="#202b37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  let shapes = "";
  if (speaker === "Snowy") {
    shapes =
      '<path d="M15 69V49l9-17-4-21 16 12 14-12 2 23 8 11-5 22Z" fill="#fff9df"/><path d="m32 41 13-5 11 10 8 3-5 10-24-3Z" fill="#fff9df"/><ellipse cx="59" cy="48" rx="6" ry="4" fill="#202b37"/><circle cx="39" cy="35" r="2" fill="#202b37"/><path d="m35 60 10 2"/>';
  } else {
    shapes =
      '<path d="M9 81V67q23-19 47 0v14" fill="#ed792c"/><ellipse cx="33" cy="39" rx="19" ry="26" fill="#f8c598"/><path d="m32 37-4 11 8 1" fill="#f8c598"/><circle cx="24" cy="37" r="1.5" fill="#202b37"/><circle cx="40" cy="37" r="1.5" fill="#202b37"/><path d="m27 55 11-1" fill="none"/>';
    if (speaker === "Tintin")
      shapes +=
        '<path d="M15 32q-6-18 15-19L36 2q15 8 8 18l6 9-15-9-12 9Z" fill="#e7a134"/>';
    if (speaker === "Haddock")
      shapes +=
        '<path d="m15 43 8 8 10-2 11 2 8-8-2 24-17 8-17-9Z" fill="#202b37"/><path d="M12 26V15q21-14 42 0v11Z" fill="#385d79"/><path d="M10 26h46v7H13Z" fill="#202b37"/><path d="M29 17h9" stroke="#fff1cd"/>';
    if (speaker === "Calculus")
      shapes +=
        '<path d="M11 27V17h9V5h29v12h8v10Z" fill="#568267"/><circle cx="23" cy="37" r="8" fill="none"/><circle cx="42" cy="37" r="8" fill="none"/><path d="M31 37h3m-10 16 9-4 10 4-10 2Z" fill="#725b4c"/>';
    if (speaker === "Thomson & Thompson")
      shapes +=
        '<path d="M10 27h46v-7h-5q0-22-18-22T15 20h-5Z" fill="#202b37"/><path d="m21 52 12-5 13 5-13 5Z" fill="#202b37"/>';
  }
  return `<svg viewBox="0 0 68 80" xmlns="http://www.w3.org/2000/svg"><g ${common}>${shapes}</g></svg>`;
}
