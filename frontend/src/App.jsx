import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

function Arrow({ down = false }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={down ? 'arrow-down' : ''}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Pair({ urdu, punjabi, className = '' }) {
  return <div className={`language-pair ${className}`}><p lang="ur" dir="rtl"><span className="language-label">اردو</span>{urdu}</p><p lang="pa-Arab" dir="rtl"><span className="language-label">پنجابی</span>{punjabi}</p></div>
}

function App() {
  const root = useRef(null)
  const [keyword, setKeyword] = useState('vanjhali')
  const entries = {
    vanjhali: { title: 'ونجھلی', english: 'Vanjhali · The flute', urdu: 'ونجھلی بانسری کو کہتے ہیں۔ ہیر رانجھا کی کہانی میں اس کی دھن رانجھے کی پہچان ہے۔', punjabi: 'ونجھلی بانسری نوں آکھدے نیں۔ ہیر رانجھے دی کہانی وچ ایہدی تان رانجھے دی پہچان اے۔' },
    chenab: { title: 'چناب', english: 'Chenab · The river', urdu: 'پنجاب کا ایک دریا، جو سوہنی مہینوال کی کہانی کا بھی حصہ ہے۔', punjabi: 'پنجاب دا اک دریا، جیہڑا سوہنی مہینوال دی کہانی دا وی حصہ اے۔' },
    heer: { title: 'ہیر', english: 'Heer · The story', urdu: 'ہیر رانجھا پنجاب کی محبت کی کہانی ہے۔ اسے کئی نسلوں نے اپنے اپنے انداز میں سنایا ہے۔', punjabi: 'ہیر رانجھا پنجاب دی محبت دی کہانی اے۔ کئی پیڑھیاں نے ایہنوں اپنے اپنے رنگ وچ سنایا اے۔' },
  }
  const entry = entries[keyword]

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    let disposed = false
    document.fonts.ready.then(() => {
      if (disposed) return
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const strokes = root.current.querySelectorAll('.ink-stroke')
        strokes.forEach(path => {
          const length = path.getTotalLength()
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
        })
        const intro = gsap.timeline()
        intro.from('.bloom', { scale: 0.45, opacity: 0, duration: 2.5, stagger: 0.18, ease: 'power2.out' })
          .to(strokes, { strokeDashoffset: 0, duration: 1.35, stagger: 0.23, ease: 'power2.inOut' }, 0.15)
          .from('.hero-copy', { opacity: 0.2, y: 16, duration: 0.9, ease: 'expo.out' }, 0.8)
        gsap.to('.bloom-one', { yPercent: 18, xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } })
        gsap.from('.mission-word', { color: '#9d806d', stagger: 0.16, scrollTrigger: { trigger: '.mission', start: 'top 75%', end: 'center 50%', scrub: 1 } })
        gsap.from('.story-sheet', { rotate: -4, y: 65, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.discovery', start: 'top 78%', once: true } })
        gsap.from('.connecting-line', { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.keyword-section', start: 'top 72%', once: true } })
        gsap.from('.closing-mark', { y: 45, opacity: 0.4, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.closing', start: 'top 80%', once: true } })
      }, root)
    })
    return () => { disposed = true; mm.revert() }
  }, [])

  return <div ref={root}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header flex items-center justify-between">
      <a className="wordmark" href="#home" aria-label="Baithak home">baithak<span>by Echo</span></a>
      <nav aria-label="Main navigation" className="flex items-center gap-7"><a href="#why">Our story</a><a href="#discover">Discover</a><a className="nav-cta" href="#story">Take a seat <Arrow /></a></nav>
    </header>
    <main id="main">
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="blooms" aria-hidden="true"><div className="bloom bloom-one" /><div className="bloom bloom-two" /><div className="bloom bloom-three" /></div>
        <div className="hero-topline"><span>Punjab has a story to tell.</span><span>Stay a little. Take it with you.</span></div>
        <h1 id="hero-title" className="logo-title"><span className="sr-only">Baithak — Punjab’s stories, passed on.</span>
          <svg className="hero-logo" viewBox="0 430 3000 1220" aria-hidden="true">
            <defs><mask id="ink-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="3000" height="2400">
              <path className="ink-stroke" d="M2920 730 C2600 650 2410 1080 2100 1250 S1560 1250 1300 1170 S700 1280 100 1400" fill="none" stroke="white" strokeWidth="620" strokeLinecap="round" />
              <path className="ink-stroke" d="M2850 1150 C2300 1350 1830 1520 1370 1500 S520 1580 100 1200" fill="none" stroke="white" strokeWidth="450" strokeLinecap="round" />
              <path className="ink-stroke" d="M2500 530 Q1600 470 400 820" fill="none" stroke="white" strokeWidth="500" strokeLinecap="round" />
            </mask></defs>
            <g mask="url(#ink-reveal)"><text fontFamily="Baithak Qamri" fontSize="300" transform="translate(64.421 1467.744) scale(4.687)">بیٹھک</text></g>
          </svg>
        </h1>
        <div className="hero-copy">
          <div className="hero-lines"><p lang="ur" dir="rtl">کہانیاں جو ہماری ہیں۔</p><p lang="pa-Arab" dir="rtl">قصّے ساڈے، ورثہ ساڈا۔</p></div>
          <p className="hero-english">A little less scrolling. A little more belonging.</p>
          <a className="button button-dark" href="#story">Find your first story <Arrow /></a>
        </div>
        <div className="hero-bottom"><span>Folk stories. In our own words.</span><a href="#why">Come, sit with us <Arrow down /></a><span className="hero-origin">Rooted in Punjab</span></div>
      </section>

      <section className="mission section-shell" id="why">
        <div className="section-heading"><h2><span className="mission-word">Some stories</span><br /><span className="mission-word">deserve to stay.</span></h2><span className="small-note">From one generation<br />to the next.</span></div>
        <Pair urdu="بے مقصد ویڈیوز کے بیچ، اپنے قصّوں کے لیے بھی وقت نکالیں۔ بیٹھک پنجاب کی لوک کہانیوں کو سنبھالنے اور آگے پہنچانے کی ایک جگہ ہے۔" punjabi="ایویں سکرول کردیاں، اپنے قصّیاں لئی وی ویلا کڈھو۔ بیٹھک پنجاب دیاں لوک کہانیاں نوں سانبھ کے اگلی پیڑھی تک پہنچاؤن دی تھاں اے۔" />
        <p className="mission-foot">Born from listening to village youth. Inspired by the stories our elders carry.</p>
      </section>

      <section className="discovery section-shell" id="discover">
        <div className="discovery-copy"><h2>A whole world.<br />In a few words.</h2><Pair urdu="کبھی ایک شعر، کبھی پورا قصّہ۔ اپنی زبان میں پڑھیں، اور جو کہانی آپ جانتے ہیں، وہ بھی سنائیں۔" punjabi="کدے اک شعر، کدے پورا قصّہ۔ اپنی بولی وچ پڑھو، تے جیہڑی کہانی تہانوں آؤندی اے، اوہ وی سناؤ۔" /><a className="text-link" href="#story">Read a little <Arrow /></a><p className="small-note formats">Text first. Voice & video to follow.</p></div>
        <article className="story-sheet" id="story" aria-labelledby="story-title"><div className="sheet-top"><span>A glimpse of a folk story</span><span>Punjab</span></div><h3 id="story-title" lang="pa-Arab" dir="rtl">ہیر تے رانجھا</h3><p className="story-translation">Heer & Ranjha</p><div className="story-body"><p lang="ur" dir="rtl"><span className="language-label">اردو</span>رانجھے کی <a href="#keywords" onClick={() => setKeyword('vanjhali')}>ونجھلی</a> کی تان آج بھی پنجاب کے قصّوں میں سنائی دیتی ہے۔ ہیر رانجھا کی کہانی صرف محبت کی نہیں، اپنی مرضی سے جینے کی بھی ہے۔</p><p lang="pa-Arab" dir="rtl"><span className="language-label">پنجابی</span>رانجھے دی <a href="#keywords" onClick={() => setKeyword('vanjhali')}>ونجھلی</a> دی تان اج وی پنجاب دے قصّیاں وچ سنائی دیندی اے۔ ہیر رانجھے دا قصّہ پیار دا وی اے، تے اپنی مرضی نال جیون دا وی۔</p></div><div className="sheet-bottom"><span>A short retelling for this preview</span><a href="#keywords" onClick={() => setKeyword('vanjhali')}>Follow the underlined word <Arrow /></a></div></article>
      </section>

      <section className="keyword-section section-shell" id="keywords"><div className="keyword-intro"><h2>One word.<br />Another door.</h2><Pair urdu="کہانی میں کسی لفظ کو چھوئیں۔ اس کا مطلب جانیں، پھر اس سے جڑے اور قصّے ڈھونڈیں۔" punjabi="کہانی وچ کسے لفظ نوں چھوہو۔ اوہدا مطلب جانو، فیر اوہدے نال جڑے ہور قصّے لبھو۔" /></div><div className="keyword-demo"><div className="keyword-options" aria-label="Explore a keyword">{Object.entries(entries).map(([key, item]) => <button key={key} type="button" aria-pressed={keyword === key} onClick={() => setKeyword(key)}><span lang="pa-Arab" dir="rtl">{item.title}</span><span>{item.english.split(' · ')[0]}</span></button>)}</div><div className="connecting-line" aria-hidden="true" /><div className="keyword-detail" aria-live="polite" aria-atomic="true"><div className="keyword-title"><h3 lang="pa-Arab" dir="rtl">{entry.title}</h3><span>{entry.english}</span></div><Pair urdu={entry.urdu} punjabi={entry.punjabi} /></div><p className="demo-note">Try a word. See where it takes you.</p></div></section>

      <section className="choice section-shell"><h2>Your curiosity.<br /><em>Your way.</em></h2><div><Pair urdu="آپ چنیں کہ کیا پڑھنا ہے۔ اپنے پسند کے موضوعات ڈھونڈیں۔ کوئی چھپا ہوا الگورتھم آپ کے لیے فیصلہ نہیں کرے گا۔" punjabi="تسی چُنو کی پڑھنا اے۔ اپنی پسند دے موضوع لبھو۔ کوئی لُکیا ہویا الگورتھم تہاڈے لئی فیصلہ نئیں کرے گا۔" /><p className="choice-note">Your tags. New stories first. No hidden ranking.</p></div></section>

      <section className="closing section-shell"><div className="closing-mark" lang="pa-Arab" dir="rtl" aria-hidden="true">بیٹھک</div><div className="closing-content"><h2>Keep a story alive.</h2><Pair urdu="جو قصّے ہم سناتے ہیں، وہی زندہ رہتے ہیں۔" punjabi="جیہڑے قصّے اسی سناؤندے آں، اوہی جیوندے رہندے نیں۔" /><a className="button button-dark" href="#story">Take a seat. Read a story. <Arrow /></a></div></section>
    </main>
    <footer className="site-footer flex items-center justify-between"><a className="wordmark" href="#home">baithak<span>by Echo</span></a><p>Made for the stories that make us.</p><a href="https://abdus.space/projects/echo" target="_blank" rel="noreferrer">Meet Echo <Arrow /></a></footer>
  </div>
}
export default App
