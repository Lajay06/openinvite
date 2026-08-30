import React, { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { OptionAccordion, OptionAccordionSection, OptionPill } from '@/components/shared/OptionAccordion';
import { FAITH_OPTIONS, FAITH_FOR_INTERFAITH, CULTURE_REGIONS, CULTURE_CROSS_CUTTING } from '@/lib/weddingThemeOptions';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Round 8 ask #11: every option list on this page ordered alphabetically.
const AESTHETIC_OPTIONS  = ['Beach', 'Boho', 'Classic', 'Garden', 'Glamorous', 'Luxury', 'Minimalist', 'Modern', 'Romantic', 'Rustic', 'Vintage'];

const ATMOSPHERE_OPTIONS = ['Big party', 'Destination', 'Formal & elegant', 'Intimate & relaxed', 'Multi-day', 'Outdoor & nature'];
const SEASON_OPTIONS     = ['Autumn', 'Spring', 'Summer', 'Winter'];
const SETTING_OPTIONS    = ['Indoor', 'Mix of both', 'Outdoor'];

const headingStyle = { fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 14px' };
const subLabelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 10px', display: 'block' };

export default function ThemeSection({ theme, onSave, readOnly = false }) {
  const [local, setLocal] = useState({
    aesthetic: [],
    faith: '',
    faithSecondary: '',
    culture: [],
    cultureOther: '',
    atmosphere: [],
    season: '',
    setting: '',
    // preserve old fields so migration source stays intact
    vibes:            [],
    is_religious:     false,
    religious_details:'',
    is_cultural:      false,
    cultural_details: '',
    ...theme,
  });

  const [showCultureInput, setShowCultureInput] = useState(false);
  const [cultureSearch, setCultureSearch] = useState('');

  // Interfaith two-picks tracked locally (re-derived from faithSecondary on init)
  const [interfaithPicks, setInterfaithPicks] = useState(() => {
    if (theme?.faith === 'Interfaith' && theme?.faithSecondary) {
      return theme.faithSecondary.split(' and ').filter(Boolean);
    }
    return [];
  });

  const toggleMulti = (field, value) =>
    setLocal(prev => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });

  const setSingle = (field, value) =>
    setLocal(prev => ({ ...prev, [field]: prev[field] === value ? '' : value }));

  const setFaith = (value) => {
    setLocal(prev => ({ ...prev, faith: prev.faith === value ? '' : value, faithSecondary: '' }));
    if (value !== 'Interfaith') setInterfaithPicks([]);
  };

  const toggleInterfaithPick = (value) => {
    setInterfaithPicks(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      if (prev.length >= 2) { toast.error('Select exactly two faiths'); return prev; }
      return [...prev, value];
    });
  };

  const handleSave = () => {
    if (local.faith === 'Interfaith' && interfaithPicks.length !== 2) {
      toast.error('Select exactly two faiths for Interfaith');
      return;
    }
    const next = {
      ...local,
      faithSecondary: local.faith === 'Interfaith' ? interfaithPicks.join(' and ') : '',
    };
    onSave(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* WAVE 3 — the accordion pattern, FULL INSTANCE (structure and
          periphery both). The Theme tab is the densest options surface in the
          product: 89 pills across six groups, 52 of them culture. Rendering
          all six open was the reason it read as a wall.

          The local `Pill` that used to live at the top of this file is gone —
          it was the third copy of the same component, and it dies with this
          adoption rather than in a separate tidy-up. `small` becomes the named
          `size="compact"` variant, whose rule is written where the component
          is: primary options answer the section's question, compact ones
          qualify an answer already given. */}
      <OptionAccordion headingSize={13} headingWeight={700}>

      <OptionAccordionSection sectionKey="aesthetic" title="What's the aesthetic?" summary={local.aesthetic || []}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AESTHETIC_OPTIONS.map(opt => (
            <OptionPill key={opt} label={opt}
              selected={(local.aesthetic || []).includes(opt)}
              onClick={() => toggleMulti('aesthetic', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </OptionAccordionSection>

      <OptionAccordionSection
        sectionKey="faith"
        title="Faith or religion"
        summary={local.faith ? [local.faith === 'Interfaith' && interfaithPicks.length === 2 ? `Interfaith: ${interfaithPicks.join(' and ')}` : local.faith] : []}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FAITH_OPTIONS.map(opt => (
            <OptionPill key={opt} label={opt}
              selected={local.faith === opt}
              onClick={() => setFaith(opt)}
              disabled={readOnly} />
          ))}
        </div>

        {local.faith === 'Interfaith' && (
          <div style={{ marginTop: 16, padding: '14px 16px', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, background: '#FAFAFA' }}>
            <span style={subLabelStyle}>
              Select the two faiths — {interfaithPicks.length}/2 selected
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FAITH_FOR_INTERFAITH.map(opt => (
                <OptionPill key={opt} label={opt} size="compact"
                  selected={interfaithPicks.includes(opt)}
                  onClick={() => toggleInterfaithPick(opt)}
                  disabled={readOnly} />
              ))}
            </div>
            {interfaithPicks.length === 2 && (
              <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '10px 0 0', fontWeight: 600 }}>
                ✓ {interfaithPicks[0]} and {interfaithPicks[1]}
              </p>
            )}
          </div>
        )}
      </OptionAccordionSection>

      <OptionAccordionSection
        sectionKey="culture"
        title="Cultures and traditions"
        summary={[...(local.culture || []), ...(local.cultureOther ? [local.cultureOther] : [])]}
      >
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.5 }}>
          Separate from faith — you can be culturally Indian and non-religious, for example. Select as many as apply; this shapes Ava's suggestions and checklists.
        </p>

        {!readOnly && (
          <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.45)', pointerEvents: 'none' }} />
            <Input
              value={cultureSearch}
              onChange={e => setCultureSearch(e.target.value)}
              placeholder="Search cultures and traditions…"
              style={{ paddingLeft: 30 }}
            />
          </div>
        )}

        {(() => {
          const q = cultureSearch.trim().toLowerCase();
          const selected = local.culture || [];
          const visibleRegions = CULTURE_REGIONS
            .map(r => ({ ...r, items: q ? r.items.filter(opt => opt.toLowerCase().includes(q)) : r.items }))
            // While read-only, only ever show regions that have a selection —
            // no point rendering 50+ unselectable pills on someone else's view.
            .filter(r => readOnly ? r.items.some(opt => selected.includes(opt)) : r.items.length > 0);
          const visibleCrossCutting = CULTURE_CROSS_CUTTING
            .filter(opt => !q || opt.toLowerCase().includes(q))
            .filter(opt => !readOnly || selected.includes(opt));

          if (q && visibleRegions.length === 0 && visibleCrossCutting.length === 0) {
            return (
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 12px' }}>
                No matches for "{cultureSearch.trim()}" — try "Add your own" below.
              </p>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 12 }}>
              {visibleRegions.map(r => (
                <div key={r.region}>
                  <span style={subLabelStyle}>{r.region}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(readOnly ? r.items.filter(opt => selected.includes(opt)) : r.items).map(opt => (
                      <OptionPill key={opt} label={opt} size="compact"
                        selected={selected.includes(opt)}
                        onClick={() => toggleMulti('culture', opt)}
                        disabled={readOnly} />
                    ))}
                  </div>
                </div>
              ))}

              {visibleCrossCutting.length > 0 && (
                <div>
                  <span style={subLabelStyle}>Also relevant</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {visibleCrossCutting.map(opt => (
                      <OptionPill key={opt} label={opt} size="compact"
                        selected={selected.includes(opt)}
                        onClick={() => toggleMulti('culture', opt)}
                        disabled={readOnly} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {readOnly ? (
          local.cultureOther && (
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>{local.cultureOther}</p>
          )
        ) : !showCultureInput && !local.cultureOther ? (
          <button type="button" onClick={() => setShowCultureInput(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, fontWeight: 600, padding: 0 }}>
            <Plus size={13} /> Add your own
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              value={local.cultureOther || ''}
              onChange={e => setLocal(prev => ({ ...prev, cultureOther: e.target.value }))}
              placeholder="e.g. Nigerian, Filipino-Australian…"
              style={{ maxWidth: 280 }}
            />
            <button type="button" onClick={() => { setLocal(prev => ({ ...prev, cultureOther: '' })); setShowCultureInput(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 0, display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        )}
      </OptionAccordionSection>

      <OptionAccordionSection sectionKey="atmosphere" title="Atmosphere" summary={local.atmosphere || []}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ATMOSPHERE_OPTIONS.map(opt => (
            <OptionPill key={opt} label={opt}
              selected={(local.atmosphere || []).includes(opt)}
              onClick={() => toggleMulti('atmosphere', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </OptionAccordionSection>

      <OptionAccordionSection sectionKey="season" title="Season" summary={local.season ? [local.season] : []}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SEASON_OPTIONS.map(opt => (
            <OptionPill key={opt} label={opt}
              selected={local.season === opt}
              onClick={() => setSingle('season', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </OptionAccordionSection>

      <OptionAccordionSection sectionKey="setting" title="Setting" summary={local.setting ? [local.setting] : []}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SETTING_OPTIONS.map(opt => (
            <OptionPill key={opt} label={opt}
              selected={local.setting === opt}
              onClick={() => setSingle('setting', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </OptionAccordionSection>

      </OptionAccordion>

      {/* Save — hidden entirely while read-only, not just disabled, since
          there is nothing for it to do (onSave's writes 403/no-op upstream). */}
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
          <button type="button" onClick={handleSave} className="btn-primary" style={{ fontSize: 13, padding: '9px 24px' }}>
            Save theme
          </button>
        </div>
      )}

    </div>
  );
}
