(function () {
  'use strict';

  const els = {
    masterToggle: document.getElementById('masterToggle'),
    masterStatus: document.getElementById('masterStatus'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    calcToggle: document.getElementById('calcToggle'),
    symbolsToggle: document.getElementById('symbolsToggle'),
    bracketsToggle: document.getElementById('bracketsToggle'),
    customToggle: document.getElementById('customToggle'),
    symbolsList: document.getElementById('symbolsList'),
    bracketsList: document.getElementById('bracketsList'),
    customList: document.getElementById('customList'),
    saveStatus: document.getElementById('saveStatus'),
    app: document.getElementById('app')
  };

  const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

  let settings = inkCloneDefaults();
  let saveTimer = null;

  function resolveTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    return darkMedia.matches ? 'dark' : 'light';
  }

  const SUN_ICON =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';
  const MOON_ICON =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.9A9 9 0 1 1 9.1 3.3a7 7 0 0 0 11.6 11.6z"/></svg>';

  function applyTheme() {
    const resolved = resolveTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    els.themeIcon.innerHTML = resolved === 'dark' ? MOON_ICON : SUN_ICON;
  }

  darkMedia.addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme();
  });

  // Best-effort early paint using the OS preference, before settings finish loading.
  document.documentElement.setAttribute('data-theme', darkMedia.matches ? 'dark' : 'light');
  els.themeIcon.innerHTML = darkMedia.matches ? MOON_ICON : SUN_ICON;

  function load() {
    chrome.storage.sync.get(INK_STORAGE_KEY, (data) => {
      settings = inkNormalizeSettings(data ? data[INK_STORAGE_KEY] : null);
      applyTheme();
      render();
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
  }

  function save() {
    chrome.storage.sync.set({ [INK_STORAGE_KEY]: settings }, () => {
      if (!els.saveStatus) return;
      els.saveStatus.textContent = '저장됨';
      setTimeout(() => {
        if (els.saveStatus) els.saveStatus.textContent = '';
      }, 1000);
    });
  }

  function setMasterUI() {
    els.masterToggle.checked = settings.enabled;
    els.masterStatus.textContent = settings.enabled ? 'SYSTEM ON' : 'SYSTEM OFF';
    els.app.classList.toggle('disabled', !settings.enabled);
  }

  function makeToggle(checked, onChange) {
    const label = document.createElement('label');
    label.className = 'switch';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    const slider = document.createElement('span');
    slider.className = 'slider';
    label.appendChild(checkbox);
    label.appendChild(slider);
    return label;
  }

  function renderStaticRules(container, rules, editableTrigger) {
    container.innerHTML = '';
    rules.forEach((rule) => {
      const row = document.createElement('div');
      row.className = 'rule-row';

      let triggerEl;
      if (editableTrigger) {
        triggerEl = document.createElement('input');
        triggerEl.className = 'rule-trigger-input';
        triggerEl.maxLength = INK_MAX_TRIGGER_LEN;
        triggerEl.value = rule.trigger;
        triggerEl.addEventListener('input', () => {
          rule.trigger = triggerEl.value.slice(0, INK_MAX_TRIGGER_LEN);
          scheduleSave();
        });
      } else {
        triggerEl = document.createElement('span');
        triggerEl.className = 'rule-trigger';
        triggerEl.textContent = rule.trigger;
      }

      const arrow = document.createElement('span');
      arrow.className = 'rule-arrow';
      arrow.textContent = '▶';

      const replaceEl = document.createElement('span');
      replaceEl.className = 'rule-replace';
      replaceEl.textContent = rule.replace;

      const labelEl = document.createElement('span');
      labelEl.className = 'rule-label';
      labelEl.textContent = rule.label || '';

      const toggle = makeToggle(rule.enabled, (checked) => {
        rule.enabled = checked;
        scheduleSave();
      });

      row.appendChild(triggerEl);
      row.appendChild(arrow);
      row.appendChild(replaceEl);
      row.appendChild(labelEl);
      row.appendChild(toggle);
      container.appendChild(row);
    });
  }

  function renderCustomRules() {
    els.customList.innerHTML = '';
    settings.custom.rules.forEach((rule, idx) => {
      const row = document.createElement('div');
      row.className = 'custom-row';

      const index = document.createElement('span');
      index.className = 'custom-index';
      index.textContent = String(idx + 1).padStart(2, '0');

      const triggerInput = document.createElement('input');
      triggerInput.className = 'custom-trigger';
      triggerInput.maxLength = INK_MAX_TRIGGER_LEN;
      triggerInput.placeholder = `최대 ${INK_MAX_TRIGGER_LEN}자`;
      triggerInput.value = rule.trigger;
      triggerInput.addEventListener('input', () => {
        rule.trigger = triggerInput.value.slice(0, INK_MAX_TRIGGER_LEN);
        scheduleSave();
      });

      const arrow = document.createElement('span');
      arrow.className = 'rule-arrow';
      arrow.textContent = '▶';

      const replaceInput = document.createElement('input');
      replaceInput.className = 'custom-replace';
      replaceInput.maxLength = INK_MAX_REPLACE_LEN;
      replaceInput.placeholder = `최대 ${INK_MAX_REPLACE_LEN}자`;
      replaceInput.value = rule.replace;
      replaceInput.addEventListener('input', () => {
        rule.replace = replaceInput.value.slice(0, INK_MAX_REPLACE_LEN);
        scheduleSave();
      });

      const toggle = makeToggle(rule.enabled, (checked) => {
        rule.enabled = checked;
        scheduleSave();
      });

      row.appendChild(index);
      row.appendChild(triggerInput);
      row.appendChild(arrow);
      row.appendChild(replaceInput);
      row.appendChild(toggle);
      els.customList.appendChild(row);
    });
  }

  function render() {
    setMasterUI();
    els.calcToggle.checked = settings.calc.enabled;
    els.symbolsToggle.checked = settings.symbols.enabled;
    els.bracketsToggle.checked = settings.brackets.enabled;
    els.customToggle.checked = settings.custom.enabled;

    renderStaticRules(els.symbolsList, settings.symbols.rules, false);
    renderStaticRules(els.bracketsList, settings.brackets.rules, true);
    renderCustomRules();
  }

  els.masterToggle.addEventListener('change', () => {
    settings.enabled = els.masterToggle.checked;
    setMasterUI();
    scheduleSave();
  });
  els.calcToggle.addEventListener('change', () => {
    settings.calc.enabled = els.calcToggle.checked;
    scheduleSave();
  });
  els.symbolsToggle.addEventListener('change', () => {
    settings.symbols.enabled = els.symbolsToggle.checked;
    scheduleSave();
  });
  els.bracketsToggle.addEventListener('change', () => {
    settings.brackets.enabled = els.bracketsToggle.checked;
    scheduleSave();
  });
  els.customToggle.addEventListener('change', () => {
    settings.custom.enabled = els.customToggle.checked;
    scheduleSave();
  });

  els.themeToggle.addEventListener('click', () => {
    settings.theme = resolveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme();
    scheduleSave();
  });

  load();
})();
