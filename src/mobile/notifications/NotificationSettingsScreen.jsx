import React from 'react';
import { Moon } from 'lucide-react';
import Screen from '../shell/Screen';
import { RowGroup, Switch, PanelCard } from '../ui';
import { NOTIFICATION_GROUPS } from './copy';
import { hapticLight } from '../native';

/** A toggle per type plus quiet hours. Stored locally; not connected to push yet. */
export default function NotificationSettingsScreen({ settings, onChange, back }) {
  const groups = settings?.groups || {};
  const quiet = settings?.quietHours || { enabled: false, from: '22:00', to: '07:00' };
  const set = (patch) => { hapticLight(); onChange({ ...settings, ...patch }); };
  return (
    <Screen title="Notification settings" back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <RowGroup>
          {NOTIFICATION_GROUPS.map((g) => (
            <div key={g.key} className="oi-m-row" style={{ minHeight: 68 }}>
              <div className="oi-m-row__body">
                <div className="oi-m-row__label">{g.label}</div>
                <div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{g.sub}</div>
              </div>
              <Switch on={groups[g.key] !== false} onChange={(v) => set({ groups: { ...groups, [g.key]: v } })} label={g.label} />
            </div>
          ))}
        </RowGroup>
        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Quiet hours</h2>
          <RowGroup>
            <div className="oi-m-row">
              <span className="oi-m-row__tile oi-m-row__tile--ink"><Moon size={18} strokeWidth={1.75} /></span>
              <div className="oi-m-row__body">
                <div className="oi-m-row__label">Pause overnight</div>
                <div className="oi-m-row__sub">Nothing between {quiet.from} and {quiet.to}</div>
              </div>
              <Switch on={!!quiet.enabled} onChange={(v) => set({ quietHours: { ...quiet, enabled: v } })} label="Quiet hours" />
            </div>
            {quiet.enabled && (
              <div className="oi-m-row" style={{ gap: 12 }}>
                <label className="oi-m-field" style={{ flex: 1 }}>
                  <span className="oi-m-field__label">From</span>
                  <input className="oi-m-input" type="time" value={quiet.from} onChange={(e) => set({ quietHours: { ...quiet, from: e.target.value } })} />
                </label>
                <label className="oi-m-field" style={{ flex: 1 }}>
                  <span className="oi-m-field__label">To</span>
                  <input className="oi-m-input" type="time" value={quiet.to} onChange={(e) => set({ quietHours: { ...quiet, to: e.target.value } })} />
                </label>
              </div>
            )}
          </RowGroup>
        </section>
        <PanelCard tone="sand" label="About these settings" body="These choices are saved on this phone. Push notifications are not switched on yet, so for now they shape what you see in the app." />
      </div>
    </Screen>
  );
}
