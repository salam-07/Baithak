import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="landing-nav">
      <a className="brand" href="#top" aria-label="Baithak by Echo, home">baithak <span>By Echo</span></a>
      <nav aria-label="Main navigation">
        <a href="#our-purpose">The purpose<span lang="pa-Arab" dir="rtl">ساڈی سوچ</span></a>
        <a href="#the-experience">The idea<span lang="pa-Arab" dir="rtl">بیٹھک وچ</span></a>
        <a href="#our-promise">The promise<span lang="pa-Arab" dir="rtl">ساڈا وعدہ</span></a>
        <Link to="/login">Sign in<span lang="pa-Arab" dir="rtl">اندر آؤ</span></Link>
        <Link to="/signup">Sign up<span lang="pa-Arab" dir="rtl">اکاؤنٹ بناؤ</span></Link>
      </nav>
    </header>
  );
}
