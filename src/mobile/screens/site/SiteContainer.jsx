import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUniverse } from '@/lib/universeCatalog';
import { siteImageFor } from '../../lib/images';
import { ShellContext } from '../../shell/MobileShell';
import SiteScreen from './SiteScreen';
import { PasswordSheet, QrSheet, EmailGuestsSheet } from './SiteSheets';
import { useGuests } from '../../data/wedding';
import { useWedding } from '../../data/wedding';
import { useApi } from '../../data/api';
import { openExternal, shareLink } from '../../native';
import { siteUrlFor, openDesktop } from '../../lib/links';

export default function SiteContainer() {
  const navigate = useNavigate();
  const api = useApi();
  const wedding = useWedding();
  const guests = useGuests();
  const [sheet, setSheet] = useState(null); // 'password' | 'qr' | 'email'
  // websitePasswordGate.js: the credential is hashed server-side through /api/my-wedding-details; only whether one exists is known here.
  const savePassword = async (patch) => { await api.wedding.save(null, patch, true); await wedding.optimistic((w) => ({ ...(w || {}), websitePasswordEnabled: patch.websitePasswordEnabled ?? w?.websitePasswordEnabled, ...('websitePassword' in patch ? { websitePasswordIsSet: !!patch.websitePassword?.trim() } : {}) }), async () => {}); };
  const d = wedding.data;
  const universeId = d?.activeUniverse || '';
  const universe = universeId ? getUniverse(universeId) : null;
  const previewImage = siteImageFor(d);
  const { base } = useContext(ShellContext);
  const siteUrl = siteUrlFor(d);
  const coupleName = d?.couple1Name && d?.couple2Name ? `${d.couple1Name} & ${d.couple2Name}` : '';

  const share = async () => {
    const result = await shareLink({ title: coupleName ? `${coupleName}'s wedding` : 'Our wedding', text: 'Here is our wedding site.', url: siteUrl });
    if (result === 'copied') toast.success('Link copied');
    if (result === 'failed') toast.error('Could not share the link. Copy it from the address above.');
  };

  // StudioShareTab.jsx's publish toggle: no address, no going live.
  const togglePublish = async (on) => {
    if (on && !d?.slug) { toast.error('Add your names first so your guest suite has an address.'); return; }
    try {
      await wedding.optimistic((w) => ({ ...(w || {}), websiteEnabled: on }), () => api.wedding.save('websiteEnabled', on, false));
      toast.success(on ? 'Website is now live' : 'Website hidden');
    } catch { toast.error('Could not change that. Try again.'); }
  };

  return (
    <>
    <SiteScreen
      universeName={universe?.name}
      isLive={!!d?.websiteEnabled}
      onTogglePublish={togglePublish}
      passwordOn={!!d?.websitePasswordEnabled}
      onPassword={() => setSheet('password')}
      onQr={() => setSheet('qr')}
      onEmailGuests={() => setSheet('email')}
      previewImage={previewImage}
      coupleName={coupleName}
      siteUrl={siteUrl}
      onView={() => openExternal(siteUrl)}
      onShare={share}
      onOpen={(key) => navigate(`${base}/plan/${key}`)}
      onOpenDesktop={(path) => openDesktop(navigate, path)}
      loading={wedding.loading}
      error={wedding.error}
      onRetry={wedding.reload}
    />
    <PasswordSheet open={sheet === 'password'} onClose={() => setSheet(null)} enabled={!!d?.websitePasswordEnabled} hasStored={!!d?.websitePasswordIsSet} onSave={savePassword} />
    <QrSheet open={sheet === 'qr'} onClose={() => setSheet(null)} siteUrl={siteUrl} />
    <EmailGuestsSheet open={sheet === 'email'} onClose={() => setSheet(null)} guests={guests.data || []} siteUrl={siteUrl} onSend={api.sendEmail} />
    </>
  );
}
