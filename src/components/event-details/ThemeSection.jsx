import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const AESTHETIC_OPTIONS  = ['Classic', 'Modern', 'Minimalist', 'Romantic', 'Rustic', 'Boho', 'Glamorous', 'Vintage', 'Luxury', 'Garden', 'Beach'];
const FAITH_OPTIONS      = ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Non-religious', 'Interfaith'];
const FAITH_FOR_INTERFAITH = ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist'];
const CULTURE_OPTIONS    = ['Indian', 'Chinese', 'Vietnamese', 'Korean', 'Filipino', 'Greek', 'Italian', 'Lebanese/Arabic', 'Persian', 'Pacific Islander', 'Latin American', 'African'];
const ATMOSPHERE_OPTIONS = ['Intimate & relaxed', 'Big party', 'Formal & elegant', 'Outdoor & nature', 'Destination', 'Multi-day'];
const SEASON_OPTIONS     = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SETTING_OPTIONS    = ['Indoor', 'Outdoor', 'Mix of both'];

const headingStyle = { fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 14px' };
const subLabelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 10px', display: 'block' };

function Pill({ label, selected, onClick, small, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        padding: small ? '5px 12px' : '6px 16px',
        borderRadius: 999,
        border: `1px solid ${selected ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
        background: selected ? '#0A0A0A' : 'transparent',
        color: selected ? '#FFFFFF' : '#0A0A0A',
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        fontFamily: PJS,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        opacity: disabled && !selected ? 0.6 : 1,
      }}>
      {label}
    </button>
  );
}

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

      {/* 1. Aesthetic */}
      <div>
        <p style={headingStyle}>What's the aesthetic?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AESTHETIC_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={(local.aesthetic || []).includes(opt)}
              onClick={() => toggleMulti('aesthetic', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </div>

      {/* 2. Faith / religion */}
      <div>
        <p style={headingStyle}>Faith or religion</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FAITH_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={local.faith === opt}
              onClick={() => setFaith(opt)}
              disabled={readOnly} />
          ))}
        </div>

        {local.faith === 'Interfaith' && (
          <div style={{ marginTop: 16, padding: '14px 16px', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, background: '#FAFAFA' }}>
            <span style={subLabelStyle}>
              Select the two faiths — {interfaithPicks.length}/2 selected
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FAITH_FOR_INTERFAITH.map(opt => (
                <Pill key={opt} label={opt} small
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
      </div>

      {/* 3. Culture / heritage */}
      <div>
        <p style={headingStyle}>Culture or heritage</p>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.5 }}>
          Separate from faith — you can be culturally Indian and non-religious, for example.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {CULTURE_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={(local.culture || []).includes(opt)}
              onClick={() => toggleMulti('culture', opt)}
              disabled={readOnly} />
          ))}
        </div>

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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0, display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 4. Atmosphere */}
      <div>
        <p style={headingStyle}>Atmosphere</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ATMOSPHERE_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={(local.atmosphere || []).includes(opt)}
              onClick={() => toggleMulti('atmosphere', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </div>

      {/* 5. Season */}
      <div>
        <p style={headingStyle}>Season</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SEASON_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={local.season === opt}
              onClick={() => setSingle('season', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </div>

      {/* 6. Setting */}
      <div>
        <p style={headingStyle}>Setting</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SETTING_OPTIONS.map(opt => (
            <Pill key={opt} label={opt}
              selected={local.setting === opt}
              onClick={() => setSingle('setting', opt)}
              disabled={readOnly} />
          ))}
        </div>
      </div>

      {/* Save — hidden entirely while read-only, not just disabled, since
          there is nothing for it to do (onSave's writes 403/no-op upstream). */}
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={handleSave} className="btn-primary" style={{ fontSize: 13, padding: '9px 24px' }}>
            Save theme
          </button>
        </div>
      )}

    </div>
  );
}
