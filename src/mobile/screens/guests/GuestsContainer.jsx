import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import GuestsScreen from './GuestsScreen';
import GuestDetailScreen from './GuestDetailScreen';
import GuestFormSheet from './GuestFormSheet';
import { ShellContext } from '../../shell/MobileShell';
import { useGuests, useWedding, guestWrites } from '../../data/wedding';
import { hapticLight } from '../../native';

/** Tag-based groupings become extra filter pills, as the desktop list offers. */
function groupingsFrom(guests) {
  const tags = new Map();
  for (const g of guests) for (const t of g.tags || []) tags.set(t, (tags.get(t) || 0) + 1);
  return [...tags.entries()].slice(0, 6).map(([t, n]) => ({ key: `tag:${t}`, label: t, count: n, test: (g) => (g.tags || []).includes(t) }));
}

/** /m/guests and /m/guests/:id. Loads through getMyGuestsWithRsvp, writes through guestWrites. */
export default function GuestsContainer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { base } = useContext(ShellContext);
  const guests = useGuests();
  const wedding = useWedding();
  const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [sheet, setSheet] = useState({ open: false, guest: null });

  // ?add=1 (from Home's quick action) opens the sheet once, then clears itself.
  const handledAdd = useRef(false);
  useEffect(() => {
    if (handledAdd.current) return;
    handledAdd.current = true;
    if (params.get('add') === '1') {
      setSheet({ open: true, guest: null });
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const list = guests.data || [];
  const groupings = useMemo(() => groupingsFrom(list), [list]);
  const current = id ? list.find((g) => g.id === id) : null;

  const save = async (fields) => {
    if (sheet.guest) {
      await guestWrites.update(sheet.guest.id, fields);
      toast.success('Guest updated');
    } else {
      await guestWrites.create(fields, wedding.data);
      toast.success('Guest added');
    }
    hapticLight();
    guests.reload();
  };

  const remove = async () => {
    if (!current) return;
    if (!window.confirm(`Remove ${current.name || 'this guest'} from your list?`)) return;
    try {
      await guestWrites.remove(current.id);
      toast.success('Guest removed');
      guests.reload();
      navigate(`${base}/guests`, { replace: true });
    } catch (e) {
      toast.error(e?.message || 'Could not remove this guest. Try again.');
    }
  };

  return (
    <>
      {id ? (
        <GuestDetailScreen
          guest={current}
          back={`${base}/guests`}
          onEdit={() => setSheet({ open: true, guest: current })}
          onDelete={remove}
        />
      ) : (
        <GuestsScreen
          guests={list}
          filter={filter}
          onFilter={setFilter}
          groupings={groupings}
          onOpenGuest={(g) => navigate(`${base}/guests/${g.id}`)}
          onAdd={() => setSheet({ open: true, guest: null })}
          loading={guests.loading}
          error={guests.error}
          onRetry={guests.reload}
        />
      )}
      <GuestFormSheet open={sheet.open} guest={sheet.guest} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={save} />
    </>
  );
}
