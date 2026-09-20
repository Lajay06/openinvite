import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { FilterPills, StatCard } from '../../ui';
import EntityListScreen from '../../features/EntityListScreen';
import { ENTITIES } from '../../features/schemas';

const SEGMENTS = [{ key: 'links', label: 'Registries' }, { key: 'products', label: 'Products' }, { key: 'funds', label: 'Cash funds' }, { key: 'received', label: 'Received' }];
const SCHEMA = { links: ENTITIES['registry-links'], products: ENTITIES['registry-products'], funds: ENTITIES['registry-funds'], received: ENTITIES['registry-received'] };

/**
 * Registry: four lists (registry links, products, cash funds, received
 * gifts), each a full EntityListScreen over its own entity, the same three
 * the desktop Registry page writes plus ReceivedGift.
 */
export default function RegistryScreen({ lists, symbol = '$', back }) {
  const [params, setParams] = useSearchParams();
  const segment = SEGMENTS.some((s) => s.key === params.get('segment')) ? params.get('segment') : 'links';
  const l = lists[segment];
  const received = lists.received?.items || [];
  const value = received.reduce((s, g) => s + (Number(g.estimated_value) || 0), 0);
  const header = (
    <>
      <FilterPills className="oi-m-segments" options={SEGMENTS} value={segment} onChange={(k) => { params.set('segment', k); setParams(params, { replace: true }); }} />
      {segment === 'received' && received.length > 0 && (
        <div className="oi-m-stack" style={{ marginBottom: 24 }}>
          <div className="oi-m-grid2">
            <StatCard icon={Gift} label="Gifts received" numeric={received.length} />
            <StatCard icon={Gift} label="Thank yous to send" numeric={received.filter((g) => !g.thank_you_sent).length} ink />
          </div>
          <p className="oi-m-meta">About {symbol}{value.toLocaleString('en-US')} in gifts so far.</p>
        </div>
      )}
    </>
  );
  return (
    <EntityListScreen
      key={segment}
      schema={{ ...SCHEMA[segment], title: 'Registry' }}
      items={l.items}
      onCreate={l.create}
      onUpdate={l.update}
      onDelete={l.remove}
      loading={l.loading}
      error={l.error}
      onRetry={l.reload}
      back={back}
      subtitle={`${SCHEMA[segment].title.toLowerCase()}`}
      header={header}
    />
  );
}
