// The contact form's outcome copy, kept out of the page so
// tests/persistence/contact-sent-state.mjs can call it rather than read it.

// One line for every failure, whatever the server said: the visitor's next
// step is the same either way, and hello@ is the route that never depends on
// this form working.
export const SEND_FAILED = "Your message didn't send. Please try again, or email hello@openinvite.com.au.";

export const firstNameOf = (name) => String(name || "").trim().split(/\s+/)[0] || "";

export function sentCopy({ firstName, email }) {
  return {
    heading: firstName ? `Thanks, ${firstName}. Your message is with us.` : "Thanks. Your message is with us.",
    body: `We'll reply to ${email} as soon as we can.`,
  };
}
