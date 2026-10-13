import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Truck, Leaf, Star, CheckCircle2, Package, Tag } from 'lucide-react';
import karmosseImg from '../assets/images/Karmosse.jpg';
import tinImg from '../assets/images/Tin.jpg';
import mokasarateImg from '../assets/images/mokasarate.jpg';
import ziteZitoneImg from '../assets/images/zite_zitone.jpg';
import fsImg from '../assets/images/f_s.jpg';

const pulseAnimation = {
  scale: [1, 1.05, 1],
  boxShadow: [
    "0 0 0 0 rgba(212, 175, 55, 0.7)",
    "0 0 0 15px rgba(212, 175, 55, 0)",
    "0 0 0 0 rgba(212, 175, 55, 0)"
  ],
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const PRICING = [
  { qty: 1, price: 1200, label: 'قطعة واحدة', saving: null },
  { qty: 2, price: 2200, label: 'قطعتان', saving: '200 د.ج توفير' },
  { qty: 3, price: 3000, label: 'ثلاث قطع', saving: '600 د.ج توفير' },
];

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzW4UkCLb3CQTkUZhwx5l6jIRnXm976pbASj60fft1bbRWCPZX6GX5c6FDEpzlLihZrcA/exec';

const MAX_ORDERS   = 3;                  // max orders before cooldown kicks in
const COOLDOWN_MS  = 24 * 60 * 60 * 1000; // 24-hour cooldown after MAX_ORDERS
const DEBOUNCE_MS  = 5000;                 // 5 s button lock after each click

// --- localStorage helpers ---
function getOrderLog() {
  try { return JSON.parse(localStorage.getItem('karmoose_orders') || '[]'); }
  catch { return []; }
}
function saveOrderLog(log) {
  localStorage.setItem('karmoose_orders', JSON.stringify(log));
}
function checkSpamStatus() {
  const log = getOrderLog();
  if (log.length < MAX_ORDERS) return { blocked: false, remaining: MAX_ORDERS - log.length };
  // Check if cooldown window has passed
  const oldest = log[log.length - MAX_ORDERS];
  const elapsed = Date.now() - oldest;
  if (elapsed < COOLDOWN_MS) {
    const msLeft = COOLDOWN_MS - elapsed;
    const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
    return { blocked: true, hoursLeft };
  }
  // Window passed — prune old entries and allow again
  const pruned = log.filter(t => Date.now() - t < COOLDOWN_MS);
  saveOrderLog(pruned);
  return { blocked: false, remaining: MAX_ORDERS - pruned.length };
}
function recordOrder() {
  const log = getOrderLog();
  log.push(Date.now());
  saveOrderLog(log);
}

function App() {
  const [selectedQty, setSelectedQty] = useState(1);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [name, setName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [baladiya, setBaladiya] = useState('');
  const [honeypot, setHoneypot] = useState('');          // must stay empty
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'cooldown'
  const [cooldownHours, setCooldownHours] = useState(0);
  const [btnLocked, setBtnLocked] = useState(false);      // debounce
  const formRef = useRef(null);

  const currentPricing = PRICING.find(p => p.qty === selectedQty);

  const validatePhone = (value) => {
    if (value.length === 0) return '';
    if (!/^(05|06|07)/.test(value)) return 'يجب أن يبدأ الرقم بـ 05 أو 06 أو 07';
    if (value.length < 10) return `${10 - value.length} أرقام متبقية`;
    return '';
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setPhoneError(validatePhone(raw));
  };

  const isPhoneValid = phone.length === 10 && /^(05|06|07)/.test(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🍯 Honeypot — bots fill hidden fields, humans don't
    if (honeypot) return;

    // ⏳ Debounce — block rapid re-clicks
    if (btnLocked) return;

    // 🕐 Order-count cooldown
    const spamCheck = checkSpamStatus();
    if (spamCheck.blocked) {
      setCooldownHours(spamCheck.hoursLeft);
      setSubmitStatus('cooldown');
      return;
    }

    if (!isPhoneValid) {
      setPhoneError('رقم الهاتف غير صحيح. يجب أن يكون 10 أرقام ويبدأ بـ 05 أو 06 أو 07');
      document.getElementById('phone').focus();
      return;
    }

    // Lock button
    setBtnLocked(true);
    setTimeout(() => setBtnLocked(false), DEBOUNCE_MS);

    setSubmitStatus('loading');

    const wilayaLabel = formRef.current.querySelector('#wilaya option:checked')?.textContent?.trim() || wilaya;

    const payload = {
      name,
      phone,
      wilaya: wilayaLabel,
      baladiya,
      quantity: selectedQty,
      price: currentPricing.price,
    };

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      recordOrder();
      setSubmitStatus('success');
      setName('');
      setPhone('');
      setWilaya('');
      setBaladiya('');
      setPhoneError('');
      setSelectedQty(1);
    } catch (_err) {
      setSubmitStatus('error');
    }
  };

  return (
    <>
      <header className="header sticky">
        <div className="container header-container">
          <div className="brand">
            <img src="/favicon.jpg" alt="شعار كرموس" className="brand-logo" />
            <span className="brand-name">كرموس</span>
          </div>
          <a href="#checkout" className="btn btn-primary">اطلب الآن</a>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <motion.h1 
              className="hero-title"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              بنة زمان.. وقوة طبيعية لكل يوم!
            </motion.h1>
            <motion.p 
              className="hero-subtitle"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
            >
              كرموس: خلطة تقليدية فاخرة تجمع بين التين المجفف، المكسرات المقرمشة، وزيت الزيتون البكر. طاقة طبيعية 100% خالية من السكر المضاف والمواد الحافظة.
            </motion.p>
            <motion.div
              className="hero-badges"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.3 }}
            >
              <span className="hero-badge"><Package size={16} /> 500g
              </span>
              <span className="hero-badge hero-badge-gold"><Tag size={16} /> يبدأ من 1200 د.ج
              </span>
            </motion.div>
            <motion.a 
              href="#checkout" 
              className="btn btn-large btn-gold"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.4 }}
              animate={pulseAnimation}
            >
              اطلب كرموس الآن - الدفع عند الاستلام
            </motion.a>
          </div>
          <motion.div 
            className="hero-image"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInLeft}
            transition={{ delay: 0.2 }}
          >
            <img src={karmosseImg} alt="كرموس - تين مجفف ومكسرات مع زيت الزيتون" className="img-responsive rounded-shadow" />
          </motion.div>
        </div>
      </section>

      <section className="trust-bar">
        <div className="container trust-container">
          <motion.div className="trust-item" whileHover={{ scale: 1.05 }}>
            <Truck className="trust-icon" size={32} />
            <span>توصيل سريع لـ 58 ولاية</span>
          </motion.div>
          <motion.div className="trust-item" whileHover={{ scale: 1.05 }}>
            <Leaf className="trust-icon" size={32} />
            <span>طبيعي 100% بدون إضافات</span>
          </motion.div>
          <motion.div className="trust-item" whileHover={{ scale: 1.05 }}>
            <Star className="trust-icon" size={32} />
            <span>منتج تقليدي جزائري أصيل</span>
          </motion.div>
        </div>
      </section>

      <section className="ingredients">
        <div className="container">
          <h2 className="section-title">سر البنة والطاقة في 3 مكونات فاخرة</h2>
          <div className="grid-3">
            {[
              { img: tinImg, title: "تين مجفف منتقى بعناية" },
              { img: mokasarateImg, title: "مكسرات فاخرة للقرمشة" },
              { img: ziteZitoneImg, title: "زيت زيتون بكر جزائري حر" }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                className="card"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: idx * 0.2 }}
                whileHover={{ translateY: -10, borderColor: "var(--color-accent)" }}
                style={{ borderTop: "5px solid transparent" }}
              >
                <div className="card-icon">
                  <img src={item.img} alt={item.title} />
                </div>
                <h3>{item.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container features-container">
          <motion.div 
            className="features-image"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInRight}
          >
            <img src={fsImg} alt="فوائد كرموس" className="img-responsive rounded-shadow" />
          </motion.div>
          <motion.div 
            className="features-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ delay: 0.2 }}
          >
            <h2 className="section-title text-right">علاش تختار كرموس؟</h2>
            <ul className="features-list">
              {[
                "يمنحك طاقة وحيوية طوال اليوم.",
                "بديل صحي ومغذي للحلويات المصنعة.",
                "محضر يدوياً بأعلى معايير النظافة.",
                "مثالي كفطور صباحي لكل العائلة."
              ].map((feature, idx) => (
                <motion.li 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                  viewport={{ once: true }}
                >
                  <CheckCircle2 className="feature-icon" size={24} />
                  <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section id="checkout" className="checkout">
        <motion.div 
          className="container checkout-container"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="checkout-title">لا تفوت الفرصة، استمتع بخيرات الطبيعة اليوم</h2>

          {/* Quantity Selector */}
          <div className="qty-selector">
            <p className="qty-label">اختر الكمية:</p>
            <div className="qty-cards">
              {PRICING.map((p) => (
                <motion.div
                  key={p.qty}
                  className={`qty-card ${selectedQty === p.qty ? 'qty-card-active' : ''}`}
                  onClick={() => setSelectedQty(p.qty)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {p.saving && <span className="qty-badge">{p.saving}</span>}
                  <div className="qty-number">{p.qty}x</div>
                  <div className="qty-weight">{p.qty * 500}g</div>
                  <div className="qty-price">{p.price.toLocaleString()} <span>د.ج</span></div>
                  <div className="qty-unit-price">{Math.round(p.price / p.qty)} د.ج / قطعة</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Live Price Display */}
          <motion.div 
            className="price-box"
            key={selectedQty}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            الإجمالي: <strong>{currentPricing.price.toLocaleString()}</strong> د.ج
            <span className="price-weight"> · {selectedQty * 500}g</span>
          </motion.div>

          <p className="form-alternative-text">قم بملء الاستمارة أدناه وسنتصل بك لتأكيد الطلب</p>

          {/* Success Banner */}
          {submitStatus === 'success' && (
            <motion.div
              className="submit-banner submit-success"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="banner-icon">✅</span>
              <div>
                <strong>تم إرسال طلبك بنجاح!</strong>
                <p>سنتصل بك قريباً لتأكيد الطلب والتوصيل. شكراً لثقتك بكنوز الطبيعة.</p>
              </div>
            </motion.div>
          )}

          {/* Error Banner */}
          {submitStatus === 'error' && (
            <motion.div
              className="submit-banner submit-error"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="banner-icon">⚠️</span>
              <div>
                <strong>حدث خطأ أثناء الإرسال</strong>
                <p>يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.</p>
              </div>
            </motion.div>
          )}

          {/* Cooldown Banner */}
          {submitStatus === 'cooldown' && (
            <motion.div
              className="submit-banner submit-cooldown"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="banner-icon">🕐</span>
              <div>
                <strong>لقد تجاوزت الحد المسموح به ({MAX_ORDERS} طلبات)</strong>
                <p>يمكنك إرسال طلب جديد بعد {cooldownHours} ساعة. للاستفسار تواصل معنا مباشرة.</p>
              </div>
            </motion.div>
          )}

          <form className="order-form" ref={formRef} onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">الاسم واللقب</label>
              <input
                type="text"
                id="name"
                placeholder="أدخل اسمك الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">رقم الهاتف</label>
              <input
                type="tel"
                id="phone"
                placeholder="XX XX XX X0"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                inputMode="numeric"
                dir="rtl"
                required
                className={phoneError ? 'input-error' : phone.length === 10 ? 'input-success' : ''}
              />
              {phoneError && (
                <span className="field-error">{phoneError}</span>
              )}
              {!phoneError && phone.length === 10 && (
                <span className="field-success">✓ رقم صحيح</span>
              )}
              <span className="field-hint">يبدأ بـ 05 أو 06 أو 07 · 10 أرقام</span>
            </div>
            <div className="form-group">
              <label htmlFor="wilaya">الولاية</label>
              <select
                id="wilaya"
                required
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
              >
                <option value="" disabled>اختر ولايتك</option>
                <option value="1">01 - أدرار</option>
                <option value="2">02 - الشلف</option>
                <option value="3">03 - الأغواط</option>
                <option value="4">04 - أم البواقي</option>
                <option value="5">05 - باتنة</option>
                <option value="6">06 - بجاية</option>
                <option value="7">07 - بسكرة</option>
                <option value="8">08 - بشار</option>
                <option value="9">09 - البليدة</option>
                <option value="10">10 - البويرة</option>
                <option value="11">11 - تمنراست</option>
                <option value="12">12 - تبسة</option>
                <option value="13">13 - تلمسان</option>
                <option value="14">14 - تيارت</option>
                <option value="15">15 - تيزي وزو</option>
                <option value="16">16 - الجزائر</option>
                <option value="17">17 - الجلفة</option>
                <option value="18">18 - جيجل</option>
                <option value="19">19 - سطيف</option>
                <option value="20">20 - سعيدة</option>
                <option value="21">21 - سكيكدة</option>
                <option value="22">22 - سيدي بلعباس</option>
                <option value="23">23 - عنابة</option>
                <option value="24">24 - قالمة</option>
                <option value="25">25 - قسنطينة</option>
                <option value="26">26 - المدية</option>
                <option value="27">27 - مستغانم</option>
                <option value="28">28 - المسيلة</option>
                <option value="29">29 - معسكر</option>
                <option value="30">30 - ورقلة</option>
                <option value="31">31 - وهران</option>
                <option value="32">32 - البيض</option>
                <option value="33">33 - إليزي</option>
                <option value="34">34 - برج بوعريريج</option>
                <option value="35">35 - بومرداس</option>
                <option value="36">36 - الطارف</option>
                <option value="37">37 - تندوف</option>
                <option value="38">38 - تيسمسيلت</option>
                <option value="39">39 - الوادي</option>
                <option value="40">40 - خنشلة</option>
                <option value="41">41 - سوق أهراس</option>
                <option value="42">42 - تيبازة</option>
                <option value="43">43 - ميلة</option>
                <option value="44">44 - عين الدفلى</option>
                <option value="45">45 - النعامة</option>
                <option value="46">46 - عين تموشنت</option>
                <option value="47">47 - غرداية</option>
                <option value="48">48 - غليزان</option>
                <option value="49">49 - تيميمون</option>
                <option value="50">50 - برج باجي مختار</option>
                <option value="51">51 - أولاد جلال</option>
                <option value="52">52 - بني عباس</option>
                <option value="53">53 - إن صالح</option>
                <option value="54">54 - إن قزام</option>
                <option value="55">55 - تقرت</option>
                <option value="56">56 - جانت</option>
                <option value="57">57 - المغير</option>
                <option value="58">58 - المنيعة</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="baladiya">البلدية / العنوان الكامل</label>
              <input
                type="text"
                id="baladiya"
                placeholder="أدخل عنوانك بالتفصيل"
                value={baladiya}
                onChange={(e) => setBaladiya(e.target.value)}
                required
              />
            </div>
            {/* 🍯 Honeypot — visually hidden, bots fill it, humans don't */}
            <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="website">لا تملأ هذا الحقل</label>
              <input
                type="text"
                name="website"
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <motion.button
              type="submit"
              className="btn btn-large btn-primary w-100"
              whileHover={{ scale: (submitStatus === 'loading' || btnLocked) ? 1 : 1.02 }}
              whileTap={{ scale: (submitStatus === 'loading' || btnLocked) ? 1 : 0.98 }}
              disabled={submitStatus === 'loading' || btnLocked}
            >
              {submitStatus === 'loading' ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  جاري الإرسال...
                </span>
              ) : 'تأكيد الطلب الآن'}
            </motion.button>
          </form>
        </motion.div>
      </section>

      <footer className="footer">
        <div className="container">
          <p className="footer-copy">كنوز الطبيعة &copy; 2026 - من الطبيعة إلى بيتك</p>
        </div>
      </footer>
    </>
  );
}

export default App;