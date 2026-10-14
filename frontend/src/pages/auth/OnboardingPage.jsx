import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/auth/Field';
import Button from '../../components/ui/Button';
import Notice from '../../components/ui/Notice';
import Icon from '../../components/ui/Icon';
import Calligraphy from '../../components/landing/Calligraphy';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';

export default function OnboardingPage() {
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const form = useRef(null);
  const submitting = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { document.title = `${t('onboardingIntro')} · Baithak`; }, [t]);
  function focusField(key) { requestAnimationFrame(() => { if (alive.current) form.current?.elements[key]?.focus(); }); }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.name = data.name.trim();
    data.location = data.location.trim();
    setFailure('');
    if (!data.name) { setErrors({ name: 'required' }); focusField('name'); return; }
    setErrors({});
    submitting.current = true;
    setBusy(true);
    try {
      await updateProfile(data);
      const from = location.state?.from;
      if (alive.current) navigate(typeof from === 'string' && /^\/app(?:\/|$)/.test(from) ? from : '/app', { replace: true });
    } catch (error) {
      if (!alive.current) return;
      setFailure(errorMessage(error));
      const key = error.details?.find((item) => ['name', 'location'].includes(item.field))?.field;
      if (key) { setErrors({ [key]: 'checkField' }); focusField(key); }
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <main id="page-content" tabIndex={-1} className="auth-layout auth-onboarding">
    <div className="auth-watermark" aria-hidden="true"><Calligraphy /></div>
    <div className="auth-intro"><h1>{t('onboardingTitle')}</h1></div>
    <section className="auth-panel" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title" className="onboarding-title">{t('onboardingIntro')}</h2>
      <form ref={form} onSubmit={submit} noValidate aria-busy={busy} onChange={(event) => { setErrors((value) => ({ ...value, [event.target.name]: undefined })); setFailure(''); }}>
        <fieldset disabled={busy}>
          <Field name="name" label={t('name')} maxLength={80} autoComplete="name" required dir="auto" defaultValue={user.name === user.username ? '' : user.name} error={errors.name && t(errors.name)} />
          <Field name="location" label={t('location')} maxLength={120} autoComplete="address-level2" dir="auto" defaultValue={user.location || ''} error={errors.location && t(errors.location)} />
          <p className="recovery-note onboarding-privacy">{t('onboardingPrivacy')}</p>
          {failure && <Notice>{t(failure)}</Notice>}
          <Button type="submit" busy={busy} className="primary auth-submit">{t(busy ? 'savingProfile' : 'finishSetup')}{!busy && <Icon name="arrow" className="action-arrow" />}</Button>
        </fieldset>
        <p className="sr-only" role="status" aria-live="polite">{Object.values(errors).some(Boolean) ? t('checkFields') : busy ? t('savingProfile') : ''}</p>
      </form>
    </section>
  </main>;
}
