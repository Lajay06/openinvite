import {
  EMAIL_FONT, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_BG, EMAIL_CARD_BORDER, EMAIL_DIVIDER,
  EMAIL_MUTED, EMAIL_MUTED_LIGHT, EMAIL_BODY_TEXT, EMAIL_SUPPORT_ADDRESS, EMAIL_LOGO_MARK_URL,
  escapeHtml,
} from '../../src/lib/emailBrand.js';

/**
 * Gift reveal email — sent to the RECIPIENT of a gift-mode purchase (PR G4,
 * gifting v2 bridge). This is the one that carries the actual product
 * experience of receiving a gift, so it deliberately does NOT use
 * emailBrand.js's flat emailShell()/emailHeaderRow() (logo-first, no room
 * for a photo) — it's its own bespoke layout: full-width photo banner up
 * top, then a white content card below, reusing the shared design tokens
 * (font, colours, logo mark, support address) for consistency without the
 * shared structural layout.
 *
 * Same bright photo, no dark overlay, as Gifting.jsx's own hero — one
 * consistent "gifting" visual identity across the marketing page and this
 * email.
 *
 * The CTA is deep-linked using only EXISTING mechanisms: Register.jsx
 * already reads ?plan= and forwards it to /choose-plan, which already
 * pre-selects that plan's card. Nothing new was built for this — see the
 * PR G4 proposal.
 *
 * @param {{ plan: 'pro'|'ultra', code: string, note?: string|null, buyerLabel?: string|null }} opts
 */
export function giftRevealEmail({ plan, code, note, buyerLabel }) {
  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';
  const appUrl = process.env.VITE_APP_URL || 'https://openinvite.com.au';
  const registerUrl = `${appUrl}/register?plan=${plan}`;
  const loginUrl = `${appUrl}/login?plan=${plan}`;
  const bannerImage = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12431_yunnan.jpg';

  const noteHtml = note ? `
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${EMAIL_ACCENT};background:${EMAIL_BG};">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};font-style:italic;">
                      "${escapeHtml(note)}"
                    </p>
                    ${buyerLabel ? `<p style="margin:10px 0 0;font-size:12px;color:${EMAIL_MUTED};font-family:${EMAIL_FONT};">— ${escapeHtml(buyerLabel)}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(`You've been gifted Openinvite ${planLabel}`)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BG};font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${EMAIL_CARD_BORDER};">

          <!-- Photo banner -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${bannerImage}" alt="" width="560" height="280" style="width:100%;max-width:560px;height:280px;object-fit:cover;display:block;border:0;" />
            </td>
          </tr>

          <!-- Small logo row -->
          <tr>
            <td style="padding:28px 40px 0;">
              <img src="${EMAIL_LOGO_MARK_URL}" width="24" height="24" alt="Openinvite" style="display:block;width:24px;height:24px;" />
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:20px 40px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:${EMAIL_ACCENT};font-family:${EMAIL_FONT};">
                A gift for you
              </p>
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:-0.02em;line-height:1.2;font-family:${EMAIL_FONT};">
                You've been gifted Openinvite ${planLabel}.
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${EMAIL_BODY_TEXT};font-family:${EMAIL_FONT};">
                Someone thinks you deserve a calmer wedding. Your ${planLabel} plan is ready whenever you are — 24 months of access, starting the moment you claim it.
              </p>
            </td>
          </tr>
${noteHtml}

          <!-- Code -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${EMAIL_CARD_BORDER};">
                <tr>
                  <td style="padding:22px 24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;font-family:${EMAIL_FONT};">
                      Your gift code
                    </p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:0.05em;font-family:monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 20px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${EMAIL_ACCENT};border-radius:999px;">
                    <a href="${registerUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${EMAIL_FONT};">
                      Create your account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 steps -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0 0 4px;font-size:13px;line-height:1.9;color:${EMAIL_MUTED};font-family:${EMAIL_FONT};">1. Create your account</p>
              <p style="margin:0 0 4px;font-size:13px;line-height:1.9;color:${EMAIL_MUTED};font-family:${EMAIL_FONT};">2. Pick Openinvite ${planLabel}</p>
              <p style="margin:0;font-size:13px;line-height:1.9;color:${EMAIL_MUTED};font-family:${EMAIL_FONT};">3. Enter your code at checkout — the total becomes $0</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 40px;">
              <p style="margin:0;font-size:13px;color:${EMAIL_MUTED_LIGHT};line-height:1.6;font-family:${EMAIL_FONT};">
                Already have an Openinvite account? <a href="${loginUrl}" style="color:${EMAIL_ACCENT};text-decoration:none;">Log in</a> and enter your code the same way, at your own checkout.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:${EMAIL_DIVIDER};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${EMAIL_MUTED_LIGHT};font-family:${EMAIL_FONT};">
                Questions about this gift? Contact us at ${EMAIL_SUPPORT_ADDRESS}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html };
}
