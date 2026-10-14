import { useRef } from 'react';
import useLandingMotion from '../../components/landing/useLandingMotion';
import Navbar from '../../components/landing/Navbar';
import Hero from '../../components/landing/Hero';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
import './landing.css';

function Punjabi({ children, className = '', as: Tag = 'p' }) {
  return <Tag className={`punjabi ${className}`} lang="pa-Arab" dir="rtl">{children}</Tag>;
}

export default function LandingPage() {
  const root = useRef(null);
  useLandingMotion(root);
  return (
    <div ref={root} className="landing" id="top">
      <a className="skip-link" href="#our-purpose">Skip to content / اگے پڑھو</a>
      <Navbar />
      <main>
        <Hero />
        <section className="purpose section-shell" id="our-purpose" aria-labelledby="purpose-title">
          <div className="purpose-heading">
            <h2 id="purpose-title">Some stories live<br />in books.<br /><em>Ours live in people.</em></h2>
            <Punjabi as="h3">کجھ کہانیاں کتاباں وچ نیں۔<br />ساڈیاں لوکاں دے کول نیں۔</Punjabi>
          </div>
          <div className="purpose-copy paired-copy">
            <div>
              <p>A tale told by a grandmother. A couplet remembered by a friend. A word that brings a whole village to mind.</p>
              <p>Punjab’s stories travel from person to person. But when we stop sharing them, they become harder to find.</p>
              <p>Baithak is being built to give them a place in our everyday lives again. A place to read, share, and pass them on.</p>
            </div>
            <Punjabi as="div">
              <p>دادی نانی دی سنائی کوئی گل۔ کسے یار نوں یاد رہ گیا کوئی شعر۔ کوئی لفظ، جیہڑا سارا پنڈ چیتے کروا دیوے۔</p>
              <p>پنجاب دیاں کہانیاں اک توں دوجے کول پہنچدیاں نیں۔ پر جے اسیں اگے نہ سنائیے، تاں ہولی ہولی بھل جاندیاں نیں۔</p>
              <p>بیٹھک ایس لئی بن رہی اے کہ ایہہ کہانیاں فیر ساڈے ہر روز دا حصہ بنن۔ اسیں پڑھئیے، سنائیے، تے اگے پہنچائیے۔</p>
            </Punjabi>
          </div>
        </section>
        <section className="invitation" aria-labelledby="invitation-title">
          <div className="invitation-inner">
            <Punjabi as="h2" className="invitation-script">آؤ، کوئی گل سنائیے۔</Punjabi>
            <p id="invitation-title">There’s always room for one more story.</p>
            <div className="invitation-line" aria-hidden="true" />
          </div>
        </section>
        <section className="experience section-shell" id="the-experience" aria-labelledby="experience-title">
          <div className="section-heading">
            <h2 id="experience-title">Old stories.<br /><em>New ways in.</em></h2>
            <div className="section-intro"><Punjabi as="h3">کہانیاں اوہو۔<br />اوہناں نال جُڑن دے راہ نویں۔</Punjabi><p>What we’re building into Baithak.</p><Punjabi>بیٹھک وچ کیہہ کجھ ہووے گا۔</Punjabi></div>
          </div>
          <article className="feature-row">
            <div className="feature-title"><h3>A little reading.<br />A lasting connection.</h3><Punjabi>تھوڑی جئی پڑھت۔<br />ڈونگھا جیہا ناتا۔</Punjabi></div>
            <div className="feature-copy"><p>A couplet for a spare moment. A folk tale for a slower afternoon. Read in Punjabi, English, or both, without needing an account.</p><Punjabi>ویہل دے دو پل نیں، تاں کوئی شعر پڑھ لو۔ کجھ ہور ویہل اے، تاں پوری کہانی۔ پنجابی وچ، انگریزی وچ، یا دوناں وچ۔ پڑھن لئی اکاؤنٹ بناؤن دی لوڑ نئیں۔</Punjabi></div>
          </article>
          <article className="feature-row feature-words">
            <div className="feature-title"><h3>One word opens<br />another world.</h3><Punjabi>اک لفظ توں<br />اگے ہور وی کِنّا کجھ۔</Punjabi></div>
            <div className="feature-copy"><p>Meet an unfamiliar word in a story? Follow it to its meaning, its place in Punjabi life, and other stories where it belongs.</p><Punjabi>کہانی وچ کوئی اوپرا لفظ آ گیا؟ اوہدے توں اوہدا مطلب، ساڈی رہتل نال اوہدا ناتا، تے ہور کہانیاں لبھ سکو گے۔</Punjabi></div>
            <div className="word-connection" aria-label="Example of connected words: a story leads to Vanjhali, a bamboo flute, and more stories">
              <div className="connection-source"><span>A story</span><Punjabi>اک کہانی</Punjabi></div><span className="connection-thread" aria-hidden="true" />
              <div className="connection-word"><Punjabi>ونجھلی</Punjabi><span>Vanjhali · a bamboo flute</span></div><span className="connection-thread" aria-hidden="true" />
              <div className="connection-source"><span>More to discover</span><Punjabi>اگے ہور کہانیاں</Punjabi></div>
            </div>
          </article>
          <article className="feature-row">
            <div className="feature-title"><h3>Someone told you.<br />Tell someone else.</h3><Punjabi>تہانوں کسے سنائی سی۔<br />ہُن تُسی اگے سناؤ۔</Punjabi></div>
            <div className="feature-copy"><p>Share a story you grew up with, a local telling, or a few lines you don’t want forgotten. Name the person you heard it from. Leave room for another version.</p><Punjabi>بچپن دی کوئی کہانی، اپنے پنڈ دی کوئی گل، یا دو سطراں جیہڑیاں تُسی بھلّن نئیں دینا چاہندے۔ جس کولوں سنیاں، اوہدا ناں وی دسیو۔ ہوراں دی گل لئی وی تھاں رکھو۔</Punjabi></div>
          </article>
        </section>
        <section className="promise" id="our-promise" aria-labelledby="promise-title">
          <div className="section-shell promise-inner">
            <div><h2 id="promise-title">Your curiosity.<br /><em>Your own pace.</em></h2><Punjabi as="h3">اپنی مرضی نال لبھو۔<br />اپنے ویلے نال پڑھو۔</Punjabi></div>
            <div className="promise-copy paired-copy"><div><p>A place for stories should respect the people reading them.</p><p>Our starting promise is simple: you choose the topics. You decide what to read next. Your reading history isn’t a profile to sell.</p><p className="promise-signature">Built around stories. Guided by choice.</p></div><Punjabi as="div"><p>کہانیاں دی تھاں اوہناں لوکاں دا خیال وی رکھے، جیہڑے پڑھن آؤندے نیں۔</p><p>ساڈا وعدہ سِدھا اے: کیہہ پڑھنا اے، تُسی چُنو۔ اگے کتھے جانا اے، تُسی دسو۔ تُسی کیہہ پڑھیا، ایہہ گل ویچن لئی نئیں۔</p><p className="promise-signature">کہانیاں ساڈیاں۔ مرضی تہاڈی۔</p></Punjabi></div>
          </div>
        </section>
        <section className="closing section-shell" aria-labelledby="closing-title">
          <Punjabi as="h2">گل مُکّے نہ۔<br />اگے تُردی رہوے۔</Punjabi>
          <div><h2 id="closing-title">Let the story<br /><em>keep going.</em></h2><p>From one person to another.<br />From one generation to the next.</p><Punjabi>اک توں دوجے کول۔<br />اک پیڑھی توں اگلی پیڑھی تک۔</Punjabi></div>
        </section>
      </main>
      <footer className="landing-footer"><a className="brand" href="#top">baithak <span>By Echo</span></a><p>A place in the making.<span lang="pa-Arab" dir="rtl">اک بیٹھک، جیہڑی ہجے بن رہی اے۔</span></p><a href="#top" className="back-top">Back to the beginning<span lang="pa-Arab" dir="rtl">مُڑ شروع ول</span></a></footer>
    </div>
  );
}
