import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { PillButton, TextField, SmartImage } from '../../ui';
import { imageUrl } from '../../images';

/**
 * Mobile sign-in: email and password, show and hide, plain errors, links out
 * to the existing reset flow. Provider buttons appear only when the web
 * app offers them (`providers`), and go through the deep-link handling.
 * New accounts are created on the website (see the sign-up note).
 */
export default function LoginScreen({ onSubmit, onProvider, providers = [], onForgot, onSignUp, onBack, busy = false, error = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [local, setLocal] = useState({});
  const submit = (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!email.trim()) errs.email = 'Add your email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'That email does not look right.';
    if (!password) errs.password = 'Add your password.';
    setLocal(errs);
    if (Object.keys(errs).length) return;
    onSubmit?.({ email: email.trim(), password });
  };
  return (
    <div className="oi-m-login">
      <div className="oi-m-login__top">
        <SmartImage src={imageUrl('login')} alt="" width={390} ratio="3/2" square eager tone="ink" style={{ position: 'absolute', inset: 0, height: '100%', aspectRatio: 'auto' }} />
        <div className="oi-m-hero__scrim" />
        {onBack && (
          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--dark" onClick={onBack} aria-label="Back" style={{ position: 'absolute', top: 'calc(var(--m-safe-top) + 8px)', left: 16, zIndex: 2 }}>
            <ArrowLeft size={22} strokeWidth={1.75} />
          </button>
        )}
        <div className="oi-m-login__title">
          <h1 className="oi-m-title oi-m-on-dark">Welcome back</h1>
          <p className="oi-m-body oi-m-on-dark-2">Sign in to keep planning.</p>
        </div>
      </div>
      <form className="oi-m-login__form" onSubmit={submit} noValidate>
        <TextField id="login-email" label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} error={local.email} placeholder="you@example.com" />
        <div className="oi-m-field">
          <label htmlFor="login-password" className="oi-m-field__label">Password</label>
          <div style={{ position: 'relative' }}>
            <input id="login-password" className={`oi-m-input${local.password ? ' oi-m-input--error' : ''}`} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 56 }} />
            <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} style={{ position: 'absolute', right: 4, top: 4 }}>
              {show ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
            </button>
          </div>
          {local.password && <div className="oi-m-field__error" role="alert">{local.password}</div>}
        </div>
        {error && <p className="oi-m-field__error" role="alert">{error}</p>}
        <PillButton variant="primary" block type="submit" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</PillButton>
        <button type="button" className="oi-m-block__link" onClick={onForgot} style={{ alignSelf: 'center', margin: 0 }}>Forgot your password</button>
        {providers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <p className="oi-m-meta" style={{ textAlign: 'center' }}>Or continue with</p>
            {providers.map((p) => <PillButton key={p.key} variant="secondary" block onClick={() => onProvider?.(p.key)} disabled={busy}>{p.label}</PillButton>)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
          <span className="oi-m-meta">New to Openinvite?</span>
          <button type="button" className="oi-m-block__link" onClick={onSignUp} style={{ margin: 0 }}>Create an account</button>
        </div>
      </form>
    </div>
  );
}
