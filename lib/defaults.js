// Shared defaults & settings helpers, loaded by both the content script and the popup.
// Exposed as plain globals (no ES modules) so it works as a classic content script.

const INK_STORAGE_KEY = 'inkSettings';
const INK_MAX_CUSTOM_RULES = 30;
const INK_MAX_TRIGGER_LEN = 12;
const INK_MAX_REPLACE_LEN = 50;

function inkCreateDefaultCustomRules() {
  const rules = [];
  for (let i = 1; i <= INK_MAX_CUSTOM_RULES; i++) {
    rules.push({ id: `custom_${i}`, trigger: '', replace: '', enabled: true });
  }
  return rules;
}

function inkBuildDefaultSettings() {
  return {
    enabled: true,
    theme: 'system',
    calc: { enabled: true },
    symbols: {
      enabled: true,
      rules: [
        { id: 'ellipsis', trigger: '..', replace: '…', label: '말줄임표', enabled: true },
        { id: 'arrowRight', trigger: '->', replace: '→', label: '오른쪽 화살표', enabled: true },
        { id: 'arrowLeft', trigger: '<-', replace: '←', label: '왼쪽 화살표', enabled: true },
        { id: 'dash', trigger: '--', replace: '—', label: '줄표', enabled: true }
      ]
    },
    brackets: {
      enabled: true,
      rules: [
        { id: 'bracketOpenDouble', trigger: '=[', replace: '【', label: '겹낫표 열기', enabled: true },
        { id: 'bracketCloseDouble', trigger: ']=', replace: '】', label: '겹낫표 닫기', enabled: true },
        { id: 'bracketOpenSingle', trigger: '.ㄱ', replace: '「', label: '낫표 열기', enabled: true },
        { id: 'bracketCloseSingle', trigger: '.ㄴ', replace: '」', label: '낫표 닫기', enabled: true },
        { id: 'angleOpen', trigger: '<<', replace: '《', label: '겹화살괄호 열기', enabled: true },
        { id: 'angleClose', trigger: '>>', replace: '》', label: '겹화살괄호 닫기', enabled: true }
      ]
    },
    custom: {
      enabled: true,
      rules: inkCreateDefaultCustomRules()
    }
  };
}

const INK_DEFAULT_SETTINGS = inkBuildDefaultSettings();

function inkCloneDefaults() {
  return JSON.parse(JSON.stringify(INK_DEFAULT_SETTINGS));
}

// Merges a partial/raw settings object (as stored) on top of the current defaults,
// so newly-introduced default rules (future updates) always show up, while
// preserving anything the user has customized (enabled flags, trigger overrides).
function inkNormalizeSettings(raw) {
  const base = inkCloneDefaults();
  if (!raw || typeof raw !== 'object') return base;

  if (typeof raw.enabled === 'boolean') base.enabled = raw.enabled;
  if (typeof raw.theme === 'string' && ['system', 'light', 'dark'].includes(raw.theme)) {
    base.theme = raw.theme;
  }
  if (raw.calc && typeof raw.calc.enabled === 'boolean') base.calc.enabled = raw.calc.enabled;

  for (const cat of ['symbols', 'brackets']) {
    if (raw[cat]) {
      if (typeof raw[cat].enabled === 'boolean') base[cat].enabled = raw[cat].enabled;
      if (Array.isArray(raw[cat].rules)) {
        const byId = new Map(raw[cat].rules.map((r) => [r.id, r]));
        base[cat].rules = base[cat].rules.map((defRule) => {
          const saved = byId.get(defRule.id);
          if (!saved) return defRule;
          return {
            ...defRule,
            trigger:
              typeof saved.trigger === 'string' && saved.trigger.length
                ? saved.trigger.slice(0, INK_MAX_TRIGGER_LEN)
                : defRule.trigger,
            enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defRule.enabled
          };
        });
      }
    }
  }

  if (raw.custom) {
    if (typeof raw.custom.enabled === 'boolean') base.custom.enabled = raw.custom.enabled;
    if (Array.isArray(raw.custom.rules)) {
      base.custom.rules = base.custom.rules.map((defRule, idx) => {
        const saved = raw.custom.rules[idx];
        if (!saved) return defRule;
        return {
          id: defRule.id,
          trigger: typeof saved.trigger === 'string' ? saved.trigger.slice(0, INK_MAX_TRIGGER_LEN) : '',
          replace: typeof saved.replace === 'string' ? saved.replace.slice(0, INK_MAX_REPLACE_LEN) : '',
          enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true
        };
      });
    }
  }

  return base;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INK_STORAGE_KEY,
    INK_MAX_CUSTOM_RULES,
    INK_MAX_TRIGGER_LEN,
    INK_MAX_REPLACE_LEN,
    INK_DEFAULT_SETTINGS,
    inkCloneDefaults,
    inkNormalizeSettings
  };
}
