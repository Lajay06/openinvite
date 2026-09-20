import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchScreenPage from './SearchScreenPage';
import { ShellContext } from '../../shell/MobileShell';
import { usePlanData } from '../../data/plan';

export default function SearchContainer() {
  const navigate = useNavigate();
  const { base } = useContext(ShellContext);
  const d = usePlanData();
  return <SearchScreenPage guests={d.data?.guests || []} tasks={d.data?.tasks || []} vendors={d.data?.vendors || []} base={base} onClose={() => navigate(-1)} />;
}
