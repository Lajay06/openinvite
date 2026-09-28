import React, { createContext, useContext } from 'react';

/**
 * WHAT THE TOUR KNOWS, FROM TWO PLACES THAT EACH KNOW HALF.
 *
 * The tour personalizes itself from data already loaded, and the two pieces do
 * not live together:
 *
 *   the couple's first names   Layout has the wedding record
 *   the guest numbers          only the Guests page has the list
 *
 * Measured in a browser, not reasoned about: with the page's tourContext
 * REPLACING the shell's, the question mark on the Guests page showed
 * "4 guests, 3 replied so far." and had lost the couple's name from the welcome
 * chapter. Either half alone is wrong, so they merge.
 *
 * WHY A CONTEXT AND NOT A PROP CHAIN. DashboardPageHeader is rendered by each
 * of thirty-seven pages, inside Layout. Threading the names through every one
 * of them would be thirty-seven chances to forget, and the ones that forgot
 * would silently show the nameless copy. The shell provides once; the page adds
 * what only it has.
 *
 * AND IT NEVER TRIGGERS A READ. Both halves come from queries that had already
 * run for their own reasons, which is the goal's constraint: "It never makes a
 * new read."
 */
const TourContext = createContext(null);

export function TourContextProvider({ value, children }) {
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

/**
 * The shell's context merged with whatever the page adds.
 *
 * The PAGE wins on any key it supplies, because a page that bothered to pass a
 * value knows something the shell does not.
 */
export function useTourContext(fromPage = null) {
  const fromShell = useContext(TourContext);
  return { ...(fromShell || {}), ...(fromPage || {}) };
}
