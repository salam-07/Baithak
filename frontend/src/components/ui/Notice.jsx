import Icon from './Icon';
export default function Notice({ children, tone = 'error', action }) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <Icon name={tone === 'error' ? 'alert' : 'check'} /><div>{children}{action}</div>
  </div>;
}
