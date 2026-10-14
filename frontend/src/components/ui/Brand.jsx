import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
export default function Brand() {
  const { t } = useLanguage();
  return <Link to="/" className="brand" aria-label={`Baithak · ${t('home')}`} dir="ltr">baithak <span>By Echo</span></Link>;
}