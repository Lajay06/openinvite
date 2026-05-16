import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function SectionInput({ label, value, onChange, placeholder, type = "text", isTextarea = false }) {
  const InputComponent = isTextarea ? Textarea : Input;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <InputComponent type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
