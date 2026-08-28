// storage.js
// Shared wrappers around chrome.storage.local. Every call is guarded
// with try/catch so a storage hiccup never throws past the caller.

const STORAGE_KEYS = {
  BLOCKLIST: 'pausepoint_blocklist',
  RULE_MAP: 'pausepoint_ruleMap',
  STREAK: 'pausepoint_streak',
  HISTORY: 'pausepoint_history'
};

async function getBlocklist() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BLOCKLIST);
    return result[STORAGE_KEYS.BLOCKLIST] || [];
  } catch (err) {
    console.error('getBlocklist failed', err);
    return [];
  }
}

async function setBlocklist(list) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.BLOCKLIST]: list });
  } catch (err) {
    console.error('setBlocklist failed', err);
  }
}

async function getRuleMap() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.RULE_MAP);
    return result[STORAGE_KEYS.RULE_MAP] || {};
  } catch (err) {
    console.error('getRuleMap failed', err);
    return {};
  }
}

async function setRuleMap(map) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.RULE_MAP]: map });
  } catch (err) {
    console.error('setRuleMap failed', err);
  }
}

async function getStreak() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STREAK);
    return result[STORAGE_KEYS.STREAK] || { current: 0, best: 0, lastOutcomeDate: null };
  } catch (err) {
    console.error('getStreak failed', err);
    return { current: 0, best: 0, lastOutcomeDate: null };
  }
}

async function setStreak(streak) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.STREAK]: streak });
  } catch (err) {
    console.error('setStreak failed', err);
  }
}

async function getHistory() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  } catch (err) {
    console.error('getHistory failed', err);
    return [];
  }
}

async function appendHistory(entry) {
  try {
    const history = await getHistory();
    history.unshift(entry);
    const trimmed = history.slice(0, 200);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });
    return trimmed;
  } catch (err) {
    console.error('appendHistory failed', err);
    return [];
  }
}

export {
  STORAGE_KEYS,
  getBlocklist,
  setBlocklist,
  getRuleMap,
  setRuleMap,
  getStreak,
  setStreak,
  getHistory,
  appendHistory
};
