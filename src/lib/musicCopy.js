/**
 * The default request message the couple's Music tool PRE-FILLS into its field
 * as a real, editable value — never as a gray placeholder.
 *
 * A placeholder conventionally means "an example of what to write". If that
 * same text then publishes verbatim, the convention has lied: this string used
 * to publish while the editor's placeholder said something else entirely, so
 * the couple could not see what their guests were reading.
 *
 * USE `??`, NOT `||`. undefined means NEVER SET and takes this default; an
 * empty string means DELIBERATELY CLEARED and publishes nothing. Those are
 * different intentions and `||` collapses them.
 *
 * It lives here rather than in GuestMusic.jsx so the couple's Music page can
 * import it without pulling an entire guest page into its bundle.
 */
export const DEFAULT_MUSIC_REQUEST_MESSAGE =
  "Help us build the soundtrack to our night. Request a song you'd love to hear.";
