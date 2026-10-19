export const INTRO_PROGRAM = "QB Introduction Session";
export const INTRO_LABEL = "QB Introduction Session";
export const INTRO_KEY = "intro:qb";
export const INTRO_PRICE_CENTS = 12500;
export const INTRO_NOTE =
  "For first-time quarterbacks. This is a prerequisite for group and private sessions.";

export function isIntro(session: { program: string }) {
  return session.program === INTRO_PROGRAM;
}
