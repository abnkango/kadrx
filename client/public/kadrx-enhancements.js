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
      addFreeOffer();
    });
    routeObserver.observe(document.body, { childList: true, subtree: true });
  }

  function addFreeOffer() {
    const existing = document.getElementById('kadrx-free-badge');
    if (existing) {
      existing.style.display = location.pathname === '/' ? 'inline-flex' : 'none';
      const backdrop = document.getElementById('kadrx-free-backdrop');
      if (backdrop && location.pathname !== '/') backdrop.classList.remove('is-open');
      return;
    }
    if (location.pathname !== '/') return;
    const style = document.createElement('style');
    style.textContent = `
      #kadrx-free-badge{position:fixed;z-index:1000;top:70px;right:20px;display:inline-flex;align-items:center;justify-content:center;min-width:86px;height:40px;padding:0 18px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:#119b50;color:#fff;font:800 22px/1 Arial,sans-serif;letter-spacing:.2px;box-shadow:0 8px 22px rgba(0,0,0,.22);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
      #kadrx-free-badge:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(0,0,0,.3)}
      #kadrx-free-backdrop{position:fixed;inset:0;z-index:1100;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(5,10,18,.55);backdrop-filter:blur(5px)}
      #kadrx-free-backdrop.is-open{display:flex}
      #kadrx-free-dialog{position:relative;width:min(390px,100%);padding:28px 24px 24px;border:1px solid rgba(32,200,107,.35);border-radius:22px;background:#18202c;color:#fff;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.38);font-family:inherit}
      #kadrx-free-dialog h2{margin:0 0 12px;color:#20c86b;font-size:27px}
      #kadrx-free-dialog p{margin:0;color:#e6ebf1;font-size:17px;line-height:1.8}
      #kadrx-free-close{position:absolute;top:10px;left:12px;width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:#c8d0da;font-size:24px;line-height:1;cursor:pointer}
      #kadrx-free-close:hover{background:rgba(255,255,255,.1);color:#fff}
      .kadrx-save-success{background:#20c86b!important;border-color:#20c86b!important;color:#fff!important;box-shadow:0 8px 20px rgba(32,200,107,.25)!important}
      @media (max-width:600px){#kadrx-free-badge{top:104px;right:14px;min-width:76px;height:34px;padding:0 14px;border-radius:10px;font-size:19px}#kadrx-free-dialog{padding:26px 20px 22px}}
    `;
    document.head.appendChild(style);

    const badge = document.createElement('button');
    badge.id = 'kadrx-free-badge';
    badge.type = 'button';
    badge.textContent = 'free';
    badge.setAttribute('aria-label', 'العرض المجاني');

    const backdrop = document.createElement('div');
    backdrop.id = 'kadrx-free-backdrop';
    backdrop.innerHTML = '<div id="kadrx-free-dialog" role="dialog" aria-modal="true" aria-labelledby="kadrx-free-title"><button id="kadrx-free-close" type="button" aria-label="إغلاق">×</button><h2 id="kadrx-free-title">عرض مجاني</h2><p>مجاني لغاية 01/01/2027<br>مع عمولة بسيطة بعد انتهاء الفترة المجانية.</p></div>';
    document.body.append(badge, backdrop);

    const close = () => { backdrop.classList.remove('is-open'); };
    badge.addEventListener('click', () => backdrop.classList.add('is-open'));
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    backdrop.querySelector('#kadrx-free-close').addEventListener('click', close);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
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
    addFreeOffer();
    setupDraftPersistence();
    setupStepHistory();
    setupSaveFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
