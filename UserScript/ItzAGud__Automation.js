// ==UserScript==
// @name         ItzAGud - Automation
// @version      2.1
// @description  Automatização de tasks, sorteio, roleta e chat do site
// @author       oGiu
// @match        https://www.itzagud.net/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
    #iga-toggle { position: fixed; top: 16px; right: 16px; z-index: 1000000; width: 42px; height: 42px; border-radius: 11px; background: #10b981; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    #iga-container { position: fixed; top: 66px; right: 16px; z-index: 999999; width: 300px; font-family: 'JetBrains Mono', monospace; background: rgba(12,12,14,0.98); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; color: white; backdrop-filter: blur(10px); }
    .iga-hidden { display: none !important; }
    .iga-header { padding: 12px; background: rgba(16,185,129,0.1); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
    .iga-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 75vh; overflow-y: auto; }
    .iga-card { border-radius: 10px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
    .iga-settings-panel { padding: 12px; background: #18181b; border-bottom: 1px solid #27272a; display: none; flex-direction: column; gap: 6px; }
    .iga-settings-panel.open { display: flex; }
    .iga-set-row { display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
    .iga-set-title { font-size: 9px; font-weight: 800; color: #10b981; margin: 8px 0 4px 0; text-transform: uppercase; border-bottom: 1px solid #27272a; padding-bottom: 2px; }
    .iga-input { background: #27272a; border: 1px solid #3f3f46; color: white; border-radius: 4px; padding: 2px 4px; width: 45px; text-align: center; }
    .iga-alert { padding: 8px; border-radius: 6px; font-size: 10px; border-left: 4px solid #10b981; background: rgba(255,255,255,0.05); margin-bottom: 5px; }
  `);

  const CATEGORIES = [
    { id: 'quick', label: 'QUICK' },
    { id: 'gangster', label: 'GANGSTER' },
    { id: 'offerwall', label: 'OFFERWALL' },
    { id: 'member', label: 'MEMBER' },
    { id: 'boss', label: 'BOSS' },
    { id: 'hitman', label: 'HITMAN' },
    { id: 'rolling', label: 'ROLLING' }
  ];

  function sleep(ms) { return new Promise(r => setTimeout(r, ms + Math.random() * 500)); }

  function humanClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const opts = { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  const toggle = document.createElement('button');
  toggle.id = 'iga-toggle'; toggle.textContent = '🎯';
  document.body.appendChild(toggle);

  const container = document.createElement('div');
  container.id = 'iga-container'; container.className = 'iga-hidden';
  let gvHtml = CATEGORIES.map(cat => `<div class="iga-set-row"><span>${cat.label}</span><input type="checkbox" id="iga-set-${cat.id}"></div>`).join('');

  container.innerHTML = `
    <div class="iga-header"><span style="font-weight:800; font-size:12px; color:#10b981;">ITZAGUD V2.1</span><button id="iga-cfg-btn" style="background:none; border:none; cursor:pointer;">⚙️</button></div>
    <div class="iga-settings-panel" id="iga-cfg">
      <div class="iga-set-title">Geral</div>
      <div class="iga-set-row"><span>Auto Tasks</span><input type="checkbox" id="iga-set-tasks"></div>
      <div class="iga-set-row"><span>Auto Wheel</span><input type="checkbox" id="iga-set-wheel"></div>
      <div class="iga-set-row"><span>Auto Chat</span><input type="checkbox" id="iga-set-chat"></div>
      <div class="iga-set-row"><span>Reserva Clams</span><input type="number" id="iga-set-minclams" class="iga-input"></div>
      <div class="iga-set-row"><span>Ciclo (min)</span><input type="number" id="iga-set-cycle" class="iga-input"></div>
      <div class="iga-set-title">Filtros de Rank</div>
      ${gvHtml}
    </div>
    <div class="iga-body">
      <div id="iga-alerts"></div>
      <div class="iga-card"><div style="font-size:8px; color:#52525b;">TIMER DO CICLO</div><div id="cycle-timer" style="font-size:14px; font-weight:bold; color:#10b981; margin-top:2px;">...</div></div>
      <div class="iga-card"><div style="font-size:8px; color:#52525b;">STATUS</div><div id="next-step-txt" style="font-size:10px; color:#e4e4e7; margin-top:4px;">Aguardando...</div></div>
      <button id="iga-force-btn" style="width: 100%; padding: 10px; background: #10b981; border: none; color: white; border-radius: 8px; font-weight: 700; cursor: pointer;">REINICIAR E FORÇAR SCAN</button>
    </div>
  `;
  document.body.appendChild(container);

  const syncUI = () => {
    document.getElementById('iga-set-tasks').checked = GM_getValue('autoTasks', true);
    document.getElementById('iga-set-wheel').checked = GM_getValue('autoWheel', true);
    document.getElementById('iga-set-chat').checked = GM_getValue('autoChat', true);
    document.getElementById('iga-set-minclams').value = GM_getValue('minClamsReserve', 100);
    document.getElementById('iga-set-cycle').value = GM_getValue('cycleMin', 15);
    CATEGORIES.forEach(cat => document.getElementById(`iga-set-${cat.id}`).checked = GM_getValue(`cat_${cat.id}`, true));
  };
  syncUI();

  document.getElementById('iga-cfg-btn').onclick = () => document.getElementById('iga-cfg').classList.toggle('open');
  toggle.onclick = () => container.classList.toggle('iga-hidden');
  document.getElementById('iga-set-tasks').onchange = (e) => GM_setValue('autoTasks', e.target.checked);
  document.getElementById('iga-set-wheel').onchange = (e) => GM_setValue('autoWheel', e.target.checked);
  document.getElementById('iga-set-chat').onchange = (e) => GM_setValue('autoChat', e.target.checked);
  document.getElementById('iga-set-minclams').onchange = (e) => GM_setValue('minClamsReserve', parseInt(e.target.value));
  document.getElementById('iga-set-cycle').onchange = (e) => GM_setValue('cycleMin', parseInt(e.target.value));
  CATEGORIES.forEach(cat => document.getElementById(`iga-set-${cat.id}`).onchange = (e) => GM_setValue(`cat_${cat.id}`, e.target.checked));
  document.getElementById('iga-force-btn').onclick = () => { GM_setValue('igaLastCycle', '0'); sessionStorage.removeItem('igaPhase'); sessionStorage.removeItem('igaActive'); window.location.reload(); };

  function getCurrentClams() {
    const clamLabel = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Clams');
    return clamLabel ? parseInt((clamLabel.nextElementSibling.getAttribute('title') || clamLabel.nextElementSibling.textContent).replace(/[^\d]/g, '')) : 999999;
  }

  async function processGiveaways(isPointsTab) {
    const enterButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim().toLowerCase() === 'enter' && !b.disabled && b.offsetParent !== null);
    if (enterButtons.length === 0) return false;
    const currentClams = getCurrentClams();
    for (const btn of enterButtons) {
      const row = btn.parentElement.parentElement.parentElement;
      if (!row) continue;
      const rowText = row.innerText.toUpperCase();
      const icon = row.querySelector('div[title]');
      const iconTitle = icon ? icon.getAttribute('title').toUpperCase() : "";
      const matchedCat = CATEGORIES.find(cat => iconTitle.includes(cat.label) || rowText.includes(cat.label));
      if (isPointsTab) {
        if (matchedCat && GM_getValue(`cat_${matchedCat.id}`, true)) {
          if (currentClams - 30 < GM_getValue('minClamsReserve', 100)) { alert$(`Reserva Clams atingida!`, 'yellow'); return false; }
          alert$(`Entrando: ${matchedCat.label}`, 'green');
          await doClickSequence(btn);
          return true;
        }
      } else {
        alert$(`Entrando em Clams`, 'green');
        await doClickSequence(btn);
        return true;
      }
    }
    return false;
  }

  async function doClickSequence(btn) {
    humanClick(btn); await sleep(2000);
    const confirm = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText.toLowerCase();
      return (t.includes('confirm') || t === 'yes' || t === 'ok') && b.offsetParent !== null;
    });
    if (confirm) humanClick(confirm);
    await sleep(2500); window.location.reload();
  }

  async function processTasks() {
    const claim = Array.from(document.querySelectorAll('button')).find(b => (b.innerText.toLowerCase().includes('claim') || b.innerText.toLowerCase() === 'claim reward') && b.offsetParent !== null);
    if (claim) { alert$(`Coletando Reward...`, 'green'); humanClick(claim); await sleep(3000); window.location.reload(); return true; }

    const iframe = document.querySelector('iframe[src*="youtube.com"]');
    if (iframe) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        const hasTimer = document.body.innerText.match(/\d{1,2}:\d{2}/);
        if (hasTimer) return true;
    }

    const openPlayer = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('open player') && b.offsetParent !== null);
    if (openPlayer) { alert$(`Abrindo Player...`, 'green'); humanClick(openPlayer); await sleep(2500); return true; }

    const start = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase() === 'start task' && !b.disabled && b.offsetParent !== null);
    if (start) { alert$(`Iniciando Task...`, 'green'); humanClick(start); await sleep(2500); return true; }

    const watchEarn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase() === 'watch & earn' && !b.disabled && b.offsetParent !== null);
    if (watchEarn) { alert$(`Iniciando Watch...`, 'green'); humanClick(watchEarn); await sleep(2500); return true; }

    return false;
  }

  async function doWheel() {
    if (!GM_getValue('autoWheel', true)) return;
    const wheelBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText.toLowerCase().includes('spin') || b.innerText.toLowerCase().includes('wheel')) && !b.disabled && b.offsetParent !== null);
    if (wheelBtn) {
      alert$('Abrindo Roda...', 'green');
      humanClick(wheelBtn); await sleep(3500);
      const spinFinal = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase() === 'spin' && !b.disabled && b.offsetParent !== null);
      if (spinFinal) {
        humanClick(spinFinal); await sleep(6000);
        const done = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase() === 'done' && b.offsetParent !== null);
        if (done) humanClick(done);
      }
    }
  }

  async function runAutomation() {
    const lastCycle = parseInt(GM_getValue('igaLastCycle', '0'));
    const cycleMs = (GM_getValue('cycleMin', 15) * 60 * 1000);
    const now = Date.now();
    if (now - lastCycle < cycleMs && !sessionStorage.getItem('igaActive')) {
      const diff = (lastCycle + cycleMs) - now;
      document.getElementById('cycle-timer').textContent = `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
      return;
    }
    sessionStorage.setItem('igaActive', 'true');
    document.getElementById('cycle-timer').textContent = "EXECUTANDO";
    const phase = sessionStorage.getItem('igaPhase') || 'tasks';

    if (GM_getValue('autoChat', true) && document.body.innerText.includes('Send 1 message for +250')) {
      const lastChat = parseInt(GM_getValue('igaLastChatSentAt', '0'));
      if (now - lastChat >= 3600000) {
        const input = document.querySelector('input[placeholder="Type a message…"]');
        const send = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Send');
        if (input && send) {
          humanClick(input); await sleep(1000);
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          setter ? setter.call(input, '👍') : input.value = '👍';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(1000); humanClick(send); GM_setValue('igaLastChatSentAt', Date.now().toString()); await sleep(3000);
        }
      }
    }

    if (phase === 'tasks') {
      document.getElementById('next-step-txt').textContent = "Processando Tasks...";
      if (!window.location.pathname.includes('/tasks')) { window.location.href = 'https://www.itzagud.net/tasks'; return; }
      const working = await processTasks();
      if (!working) { sessionStorage.setItem('igaPhase', 'wheel'); runAutomation(); }
    }
    else if (phase === 'wheel') {
      document.getElementById('next-step-txt').textContent = "Processando Wheel...";
      await doWheel();
      sessionStorage.setItem('igaPhase', 'points');
      window.location.href = 'https://www.itzagud.net/steam-key-giveaways?tab=points';
    }
    else if (phase === 'points') {
      document.getElementById('next-step-txt').textContent = "Processando Points...";
      if (!window.location.search.includes('tab=points')) { window.location.href = 'https://www.itzagud.net/steam-key-giveaways?tab=points'; return; }
      const entered = await processGiveaways(true);
      if (!entered) { sessionStorage.setItem('igaPhase', 'clams'); window.location.href = 'https://www.itzagud.net/steam-key-giveaways?tab=clams'; }
    }
    else {
      document.getElementById('next-step-txt').textContent = "Processando Clams...";
      if (!window.location.search.includes('tab=clams')) { window.location.href = 'https://www.itzagud.net/steam-key-giveaways?tab=clams'; return; }
      const entered = await processGiveaways(false);
      if (!entered) {
        GM_setValue('igaLastCycle', Date.now().toString());
        sessionStorage.removeItem('igaActive'); sessionStorage.setItem('igaPhase', 'tasks');
        alert$('Ciclo Finalizado!', 'green'); window.location.reload();
      }
    }
  }

  function alert$(text, color) {
    const el = document.createElement('div'); el.className = 'iga-alert';
    el.style.borderLeftColor = color === 'green' ? '#10b981' : '#fde047';
    el.textContent = text; document.getElementById('iga-alerts').appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  setInterval(runAutomation, 5000);
})();
