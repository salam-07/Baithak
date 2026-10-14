import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PageHeading from '../../components/layout/PageHeading';
import Icon from '../../components/ui/Icon';
import Notice from '../../components/ui/Notice';
import { StoryList } from '../../components/stories/StoryList';
import { errorMessage } from '../../lib/api';

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [writingOpen, setWritingOpen] = useState(false);
  const signingOut = useRef(false);
  async function signOut() {
    if (signingOut.current) return;
    signingOut.current = true; setBusy(true); setError('');
    try { await logout(); } catch (failure) { setError(errorMessage(failure)); }
    finally { signingOut.current = false; setBusy(false); }
  }
  return <section className="workspace-page discovery-page profile-page"><PageHeading title={t('profile')} />
    <div className="profile-intro">{user ? <div className="account-identity"><span className="avatar" aria-hidden="true">{Array.from(user.name || user.username || 'B')[0]}</span><div><h2 dir="auto">{user.name || user.username}</h2><p dir="ltr">@{user.username}</p></div></div> : <><h2>{t('authStatement')}</h2><p>{t('joinPrompt')}</p><div className="profile-actions"><Link className="button primary" to="/signup">{t('signup')}</Link><Link className="text-link" to="/login">{t('login')}</Link></div></> }</div>
    <Link className="profile-setting profile-write-row" to="/app/write"><span><strong>{t('write')}</strong><span>{t('profileWriteHint')}</span></span><Icon name="write" /></Link>
    {user && <details className="profile-writing" onToggle={event => setWritingOpen(event.currentTarget.open)}><summary><span>{t('myWriting')}</span><Icon name="down" /></summary>{writingOpen && <StoryList path="/stories/mine?limit=12" empty="noOwnStories" />}</details>}
    <Link className="profile-setting" to="/app/profile/settings"><span><strong>{t('settings')}</strong><span>{t('chooseLanguage')} <span className="profile-language" lang={language.lang} dir={language.dir}>{language.label}</span></span></span><Icon name="arrow" /></Link>
    {user && <div className="profile-signout">{error && <Notice>{t(error)}</Notice>}<button className="text-button" disabled={busy} onClick={signOut}><Icon name="logout" />{t(busy ? 'signingOut' : 'logout')}</button></div>}
  </section>;
}

