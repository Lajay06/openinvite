import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUniverse } from '@/lib/universeCatalog';
import { ShellContext } from '../../shell/MobileShell';
import SiteScreen from './SiteScreen';
import { publishState, PUBLISH_STATE, PUBLISH_SENTENCE } from '@/lib/publishState';
import { PasswordSheet } from './SiteSheets';
import { useWedding } from '../../data/wedding';
import { useApi } from '../../data/api';
import { openExternal } from '../../native';
import { siteUrlFor, desktopHandoff } from '../../lib/links';
import { coupleDisplayName } from '@/lib/coupleNames';

export default function SiteContainer() {
  const navigate = useNavigate();
  const api = useApi();
  const wedding = useWedding();
  const [sheet, setSheet] = useState(null); // 'password'
  // websitePasswordGate.js: the credential is hashed server-side through /api/my-wedding-details; only whether one exists is known here.
  const savePassword = async (patch) => { await api.wedding.save(null, patch, true); await wedding.optimistic((w) => ({ ...(w || {}), websitePasswordEnabled: patch.websitePasswordEnabled ?? w?.websitePasswordEnabled, ...('websitePassword' in patch ? { websitePasswordIsSet: !!patch.websitePassword?.trim() } : {}) }), async () => {}); };
  const d = wedding.data;
  const universeId = d?.activeUniverse || '';
  const universe = universeId ? getUniverse(universeId) : null;
  const { base } = useContext(ShellContext);
  const siteUrl = siteUrlFor(d);
  const coupleName = coupleDisplayName(d || {});

  // StudioShareTab.jsx's publish toggle: no address, no going live.
  const togglePublish = async (on) => {
    if (on && !d?.slug) { toast.error('Add your names first so your Guest Suite has an address.'); return; }
    try {
      await wedding.optimistic((w) => ({ ...(w || {}), websiteEnabled: on }), () => api.wedding.save('websiteEnabled', on, false));
      // src/lib/publishState.js's sentences, the only words for the state.
      toast.success(PUBLISH_SENTENCE[on ? PUBLISH_STATE.LIVE : PUBLISH_STATE.HIDDEN]);
    } catch { toast.error('Could not change that. Try again.'); }
  };

  return (
    <>
    <SiteScreen
      universeName={universe?.name}
      state={publishState(d)}
      onTogglePublish={togglePublish}
      passwordOn={!!d?.websitePasswordEnabled}
      onPassword={() => setSheet('password')}
      details={d}
      coupleName={coupleName}
      siteUrl={siteUrl}
      onView={() => openExternal(siteUrl)}
      onOpen={(key) => navigate(`${base}/plan/${key}`)}
      handoff={(path) => desktopHandoff(navigate, path)}
      loading={wedding.loading}
      error={wedding.error}
      onRetry={wedding.reload}
    />
    <PasswordSheet open={sheet === 'password'} onClose={() => setSheet(null)} enabled={!!d?.websitePasswordEnabled} hasStored={!!d?.websitePasswordIsSet} onSave={savePassword} />
    </>
  );
}
