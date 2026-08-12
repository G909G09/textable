// Content script: watches editable elements on the page and auto-replaces
// trigger strings (symbols, brackets, custom rules, !calc!) as the user types.
(function () {
  'use strict';

  const LOOKBEHIND = 400; // chars scanned before the caret on every keystroke
  const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email']);

  let currentSettings = inkNormalizeSettings(null);
  let compiledRules = [];
  let isReplacing = false;

  function compileRules(settings) {
    const rules = [];
    if (settings.symbols.enabled) {
      for (const r of settings.symbols.rules) {
        if (r.enabled && r.trigger) rules.push(r);
      }
    }
    if (settings.brackets.enabled) {
      for (const r of settings.brackets.rules) {
        if (r.enabled && r.trigger) rules.push(r);
      }
    }
    if (settings.custom.enabled) {
      for (const r of settings.custom.rules) {
        if (r.enabled && r.trigger) rules.push(r);
      }
    }
    rules.sort((a, b) => b.trigger.length - a.trigger.length);
    return rules;
  }

  function applySettings(raw) {
    currentSettings = inkNormalizeSettings(raw);
    compiledRules = compileRules(currentSettings);
  }

  function loadSettings() {
    chrome.storage.sync.get(INK_STORAGE_KEY, (data) => {
      if (chrome.runtime.lastError) return;
      applySettings(data ? data[INK_STORAGE_KEY] : null);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[INK_STORAGE_KEY]) {
      applySettings(changes[INK_STORAGE_KEY].newValue);
    }
  });

  loadSettings();

  function findMatch(before) {
    if (currentSettings.calc.enabled) {
      const calcMatch = inkTryCalcMatch(before);
      if (calcMatch) return calcMatch;
    }
    for (const rule of compiledRules) {
      if (before.endsWith(rule.trigger)) {
        return { triggerLen: rule.trigger.length, replacement: rule.replace };
      }
    }
    return null;
  }

  function isTextField(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return TEXT_INPUT_TYPES.has(type);
    }
    return false;
  }

  function findContentEditable(el) {
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.isContentEditable) return node;
      node = node.parentElement;
    }
    return null;
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function handleTextFieldInput(el) {
    const pos = el.selectionStart;
    if (pos == null || pos !== el.selectionEnd) return;
    const value = el.value;
    const before = value.slice(Math.max(0, pos - LOOKBEHIND), pos);
    const match = findMatch(before);
    if (!match) return;

    const newStart = pos - match.triggerLen;
    const newValue = value.slice(0, newStart) + match.replacement + value.slice(pos);

    isReplacing = true;
    try {
      setNativeValue(el, newValue);
      const caret = newStart + match.replacement.length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      isReplacing = false;
    }
  }

  function handleContentEditableInput(editable) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
    if (!editable.contains(range.startContainer)) return;

    const textNode = range.startContainer;
    const offset = range.startOffset;
    const before = textNode.textContent.slice(Math.max(0, offset - LOOKBEHIND), offset);
    const match = findMatch(before);
    if (!match) return;

    const newRange = range.cloneRange();
    newRange.setStart(range.startContainer, offset - match.triggerLen);
    sel.removeAllRanges();
    sel.addRange(newRange);

    isReplacing = true;
    try {
      const ok = document.execCommand && document.execCommand('insertText', false, match.replacement);
      if (!ok) {
        newRange.deleteContents();
        const textNodeNew = document.createTextNode(match.replacement);
        newRange.insertNode(textNodeNew);
        newRange.setStartAfter(textNodeNew);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        editable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } finally {
      isReplacing = false;
    }
  }

  function handleInput(e) {
    if (isReplacing) return;
    if (e.isComposing) return;
    if (!currentSettings.enabled) return;

    const target = e.target;
    if (isTextField(target)) {
      handleTextFieldInput(target);
      return;
    }
    const editable = findContentEditable(target);
    if (editable) {
      handleContentEditableInput(editable);
    }
  }

  document.addEventListener('input', handleInput, true);
  document.addEventListener('compositionend', handleInput, true);
})();
