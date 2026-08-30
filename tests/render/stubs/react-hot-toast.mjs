/**
 * tests/render/stubs/react-hot-toast.mjs
 *
 * TEST-HARNESS ONLY. Nothing here ships.
 *
 * The real react-hot-toast touches the DOM at MODULE LOAD (it injects its
 * stylesheet into document.head as a side effect of being imported), so any
 * component that imports it — 76 files do, directly — cannot be loaded in a
 * Node render test at all. Not rendered: LOADED. The import itself throws.
 *
 * Aliasing the package to this stub at bundle time removes the side effect
 * without changing a byte of shipped code. Toast calls become no-ops, which is
 * correct for a render test: we assert on what the component DISPLAYS, and a
 * toast is a side effect fired by an interaction, not part of the initial
 * markup.
 */
const noop = () => {};
const toast = Object.assign(noop, {
  success: noop, error: noop, loading: noop, custom: noop,
  dismiss: noop, remove: noop, promise: noop,
});
export default toast;
export { toast };
export const Toaster = () => null;
export const useToaster = () => ({ toasts: [], handlers: {} });
export const useToasterStore = () => ({ toasts: [] });
