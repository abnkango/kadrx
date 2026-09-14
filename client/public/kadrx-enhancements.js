(() => {
  'use strict';

  const DRAFT_KEY = 'kadrx-profile-draft-v1';
  const STEP_KEY = 'kadrx-form-step-v1';
  const nextLabels = ['التالي', 'Next', 'Continue', 'متابعة'];
  const backLabels = ['السابق', 'Back', 'رجوع'];

  const isVisible = (el) => {
    if (!el || !(el instanceof HTMLElement)) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  };

  const labelOf = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim();
  const isLabel = (el, labels) => labels.some((label) => labelOf(el).toLowerCase().includes(label.toLowerCase()));

  function saveDraft() {
    const data = {};
    document.querySelectorAll('input, textarea, select').forEach((field, index) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      const key = field.name || field.id || field.getAttribute('placeholder') || `field-${index}`;
      if (field instanceof HTMLInputElement && (field.type === 'password' || field.type === 'file')) return;
      data[key] = field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value;
    });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function restoreDraft() {
    let data;
    try { data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) { data = null; }
    if (!data) return;
    document.querySelectorAll('input, textarea, select').forEach((field, index) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      const key = field.name || field.id || field.getAttribute('placeholder') || `field-${index}`;
      if (!(key in data) || field.value || (field instanceof HTMLInputElement && field.checked)) return;
      if (field instanceof HTMLInputElement && (field.type === 'password' || field.type === 'file')) return;
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = Boolean(data[key]);
      else field.value = data[key];
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function setupDraftPersistence() {
    document.addEventListener('input', saveDraft, true);
    document.addEventListener('change', saveDraft, true);
    const observer = new MutationObserver(() => restoreDraft());
    observer.observe(document.body, { childList: true, subtree: true });
    restoreDraft();
  }

  function stepCount() {
    return Number(sessionStorage.getItem(STEP_KEY) || '0');
  }

  function isFormRoute() {
    return ['/worker', '/company', '/kadr'].includes(location.pathname);
  }

  function syncHomeOnlyMapButton() {
    const isHome = location.pathname === '/';
    document.querySelectorAll('a').forEach((link) => {
      const label = labelOf(link);
      const isSearchMap = link.getAttribute('aria-label') === 'خريطة البحث'
        || label.includes('خريطة البحث')
        || link.getAttribute('href')?.startsWith('/search-map');
      if (link.getAttribute('aria-label') === 'خريطة البحث') {
        link.classList.remove('start-6', 'end-6');
        if (isHome) {
          link.style.setProperty('left', '1.5rem', 'important');
          link.style.setProperty('right', 'auto', 'important');
        } else {
          link.classList.add('start-6');
          link.style.removeProperty('left');
          link.style.removeProperty('right');
        }
      }
      if (isSearchMap) link.style.setProperty('display', isHome ? '' : 'none', 'important');
    });
    ensureSolarAssistant(isHome);
  }

  let solarMessages = [];
  let solarIsBusy = false;

  function solarLanguage() {
    return (document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function solarText(arabic, english) {
    return solarLanguage() === 'en' ? english : arabic;
  }

  function solarIcon() {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="15" y="20" width="34" height="27" rx="9"></rect><path d="M23 20v-5m18 5v-5M15 31H9m46 0h-6M24 34h1m14 0h1M25 42h14"></path><circle cx="25" cy="33.5" r="2.5"></circle><circle cx="39" cy="33.5" r="2.5"></circle><path d="M32 20v-6"></path><circle cx="32" cy="11" r="3"></circle></svg>';
  }

  function ensureSolarStyles() {
    if (document.getElementById('kadrx-solar-styles')) return;
    const style = document.createElement('style');
    style.id = 'kadrx-solar-styles';
    style.textContent = `
      #kadrx-solar-widget [hidden]{display:none!important}
      #kadrx-solar-launcher{position:fixed;right:1.5rem;bottom:1.5rem;z-index:60;width:64px;height:64px;border:2px solid #f07822;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#131a24;color:#f07822;box-shadow:0 10px 26px rgba(0,0,0,.36),inset 0 0 0 1px rgba(255,255,255,.12);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
      #kadrx-solar-launcher:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,.42),0 0 18px rgba(240,120,34,.22)}
      #kadrx-solar-launcher:focus-visible,#kadrx-solar-close:focus-visible,#kadrx-solar-send:focus-visible{outline:2px solid #f7a15e;outline-offset:3px}
      #kadrx-solar-launcher svg{width:38px;height:38px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      #kadrx-solar-panel{position:fixed;right:1.5rem;bottom:6.5rem;z-index:61;width:min(370px,calc(100vw - 3rem));max-height:min(70vh,560px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(240,120,34,.55);border-radius:22px;background:#151d28;color:#fff;box-shadow:0 22px 70px rgba(0,0,0,.48);font-family:inherit;direction:rtl}
      #kadrx-solar-header{display:flex;align-items:center;gap:11px;padding:14px 16px;background:linear-gradient(135deg,#202b3a,#18212d);border-bottom:1px solid rgba(240,120,34,.25)}
      #kadrx-solar-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border:1px solid #f07822;border-radius:50%;background:#111821;color:#f07822}
      #kadrx-solar-avatar svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      #kadrx-solar-heading{flex:1;text-align:right}
      #kadrx-solar-heading strong{display:block;color:#f07822;font-size:16px}
      #kadrx-solar-heading span{display:block;margin-top:2px;color:#cbd3dd;font-size:11px}
      #kadrx-solar-close{width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:#d8dee5;font-size:25px;line-height:1;cursor:pointer}
      #kadrx-solar-close:hover{background:rgba(255,255,255,.08);color:#fff}
      #kadrx-solar-messages{display:flex;flex:1;flex-direction:column;gap:10px;min-height:150px;padding:15px;overflow:auto;overscroll-behavior:contain}
      .kadrx-solar-message{max-width:86%;padding:10px 12px;border-radius:15px;font-size:13px;line-height:1.75;white-space:pre-wrap;word-break:break-word}
      .kadrx-solar-message.is-assistant{align-self:flex-start;border:1px solid rgba(240,120,34,.24);background:#202a37;color:#f0f3f6;border-top-right-radius:5px}
      .kadrx-solar-message.is-user{align-self:flex-end;background:#ed6f1c;color:#fff;border-top-left-radius:5px}
      #kadrx-solar-form{display:flex;align-items:flex-end;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.08);background:#121923}
      #kadrx-solar-input{min-height:42px;max-height:100px;flex:1;resize:none;padding:10px 12px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:#202a37;color:#fff;font:inherit;font-size:13px;line-height:1.5}
      #kadrx-solar-input::placeholder{color:#9da8b5}
      #kadrx-solar-input:focus{border-color:#f07822;outline:none}
      #kadrx-solar-send{width:42px;height:42px;flex:none;border:0;border-radius:13px;background:#ed6f1c;color:#fff;font-size:20px;cursor:pointer}
      #kadrx-solar-send:disabled{cursor:not-allowed;opacity:.55}
      .kadrx-solar-typing{display:flex;gap:4px;align-items:center;width:48px}
      .kadrx-solar-typing i{width:5px;height:5px;border-radius:50%;background:#f07822;animation:kadrx-solar-dot 1.1s infinite ease-in-out}
      .kadrx-solar-typing i:nth-child(2){animation-delay:.15s}.kadrx-solar-typing i:nth-child(3){animation-delay:.3s}
      @keyframes kadrx-solar-dot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
      @media (max-width:600px){#kadrx-solar-launcher{right:1rem;bottom:1rem;width:62px;height:62px}#kadrx-solar-panel{right:.75rem;bottom:5.75rem;width:calc(100vw - 1.5rem);max-height:68vh;border-radius:19px}}
    `;
    document.head.appendChild(style);
  }

  function addSolarMessage(role, text) {
    const messages = document.getElementById('kadrx-solar-messages');
    if (!messages) return;
    const message = document.createElement('div');
    message.className = `kadrx-solar-message is-${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function setSolarBusy(isBusy) {
    solarIsBusy = isBusy;
    const send = document.getElementById('kadrx-solar-send');
    const input = document.getElementById('kadrx-solar-input');
    if (send instanceof HTMLButtonElement) send.disabled = isBusy;
    if (input instanceof HTMLTextAreaElement) input.disabled = isBusy;
  }

  async function sendSolarMessage() {
    if (solarIsBusy) return;
    const input = document.getElementById('kadrx-solar-input');
    if (!(input instanceof HTMLTextAreaElement)) return;
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    addSolarMessage('user', message);
    setSolarBusy(true);
    const typing = document.createElement('div');
    typing.id = 'kadrx-solar-typing';
    typing.className = 'kadrx-solar-message is-assistant kadrx-solar-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    document.getElementById('kadrx-solar-messages')?.appendChild(typing);
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language: solarLanguage(), history: solarMessages.slice(-8) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'assistant_error');
      solarMessages.push({ role: 'user', content: message }, { role: 'assistant', content: data.reply });
      typing.remove();
      addSolarMessage('assistant', data.reply);
    } catch (error) {
      typing.remove();
      addSolarMessage('assistant', error instanceof Error && error.message !== 'assistant_error'
        ? error.message
        : solarText('تعذر الاتصال بالمساعد حاليًا. حاول مرة أخرى.', 'The assistant is unavailable right now. Please try again.'));
    } finally {
      setSolarBusy(false);
      input.focus();
    }
  }

  function openSolarAssistant() {
    const panel = document.getElementById('kadrx-solar-panel');
    const launcher = document.getElementById('kadrx-solar-launcher');
    if (!panel || !launcher) return;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    document.getElementById('kadrx-solar-input')?.focus();
  }

  function closeSolarAssistant() {
    const panel = document.getElementById('kadrx-solar-panel');
    const launcher = document.getElementById('kadrx-solar-launcher');
    if (!panel || !launcher) return;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
  }

  function ensureSolarAssistant(isHome) {
    const existing = document.getElementById('kadrx-solar-widget');
    if (!isHome) {
      existing?.remove();
      return;
    }
    if (existing) return;
    ensureSolarStyles();
    solarMessages = [];
    const widget = document.createElement('div');
    widget.id = 'kadrx-solar-widget';
    widget.innerHTML = `
      <button id="kadrx-solar-launcher" type="button" aria-label="${solarText('فتح مساعد سولار', 'Open Solar assistant')}" aria-expanded="false">${solarIcon()}</button>
      <section id="kadrx-solar-panel" role="dialog" aria-modal="false" aria-labelledby="kadrx-solar-heading" hidden>
        <header id="kadrx-solar-header">
          <div id="kadrx-solar-avatar">${solarIcon()}</div>
          <div id="kadrx-solar-heading"><strong>${solarText('سولار', 'Solar')}</strong><span>${solarText('مساعد منصة كادرX للتوظيف', 'KadrX recruitment assistant')}</span></div>
          <button id="kadrx-solar-close" type="button" aria-label="${solarText('إغلاق', 'Close')}">×</button>
        </header>
        <div id="kadrx-solar-messages"></div>
        <form id="kadrx-solar-form">
          <textarea id="kadrx-solar-input" rows="1" maxlength="2000" placeholder="${solarText('اكتب سؤالك هنا...', 'Write your question...')}"></textarea>
          <button id="kadrx-solar-send" type="submit" aria-label="${solarText('إرسال', 'Send')}">↑</button>
        </form>
      </section>
    `;
    document.body.appendChild(widget);
    addSolarMessage('assistant', solarText('مرحبًا، أنا سولار. كيف أساعدك في منصة كادرX؟', 'Hello, I am Solar. How can I help you with KadrX?'));
    document.getElementById('kadrx-solar-launcher')?.addEventListener('click', openSolarAssistant);
    document.getElementById('kadrx-solar-close')?.addEventListener('click', closeSolarAssistant);
    document.getElementById('kadrx-solar-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      sendSolarMessage();
    });
    document.getElementById('kadrx-solar-input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendSolarMessage();
      }
    });
  }

  function ensureFormBackGuard() {
    if (!isFormRoute()) return;
    if (!history.state || !history.state.kadrxFormGuard) {
      history.pushState({ ...(history.state || {}), kadrxFormGuard: true, kadrxStep: stepCount() }, '', location.href);
    }
  }

  function clickInternalPrevious() {
    const back = [...document.querySelectorAll('button, [role="button"], a')]
      .find((el) => isVisible(el) && isLabel(el, backLabels));
    if (back instanceof HTMLElement) back.click();
    restoreDraft();
  }

  function setupStepHistory() {
    ensureFormBackGuard();
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button, [role="button"], a') : null;
      if (!target || !isVisible(target)) return;
      if (isLabel(target, nextLabels)) {
        saveDraft();
        const nextStep = stepCount() + 1;
        sessionStorage.setItem(STEP_KEY, String(nextStep));
        setTimeout(() => {
          if (isFormRoute()) history.pushState({ ...(history.state || {}), kadrxFormGuard: true, kadrxStep: nextStep }, '', location.href);
        }, 40);
      } else if (isLabel(target, backLabels)) {
        saveDraft();
        sessionStorage.setItem(STEP_KEY, String(Math.max(0, stepCount() - 1)));
      } else if (target instanceof HTMLAnchorElement && ['/worker', '/company', '/kadr'].some((path) => target.pathname === path)) {
        saveDraft();
        sessionStorage.setItem(STEP_KEY, '0');
        setTimeout(ensureFormBackGuard, 80);
      }
    }, true);

    window.addEventListener('popstate', () => {
      if (isFormRoute()) {
        // The phone back gesture consumed the guard entry; stay in the form and move one step back.
        history.pushState({ ...(history.state || {}), kadrxFormGuard: true, kadrxStep: Math.max(0, stepCount() - 1) }, '', location.href);
        sessionStorage.setItem(STEP_KEY, String(Math.max(0, stepCount() - 1)));
        setTimeout(clickInternalPrevious, 40);
      } else {
        restoreDraft();
      }
    });

    const routeObserver = new MutationObserver(() => {
      if (isFormRoute()) ensureFormBackGuard();
      syncHomeOnlyMapButton();
    });
    routeObserver.observe(document.body, { childList: true, subtree: true });
    syncHomeOnlyMapButton();
  }

  function setupSaveFeedback() {
    const successWords = ['تم الحفظ', 'تم الحفظ بنجاح', 'saved successfully', 'profile saved', 'successfully saved'];
    const markSuccessfulButtons = () => {
      document.querySelectorAll('button, [role="button"]').forEach((button) => {
        if (!isVisible(button)) return;
        const text = labelOf(button).toLowerCase();
        if (successWords.some((word) => text.includes(word.toLowerCase()))) button.classList.add('kadrx-save-success');
      });
    };
    const observer = new MutationObserver(markSuccessfulButtons);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    markSuccessfulButtons();
  }

  function init() {
    syncHomeOnlyMapButton();
    setupDraftPersistence();
    setupStepHistory();
    setupSaveFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
