import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/auth/Field';
import Button from '../../components/ui/Button';
import Notice from '../../components/ui/Notice';
import Icon from '../../components/ui/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import Calligraphy from '../../components/landing/Calligraphy';
export default function AuthPage({ mode }) {
  const signup = mode === 'signup';
  const { t } = useLanguage();
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  const submitting = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { document.title = `${t(mode)} · Baithak`; }, [t, mode]);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.username = data.username.trim().toLowerCase();
    const next = {};
    for (const key of ['username', 'password']) if (!data[key]) next[key] = 'required';
    if (signup && data.username && !/^[a-z0-9][a-z0-9_]{2,29}$/.test(data.username)) next.username = 'invalidUsername';
    if (signup && data.password && (data.password.length < 8 || data.password.length > 72)) next.password = 'invalidPassword';
    setErrors(next); setFailure('');
    if (Object.keys(next).length) { formRef.current.elements[Object.keys(next)[0]].focus(); return; }
    submitting.current = true; setBusy(true);
    try {
      const session = await authenticate(mode, data);
      const from = location.state?.from;
      if (alive.current) navigate(session.user.onboardingCompleted === false ? '/onboarding' : (typeof from === 'string' && /^\/app(?:\/|$)/.test(from) ? from : '/app'), { replace: true, state: location.state });
    } catch (error) {
      if (!alive.current) return;
      const message = errorMessage(error);
      setFailure(message);
      if (error.status === 409) { setErrors({ username: 'taken' }); requestAnimationFrame(() => { if (alive.current) formRef.current.elements.username.focus(); }); }
      else if (error.status === 422) {
        const field = error.details?.find((item) => ['username', 'password'].includes(item.field))?.field;
        if (field) { setErrors({ [field]: 'checkField' }); requestAnimationFrame(() => { if (alive.current) { const input = formRef.current.elements[field]; input.closest('details')?.setAttribute('open', ''); input.focus(); } }); }
      }
    } finally { if (alive.current) setBusy(false); submitting.current = false; }
  }
  return <main id="page-content" tabIndex={-1} className={`auth-layout auth-${mode}`}>
    <div className="auth-watermark" aria-hidden="true"><Calligraphy /></div>
    <div className="auth-intro"><h1 id="auth-title">{t(signup ? 'signupTitle' : 'loginTitle')}</h1></div>
    <section className="auth-panel" aria-labelledby="auth-title">
      <nav className="auth-route-nav" aria-label={t('accountNavigation')}>
        <Link to="/login" state={location.state} aria-current={!signup ? 'page' : undefined}>{t('login')}</Link>
        <Link to="/signup" state={location.state} aria-current={signup ? 'page' : undefined}>{t('signup')}</Link>
      </nav>

      <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy} onChange={(event) => { const key = event.target.name; setErrors((value) => ({ ...value, [key]: undefined })); setFailure(''); }}>
        <fieldset disabled={busy}>
          <Field name="username" label={t('username')} prefix="@" maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false} dir="ltr" required hint={signup && t('usernameHint')} error={errors.username && t(errors.username)} />
          <Field name="password" label={t('password')} type="password" autoComplete={signup ? 'new-password' : 'current-password'} maxLength={signup ? 72 : 200} required hint={signup && t('passwordLength')} error={errors.password && t(errors.password)} />
          {failure && <Notice>{t(failure)}</Notice>}
          {signup && <p className="recovery-note">{t('recoveryNote')}</p>}
          <Button type="submit" busy={busy} className="primary auth-submit">{t(busy ? (signup ? 'creating' : 'signingIn') : mode)}{!busy && <Icon name="arrow" className="action-arrow" />}</Button>
        </fieldset>
        <p className="sr-only" role="status" aria-live="polite">{Object.keys(errors).some((key) => errors[key]) ? t('checkFields') : busy ? t(signup ? 'creating' : 'signingIn') : ''}</p>
      </form>
      <Link className="guest-link" to="/app">{t('guest')}<Icon name="arrow" /></Link>
    </section>
  </main>;
}
