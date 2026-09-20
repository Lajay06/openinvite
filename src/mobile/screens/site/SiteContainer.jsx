import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUniverse } from '@/lib/universeCatalog';
import { heroImageFor } from '../../lib/images';
import { ShellContext } from '../../shell/MobileShell';
import SiteScreen from './SiteScreen';
import { useWedding } from '../../data/wedding';
import { openExternal, shareLink } from '../../native';
import { siteUrlFor, openDesktop } from '../../lib/links';

export default function SiteContainer() {
  const navigate = useNavigate();
  const wedding = useWedding();
  const d = wedding.data;
  const universeId = d?.activeUniverse || '';
  const universe = universeId ? getUniverse(universeId) : null;
  const previewImage = heroImageFor(d);
  const { base } = useContext(ShellContext);
  const siteUrl = siteUrlFor(d);
  const coupleName = d?.couple1Name && d?.couple2Name ? `${d.couple1Name} & ${d.couple2Name}` : '';

  const share = async () => {
    const result = await shareLink({ title: coupleName ? `${coupleName}'s wedding` : 'Our wedding', text: 'Here is our wedding site.', url: siteUrl });
    if (result === 'copied') toast.success('Link copied');
    if (result === 'failed') toast.error('Could not share the link. Copy it from the address above.');
  };

  return (
    <SiteScreen
      universeName={universe?.name}
      isLive={!!d?.websiteEnabled}
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
  );
}
