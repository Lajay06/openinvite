/**
 * scripts/tour-recordings/lib/avaFixture.mjs
 *
 * ONE REPLY, FOR THE RECORDING, AND NOWHERE ELSE.
 *
 * THE OWNER WROTE THIS TEXT. It is not a paraphrase, not a sample of Ava's
 * voice invented to fill a chapter, and it is not editable here. Chapter 6
 * stopped the recording run for exactly this reason: `InvokeLLM` goes to the
 * model, the render harness stubs that endpoint, and the pod rendered "I'm
 * having trouble responding right now." Filming that would have been footage
 * of Ava failing; writing her answer would have been authoring product voice.
 * So the words came from the owner and they live in one place.
 *
 * NOTHING IN src/ IMPORTS THIS. It is reached only by the recording context in
 * ./record.mjs, which is driven by scripts/tour-recordings/record-all.mjs
 * against a local preview server. There is no path from a production build to
 * this file, which is the point of it being under scripts/.
 *
 * THE LAST TWO SENTENCES ARE THE OWNER'S SECOND DRAFT, AND THE REASON IS THE
 * PRODUCT. The first version closed with an offer to draft a note, suggest
 * readings or add to dos, and filterUnbackedOffers removed that sentence
 * before a couple could read it, because no POD_MIRROR action backs any of the
 * three. The rule is right: an offer the pod cannot honour must never reach the
 * couple. So the copy changed rather than the filter, on the owner's line, and
 * the reply now ends on advice Ava can give rather than on work she cannot do.
 * Nothing in this file is edited to satisfy a guard; when the product removed a
 * sentence, that was reported and the owner rewrote it.
 *
 * THE DELAY IS THE PRODUCT'S OWN ARRIVAL, NOT AN EFFECT. AvaChatPod does not
 * stream: it sets `loading`, which draws three pulsing dots
 * (AvaChatPod.jsx:315), and appends the finished bubble when the reply lands.
 * So the reply is held back long enough for those dots to be seen and then
 * delivered whole, which is how a couple meets an answer from Ava. Typing a
 * fake stream into the footage would show the product doing something it does
 * not do.
 */

/** The couple's question, typed on camera. */
export const AVA_QUESTION = 'What am I missing for the ceremony?';

/** The owner's reply, verbatim. */
export const AVA_REPLY = 'I have read your ceremony as it stands. The time, the place and who is marrying you are all set. Three things are still open. Nobody is down to hold the rings. There is no reading yet, and whoever gives one will want a few weeks with it. And the processional music is blank, so the musicians will choose for you. Settle the rings first; that is one message to whoever you trust most. The reading and the music can wait until next week.';

/** How long the dots pulse before the bubble arrives. */
export const AVA_THINKING_MS = 1900;

/**
 * Answer the pod's InvokeLLM call with the fixture.
 *
 * `{ result }` is the shape unwrapLlmReply reads first (src/lib/avaRequest.js:286),
 * so the reply travels the product's own path: parseActions, the mirror filter
 * and the unbacked-offer filter all run on it exactly as they would on a real
 * answer. A reply that proposed something the mirror does not back would be
 * stripped before the couple saw it, here as in production.
 */
export async function routeAvaFixture(ctx) {
  await ctx.route((url) => String(url).includes('/integration-endpoints/Core/InvokeLLM'), async (route) => {
    await new Promise((r) => setTimeout(r, AVA_THINKING_MS));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result: AVA_REPLY }),
    });
  });
}
