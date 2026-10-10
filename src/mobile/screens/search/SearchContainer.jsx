import React, { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchScreenPage from './SearchScreenPage';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData } from '../../data/plan';
import { useSymbol } from '../../data/api';

/** /m/search over the same loaded data as the Plan hub. */
export default function SearchContainer() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const symbol = useSymbol();
  const d = usePlanData();
  const data = d.data || {};
  // Registry products, platforms and funds in one list, each tagged so the result knows which segment opens it.
  const registry = useMemo(() => [
    ...(data.registryProducts || []).map((r) => ({ ...r, kind: 'product' })),
    ...(data.registryItems || []).map((r) => ({ ...r, kind: 'link' })),
    ...(data.customGifts || []).map((r) => ({ ...r, kind: 'fund' })),
  ], [data.registryProducts, data.registryItems, data.customGifts]);
  return <SearchScreenPage guests={data.guests || []} tasks={data.tasks || []} vendors={data.vendors || []} schedule={data.schedule || []} budget={data.budget || []} registry={registry} messages={data.messages || []} symbol={symbol} base={base} onClose={() => navigate(-1)} />;
}
