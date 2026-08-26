import React from 'react';
import { ExternalLink } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';

import { coupleDisplayName } from '@/lib/coupleNames';
// Cash fund + registry public-site wiring (Option A — couples link their
// own external payment page; no money moves through Openinvite). customGifts
// and registryProducts come from /api/wedding-by-slug, already scoped to
// this wedding's owner and field-allowlisted server-side (see
// api/_lib/guestSafeRegistry.js) — payment_link_url is present only when
// it passed an https:// check, so "does this key exist" is the only check
// this page needs to decide whether to render a Contribute button.
function CashFundCard({ fund, theme, typography, coupleNames }) {
  return (
    <div style={{ backgroundColor: theme.darkBg, color: theme.darkText, padding: 24, borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {fund.image_url && (
        <img src={fund.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '4px' }} />
      )}
      <h2 style={{ margin: 0, fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '1.25rem', margin: 0 }}>
        {fund.title}
      </h2>
      {fund.description && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
          {fund.description}
        </p>
      )}
      {fund.requested_amount != null && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
          Goal: ${fund.requested_amount.toLocaleString()}
        </p>
      )}
      {fund.payment_link_url && (
        <div style={{ marginTop: 6 }}>
          <a
            href={fund.payment_link_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contribute to ${fund.title}, opens in a new tab`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backgroundColor: theme.accent, color: theme.darkBg,
              padding: '10px 18px', borderRadius: '999px', textDecoration: 'none',
              fontFamily: typography.bodyFont, fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            Contribute <ExternalLink size={14} />
          </a>
          <p style={{ fontFamily: typography.bodyFont, fontSize: '0.75rem', opacity: 0.6, margin: '8px 0 0' }}>
            You'll be taken to {coupleNames || 'the couple'}'s own payment page to contribute.
          </p>
        </div>
      )}
    </div>
  );
}

function WishlistCard({ product, theme, typography }) {
  const hasClaimCount = product.quantity_requested != null && product.quantity_purchased != null;
  return (
    <div style={{ backgroundColor: theme.darkBg, color: theme.darkText, padding: 24, borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {product.image_url && (
        <img src={product.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '4px' }} />
      )}
      <h2 style={{ margin: 0, fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '1.25rem', margin: 0 }}>
        {product.name}
      </h2>
      {product.description && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
          {product.description}
        </p>
      )}
      {product.price != null && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
          ${product.price.toLocaleString()}
        </p>
      )}
      {hasClaimCount && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>
          {product.quantity_purchased} of {product.quantity_requested} claimed
        </p>
      )}
      {product.product_url && (
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${product.name}, opens in a new tab`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6,
            backgroundColor: theme.accent, color: theme.darkBg,
            padding: '10px 18px', borderRadius: '999px', textDecoration: 'none',
            fontFamily: typography.bodyFont, fontSize: '0.9rem', fontWeight: 600,
            width: 'fit-content',
          }}
        >
          View item <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

const sectionHeadingStyle = (typography) => ({
  fontFamily: typography.headingFont,
  fontWeight: typography.headingWeight,
  fontSize: '1.5rem',
  marginBottom: '20px',
});

const cardGridStyle = { display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' };

export default function WeddingRegistryPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.registryContent || {};
  const registryLinks = content.registryLinks || [];
  const customGifts = weddingDetails.customGifts || [];
  const registryProducts = weddingDetails.registryProducts || [];
  const motionDisabled = !isMotionEnabled(weddingDetails);

  const hasAnyContent = content.noGiftsPlease
    || !!content.registryMessage
    || registryLinks.length > 0
    || customGifts.length > 0
    || registryProducts.length > 0;

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={motionDisabled}>
          <GuestPageHeading title={"Registry"} theme={theme} typography={typography} universeConfig={universeConfig} />
        </SectionReveal>

        {content.noGiftsPlease ? (
          <SectionReveal
            universeConfig={universeConfig} disabled={motionDisabled}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '60px 40px',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontFamily: typography.bodyFont, fontSize: '1.25rem', lineHeight: 1.8 }}>
              Your presence is the greatest gift. No gifts, please.
            </p>
          </SectionReveal>
        ) : (
          <>
            {content.registryMessage && (
              <SectionReveal
                universeConfig={universeConfig} disabled={motionDisabled}
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  marginBottom: '40px',
                  textAlign: 'center'
                }}
              >
                {content.registryMessage}
              </SectionReveal>
            )}

            {customGifts.length > 0 && (
              <div style={{ marginBottom: '48px' }}>
                <SectionReveal universeConfig={universeConfig} disabled={motionDisabled}>
                  <h2 style={sectionHeadingStyle(typography)}>Cash funds</h2>
                </SectionReveal>
                <div style={cardGridStyle}>
                  {customGifts.map(fund => (
                    <SectionReveal key={fund.id} universeConfig={universeConfig} disabled={motionDisabled}>
                      <CashFundCard fund={fund} theme={theme} typography={typography} coupleNames={coupleDisplayName(weddingDetails)} />
                    </SectionReveal>
                  ))}
                </div>
              </div>
            )}

            {registryProducts.length > 0 && (
              <div style={{ marginBottom: '48px' }}>
                <SectionReveal universeConfig={universeConfig} disabled={motionDisabled}>
                  <h2 style={sectionHeadingStyle(typography)}>Wishlist</h2>
                </SectionReveal>
                <div style={cardGridStyle}>
                  {registryProducts.map(product => (
                    <SectionReveal key={product.id} universeConfig={universeConfig} disabled={motionDisabled}>
                      <WishlistCard product={product} theme={theme} typography={typography} />
                    </SectionReveal>
                  ))}
                </div>
              </div>
            )}

            {registryLinks.length > 0 && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {registryLinks.map((registry, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={motionDisabled}>
                    <a
                      href={registry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: theme.darkBg,
                        color: theme.darkText,
                        padding: '24px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.accent;
                        e.currentTarget.style.color = theme.darkBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.darkBg;
                        e.currentTarget.style.color = theme.darkText;
                      }}
                    >
                      <span style={{
                        fontFamily: typography.headingFont,
                        fontSize: '1.125rem',
                        fontWeight: typography.headingWeight
                      }}>
                        {registry.name}
                      </span>
                      <ExternalLink size={18} />
                    </a>
                  </SectionReveal>
                ))}
              </div>
            )}

            {!hasAnyContent && (
              <SectionReveal universeConfig={universeConfig} disabled={motionDisabled}>
                <p style={{
                  fontFamily: typography.bodyFont,
                  fontSize: '1rem',
                  opacity: 0.6,
                  textAlign: 'center',
                }}>
                  The couple hasn't added anything to their registry yet.
                </p>
              </SectionReveal>
            )}
          </>
        )}
      </div>
    </div>
  );
}
