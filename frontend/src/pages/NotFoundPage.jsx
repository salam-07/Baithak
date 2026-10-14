import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
export default function NotFoundPage() { const { t } = useLanguage(); return <main id="page-content" tabIndex={-1} className="status-page"><h1>{t('notFound')}</h1><Link className="button primary" to="/">{t('backHome')}</Link></main>; }