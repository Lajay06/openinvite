/**
 * src/components/onboarding/OnboardingStepChrome.jsx
 *
 * ONBOARDING'S STEP CHROME: the small colored logo, "Step N of M", and
 * "← Back" under the logo. Lifted out of src/pages/Onboarding.jsx, which
 * renders it exactly as it did inline, so the gift flow's page 2 (gifting v2,
 * owner ruling 2026-10-13: "page 2 must be onboarding step 1, not a
 * lookalike") imports the same chrome rather than copying it.
 *
 * The logo note, kept from Onboarding.jsx: the source PNG's wordmark text is
 * baked in white (built for dark backgrounds, see AuthLayout.jsx), so the icon
 * is cropped with background-position, keeping its real color gradient, and
 * real "Openinvite" text sits beside it. PublicFooter.jsx's 41×48 icon crop,
 * scaled to a 20px-tall mark.
 */
const PJS = "'Plus Jakarta Sans', sans-serif";
const LOGO_URL = '/openinvite-logo.png';

export default function OnboardingStepChrome({ showStepCounter, stepNum, totalSteps, showBack, onBack }) {
  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <div
          aria-hidden="true"
          style={{
            width: 17, height: 20, flexShrink: 0,
            backgroundImage: `url(${LOGO_URL})`,
            backgroundSize: '87px 20px',
            backgroundPosition: '0 0',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
          Openinvite
        </span>
      </div>

      {showStepCounter && (
        <span style={{
          fontSize: 11, fontFamily: PJS,
          color: 'rgba(10,10,10,0.4)',
        }}>
          Step {stepNum} of {totalSteps}
        </span>
      )}

      {showBack && (
        <button
          onClick={onBack}
          className="border-none cursor-pointer text-[13px] text-left bg-transparent rounded-full px-2 py-1 transition-colors duration-150 hover:bg-black hover:text-white active:bg-neutral-900 text-[rgba(10,10,10,0.4)]"
          style={{ fontFamily: PJS, alignSelf: 'flex-start' }}
        >
          ← Back
        </button>
      )}
    </>
  );
}

/**
 * The same chrome as it sits at the top of a shell step (the split layout):
 * a column 32px above the step's own content. Onboarding.jsx's shell branch
 * and the gift flow's page 2 both render this.
 */
export function ShellStepChrome(props) {
  return (
    <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <OnboardingStepChrome {...props} />
    </div>
  );
}
