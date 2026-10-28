import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CardSwap, { Card } from './CardSwap';
import './contact-card-theme.css';

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 3.5 10.4 8 8.7 9.6c1.1 2.1 2.7 3.7 4.8 4.8l1.6-1.7 4.5 2.2-.8 4.1c-.2.9-1 1.5-1.9 1.5C9.1 20.5 3.5 14.9 3.5 7.1c0-.9.6-1.7 1.5-1.9l3.2-1.7Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

const labels = ['电话', '邮箱', '微信', 'QQ'];

function ContactCards() {
  const [active, setActive] = useState(0);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setCompact(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return (
    <div className="contact-card-stage">
      <CardSwap
        width={compact ? 320 : 430}
        height={compact ? 272 : 310}
        cardDistance={compact ? 12 : 50}
        verticalDistance={compact ? 18 : 46}
        depth={compact ? 40 : 80}
        skewAmount={0}
        visibleCards={4}
        cardRadius={18}
        delay={4000}
        speed={1}
        bounce={0.35}
        parallax={0.5}
        hoverSpread={0.12}
        dim={0.5}
        autoplay
        pauseOnHover
        draggable
        intro
        theme="dark"
        className={compact ? 'is-compact' : ''}
        onChange={setActive}
      >
        <Card customClass="contact-card contact-card--phone">
          <div className="contact-card__inner">
            <div className="contact-card__meta">
              <span className="contact-card__number">01</span>
              <span>Phone / 电话</span>
              <span className="contact-card__corner">DIRECT</span>
            </div>
            <div className="contact-card__center">
              <span className="contact-card__icon"><PhoneIcon /></span>
              <p className="contact-card__eyebrow">直接联系</p>
              <a className="contact-card__value" href="tel:13853735936">
                138 5373 5936
              </a>
            </div>
            <div className="contact-card__foot">
              <span>点击号码直接拨打</span>
              <span>CHENGDU · CN</span>
            </div>
          </div>
        </Card>

        <Card customClass="contact-card contact-card--mail">
          <div className="contact-card__inner">
            <div className="contact-card__meta">
              <span className="contact-card__number">02</span>
              <span>Email / 邮箱</span>
              <span className="contact-card__corner">MAIL</span>
            </div>
            <div className="contact-card__center">
              <span className="contact-card__icon"><MailIcon /></span>
              <p className="contact-card__eyebrow">项目与合作</p>
              <a className="contact-card__value contact-card__value--mail" href="mailto:960388562@qq.com">
                960388562@qq.com
              </a>
            </div>
            <div className="contact-card__foot">
              <span>点击地址发送邮件</span>
              <span>OPEN FOR WORK</span>
            </div>
          </div>
        </Card>

        <Card customClass="contact-card contact-card--wechat">
          <div className="contact-card__inner contact-card__inner--qr">
            <div className="contact-card__meta">
              <span className="contact-card__number">03</span>
              <span>WeChat / 微信</span>
              <span className="contact-card__corner">SCAN</span>
            </div>
            <div className="contact-card__qr-layout">
              <div className="contact-card__qr-copy">
                <p className="contact-card__eyebrow">扫码添加好友</p>
                <strong>xx_2411</strong>
                <span>微信扫码 · 备注来意</span>
              </div>
              <div className="contact-card__qr">
                <img src="./assets/img/contact-wechat-qr.png" alt="赵健翔的微信二维码" />
              </div>
            </div>
          </div>
        </Card>

        <Card customClass="contact-card contact-card--qq">
          <div className="contact-card__inner contact-card__inner--qr">
            <div className="contact-card__meta">
              <span className="contact-card__number">04</span>
              <span>QQ</span>
              <span className="contact-card__corner">SCAN</span>
            </div>
            <div className="contact-card__qr-layout">
              <div className="contact-card__qr-copy">
                <p className="contact-card__eyebrow">扫码添加好友</p>
                <strong>960388562</strong>
                <span>QQ 扫码 · 欢迎交流</span>
              </div>
              <div className="contact-card__qr">
                <img src="./assets/img/contact-qq-qr.png" alt="赵健翔的 QQ 二维码" />
              </div>
            </div>
          </div>
        </Card>
      </CardSwap>

      <div className="contact-card-dots" aria-live="polite">
        <span>{String(active + 1).padStart(2, '0')}</span>
        <div className="contact-card-dots__track">
          {labels.map((label, index) => (
            <span key={label} className={index === active ? 'is-active' : ''} aria-label={label} />
          ))}
        </div>
        <strong>{labels[active]}</strong>
      </div>
    </div>
  );
}

const target = document.getElementById('contactCards');
if (target) {
  createRoot(target).render(<ContactCards />);
}
