import React, { useMemo, useState } from 'react';
import { Gift, Share2, ShoppingBag, Copy, Mail, MessageCircle, MessageSquare, Sparkles, Check, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { StatCard, PanelCard, RowGroup, Row, ProgressBar, BottomSheet, PillButton, TextField, TextAreaField, ErrorState, SkeletonRows, ItemList, ItemCard } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import EntityListScreen from '../../features/EntityListScreen';
import { ENTITIES } from '../../features/schemas';
import { imageUrl } from '../../images';
import { openExternal, shareLink } from '../../native';
import { money } from '../../lib/format';

const SEGMENTS = [{ key: 'overview', label: 'Overview' }, { key: 'links', label: 'Platforms' }, { key: 'products', label: 'Products' }, { key: 'funds', label: 'Cash funds' }, { key: 'received', label: 'Received' }];

/**
 * Registry, as Registry.jsx: Overview (stats, the consolidated view,
 * Share), Platforms (RegistryItem), Products (RegistryProduct, with the
 * desktop's mark-purchased flow), Cash funds (CustomGift), Received gifts
 * (ReceivedGift with the giver from the guest list, search, thanked, and
 * Ava's thank-you note). The GuestSuiteRegistry mirror is this screen too.
 */
export default function RegistryScreen({ lists, symbol = '$', registryUrl = '', onAsk, back }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [share, setShare] = useState(false);
  const [purchase, setPurchase] = useState(null); // product
  const links = lists.links?.items || [];
  const products = lists.products?.items || [];
  const funds = lists.funds?.items || [];
  const received = lists.received?.items || [];
  const value = received.reduce((s, g) => s + (Number(g.estimated_value) || 0), 0);
  const totalRequested = products.reduce((s, p) => s + (p.quantity_requested || 1), 0);
  const totalPurchased = products.reduce((s, p) => s + (p.quantity_purchased || 0), 0);
  const completion = totalRequested ? Math.round((totalPurchased / totalRequested) * 100) : 0;
  const loading = SEGMENTS.some((s) => lists[s.key]?.loading);

  const schemas = useMemo(() => ({
    links: ENTITIES['registry-links'],
    products: { ...ENTITIES['registry-products'], full: true, row: (r) => ({ ...ENTITIES['registry-products'].row(r), action: (r.quantity_purchased || 0) < (r.quantity_requested || 1) ? { icon: ShoppingBag, label: `Mark ${r.name} purchased`, onClick: () => setPurchase(r) } : undefined }) },
    funds: ENTITIES['registry-funds'],
    received: {
      ...ENTITIES['registry-received'],
      full: true,
      search: (g, q) => [g.item_name, g.giver_name, g.notes].some((x) => (x || '').toLowerCase().includes(q)),
      searchPlaceholder: 'Search gifts or givers',
      // ReceivedGifts.jsx's one-tap toggle: thank_you_sent with today's date, or cleared.
      row: (g) => ({ ...ENTITIES['registry-received'].row(g), action: { icon: g.thank_you_sent ? Undo2 : Check, label: g.thank_you_sent ? `Mark ${g.item_name} not yet thanked` : `Mark ${g.item_name} thanked`, tone: g.thank_you_sent ? 'neutral' : 'primary', onClick: () => lists.received.update(g.id, { thank_you_sent: !g.thank_you_sent, thank_you_date: g.thank_you_sent ? '' : new Date().toISOString().split('T')[0] }) } }),
      toForm: (g) => ({ ...g, giver: g.giver_name ? { name: g.giver_name, guestId: g.giver_guest_id || null } : null }),
      fromForm: (v) => { const { giver, ...rest } = v; return { ...rest, estimated_value: rest.estimated_value === '' || rest.estimated_value == null ? undefined : Number(rest.estimated_value), giver_guest_id: giver?.guestId || '', giver_name: giver?.name || '', giver_email: rest.giver_email || giver?.email || '', thank_you_date: rest.thank_you_sent ? (rest.thank_you_date || new Date().toISOString().split('T')[0]) : '' }; },
      sheetChildren: (v, setV) => <ThankYouHelper v={v} setV={setV} onAsk={onAsk} />,
    },
  }), [onAsk, lists.received]);

  if (segment === 'overview') {
    return (
      <Screen title="Registry" subtitle={loading ? '' : `${links.length + products.length + funds.length} on your site`} back={back} actions={[{ icon: Share2, label: 'Share the registry', onClick: () => setShare(true) }]}>
        <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
        <div className="oi-m-stack oi-m-stack--24">
          {loading ? <SkeletonRows count={4} /> : lists.links?.error ? <ErrorState onRetry={lists.links.reload} /> : (
            <>
              <div className="oi-m-grid2">
                <StatCard icon={Gift} label="Platforms" numeric={links.length} />
                <StatCard icon={ShoppingBag} label="Products" numeric={products.length} ink />
              </div>
              {products.length > 0 && <div className="oi-m-grid2"><StatCard icon={Gift} label="Cash funds" numeric={funds.length} /><StatCard icon={ShoppingBag} label="Total value" number={money(Math.round(products.reduce((t, p) => t + (Number(p.price) || 0) * (p.quantity_requested || 1), 0)), symbol)} ink /></div>}
              <div className="oi-m-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}><span className="oi-m-section">Bought so far</span><span className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{completion}%</span></div>
                <ProgressBar value={totalPurchased} max={totalRequested || 1} note={totalRequested ? `${totalPurchased} of ${totalRequested} products bought.` : 'Add products to track what gets bought.'} />
              </div>
              {links.length + products.length + funds.length === 0 ? (
                <PanelCard tone="neutral" label="Nothing listed yet" title="Start your registry" body="Link a store, list the products you want, or set up a cash fund. Guests see it on your site." action="Add a platform" onClick={() => setSegment('links')} />
              ) : (
                <>
                  {links.length > 0 && <section><h2 className="oi-m-section" style={{ marginBottom: 12 }}>Registry platforms</h2><RowGroup>{links.map((l) => <Row key={l.id} icon={Gift} tile="neutral" label={l.store_name} sub={l.description || (l.url || '').replace(/^https?:\/\//, '')} onClick={l.url ? () => openExternal(l.url) : undefined} chevron={false} />)}</RowGroup></section>}
                  {products.length > 0 && <section><h2 className="oi-m-section" style={{ marginBottom: 12 }}>Featured products</h2><ItemList>{products.slice(0, 4).map((p) => <ItemCard key={p.id} image={p.image_url} alt={p.name} icon={ShoppingBag} title={p.name} meta={[p.registry_platform, `${p.quantity_purchased || 0} of ${p.quantity_requested || 1} bought`].filter(Boolean).join(', ')} value={p.price ? money(p.price, symbol) : ''} onClick={() => setSegment('products')} />)}</ItemList></section>}
                  {funds.length > 0 && <section><h2 className="oi-m-section" style={{ marginBottom: 12 }}>Cash funds</h2><RowGroup>{funds.map((f) => <Row key={f.id} icon={Gift} tile="tint" label={f.title} sub={f.description} value={f.requested_amount ? `Goal ${money(f.requested_amount, symbol)}` : ''} onClick={() => setSegment('funds')} />)}</RowGroup></section>}
                </>
              )}
              {received.length > 0 && <PanelCard tone="ink" label="Received" title={`${received.length} gift${received.length === 1 ? '' : 's'}, about ${money(value, symbol)}`} body={`${received.filter((g) => !g.thank_you_sent).length} thank you${received.filter((g) => !g.thank_you_sent).length === 1 ? '' : 's'} still to send.`} action="See the gifts" onClick={() => setSegment('received')} />}
            </>
          )}
        </div>
        <ShareSheet open={share} onClose={() => setShare(false)} url={registryUrl} links={links.length} products={products.length} />
      </Screen>
    );
  }

  const l = lists[segment];
  const header = (
    <>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'received' && received.length > 0 && (
        <div className="oi-m-stack" style={{ marginBottom: 24 }}>
          <div className="oi-m-grid2">
            <StatCard icon={Gift} label="Gifts received" numeric={received.length} />
            <StatCard icon={Gift} label="Thank yous to send" numeric={received.filter((g) => !g.thank_you_sent).length} ink />
          </div>
          <p className="oi-m-meta">About {money(value, symbol)} in gifts so far.</p>
        </div>
      )}
    </>
  );
  return (
    <>
      <EntityListScreen key={segment} schema={{ ...schemas[segment], title: 'Registry', emptyImage: imageUrl('emptyRegistry') }} items={l.items} onCreate={l.create} onUpdate={l.update} onDelete={l.remove} loading={l.loading} error={l.error} onRetry={l.reload} back={back} subtitle={schemas[segment].title.toLowerCase()} header={header} onRefresh={l.reload} />
      {purchase && <PurchaseSheet product={purchase} onClose={() => setPurchase(null)} onSave={async (data) => { const p = purchase; await lists.products.update(p.id, { quantity_purchased: (p.quantity_purchased || 0) + data.quantity, purchased_by: [...(p.purchased_by || []), { ...data, purchase_date: new Date().toISOString() }] }); setPurchase(null); }} />}
    </>
  );
}

/** RegistryProductList's purchase modal: who bought it, how many, a message. */
function PurchaseSheet({ product, onClose, onSave }) {
  const remaining = (product.quantity_requested || 1) - (product.quantity_purchased || 0);
  const [f, setF] = useState({ guest_name: '', quantity: 1, message: '' });
  const [busy, setBusy] = useState(false);
  const qty = parseInt(f.quantity, 10) || 0;
  const bad = qty < 1 ? 'At least one.' : qty > remaining ? `Only ${remaining} remaining.` : '';
  return (
    <BottomSheet open onClose={onClose} title={`Mark ${product.name} purchased`} footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" icon={Check} style={{ flex: 1 }} disabled={busy || !!bad} onClick={async () => { setBusy(true); try { await onSave({ ...f, quantity: qty }); toast.success('Marked purchased'); } finally { setBusy(false); } }}>Save</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Bought by" value={f.guest_name} onChange={(e) => setF({ ...f, guest_name: e.target.value })} placeholder="A guest's name" autoCapitalize="words" />
        <TextField label="How many" type="number" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} error={bad} />
        <TextAreaField label="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={2} placeholder="Anything they said" />
      </div>
    </BottomSheet>
  );
}

/** ReceivedGifts' generateNote: Ava writes a thank-you for this gift and giver. */
function ThankYouHelper({ v, setV, onAsk }) {
  const [busy, setBusy] = useState(false);
  if (!onAsk) return null;
  const go = async () => {
    setBusy(true);
    try {
      const text = await onAsk(`Write a warm, personal thank-you note for a wedding gift.\nGift: "${v.item_name || 'a gift'}". Giver: "${v.giver?.name || 'our guest'}".\nKeep it 3-4 sentences, heartfelt and specific to the gift. Plain text only.`);
      if (typeof text === 'string' && text.trim()) setV((s) => ({ ...s, thank_you_note: text.trim() })); else toast.error('Ava did not write a note.');
    } catch { toast.error('Ava could not write that just now.'); } finally { setBusy(false); }
  };
  return <PillButton variant="secondary" size="sm" icon={Sparkles} onClick={go} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Ava is writing' : 'Ask Ava to write the thank you'}</PillButton>;
}

/** ShareRegistryModal: the registry page link by copy, share sheet, email, SMS, WhatsApp. */
function ShareSheet({ open, onClose, url, links, products }) {
  const message = `Check out our wedding registry. We have registered at ${links} store${links === 1 ? '' : 's'} and have ${products} item${products === 1 ? '' : 's'} on our list. ${url}`;
  return (
    <BottomSheet open={open} onClose={onClose} title="Share your registry">
      {!url ? <p className="oi-m-body">Your site has no address yet, so there is no registry link to share until then.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="oi-m-meta" style={{ overflowWrap: 'anywhere' }}>{url.replace(/^https?:\/\//, '')}</div>
          <RowGroup>
            <Row icon={Copy} tile="neutral" label="Copy the link" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied'); } catch { toast.error('Could not copy'); } }} chevron={false} />
            <Row icon={Share2} tile="neutral" label="Share" sub="The share sheet" onClick={async () => { const r = await shareLink({ title: 'Our wedding registry', text: message, url }); if (r === 'copied') toast.success('Link copied'); }} chevron={false} />
            <Row icon={Mail} tile="neutral" label="Email" onClick={() => openExternal(`mailto:?subject=${encodeURIComponent('Our Wedding Registry')}&body=${encodeURIComponent(message)}`)} chevron={false} />
            <Row icon={MessageSquare} tile="neutral" label="Text message" onClick={() => openExternal(`sms:?body=${encodeURIComponent(message)}`)} chevron={false} />
            <Row icon={MessageCircle} tile="neutral" label="WhatsApp" onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`)} chevron={false} />
            <Row icon={Share2} tile="neutral" label="Facebook" onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)} chevron={false} />
          </RowGroup>
        </div>
      )}
    </BottomSheet>
  );
}
