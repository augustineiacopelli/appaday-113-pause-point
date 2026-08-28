// background.js
// Module-type service worker. Chrome kills this after roughly thirty
// seconds of inactivity, so nothing here relies on in-memory state
// surviving between messages. Every handler re-reads storage and, on
// each fresh start, rebuildRules() runs immediately to reconcile the
// dynamic ruleset with whatever is in storage.

import {
  getBlocklist,
  setBlocklist,
  getRuleMap,
  setRuleMap,
  getStreak,
  setStreak,
  appendHistory
} from './storage.js';

const ALLOW_DURATION_MINUTES = 15;
const ALLOW_ID_OFFSET = 500000;

function domainToRuleId(ruleMap, domain) {
  if (ruleMap[domain]) return ruleMap[domain];
  const used = Object.values(ruleMap);
  let candidate = 1;
  while (used.includes(candidate)) candidate++;
  return candidate;
}

function buildBlockRule(domain, ruleId) {
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/redirect.html?domain=${encodeURIComponent(domain)}`
      }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame']
    }
  };
}

function buildAllowRule(domain, ruleId) {
  return {
    id: ruleId,
    priority: 2,
    action: { type: 'allow' },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame']
    }
  };
}

async function rebuildRules() {
  try {
    const blocklist = await getBlocklist();
    const ruleMap = await getRuleMap();
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const existingBlockIds = existing
      .filter((r) => r.id < ALLOW_ID_OFFSET)
      .map((r) => r.id);

    const newRuleMap = {};
    const addRules = blocklist.map((domain) => {
      const id = domainToRuleId(ruleMap, domain);
      newRuleMap[domain] = id;
      return buildBlockRule(domain, id);
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingBlockIds,
      addRules
    });

    await setRuleMap(newRuleMap);
  } catch (err) {
    console.error('rebuildRules failed', err);
  }
}

async function addDomain(rawDomain) {
  const clean = String(rawDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!clean) return;
  const blocklist = await getBlocklist();
  if (blocklist.includes(clean)) return;
  blocklist.push(clean);
  await setBlocklist(blocklist);
  await rebuildRules();
}

async function removeDomain(domain) {
  const blocklist = await getBlocklist();
  const filtered = blocklist.filter((d) => d !== domain);
  await setBlocklist(filtered);
  const ruleMap = await getRuleMap();
  delete ruleMap[domain];
  await setRuleMap(ruleMap);
  await rebuildRules();
}

async function allowTemporarily(domain) {
  const ruleMap = await getRuleMap();
  const blockId = ruleMap[domain];
  if (!blockId) return;
  const allowId = ALLOW_ID_OFFSET + blockId;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [allowId],
      addRules: [buildAllowRule(domain, allowId)]
    });
    chrome.alarms.create(`revert_${domain}`, { delayInMinutes: ALLOW_DURATION_MINUTES });
  } catch (err) {
    console.error('allowTemporarily failed', err);
  }
}

async function revertAllow(domain) {
  const ruleMap = await getRuleMap();
  const blockId = ruleMap[domain];
  if (!blockId) return;
  const allowId = ALLOW_ID_OFFSET + blockId;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [allowId]
    });
  } catch (err) {
    console.error('revertAllow failed', err);
  }
}

async function recordOutcome(domain, outcome, reason) {
  const streak = await getStreak();
  const today = new Date().toISOString().slice(0, 10);

  if (outcome === 'close') {
    streak.current = (streak.current || 0) + 1;
    if (streak.current > (streak.best || 0)) streak.best = streak.current;
  } else if (outcome === 'proceed') {
    streak.current = 0;
    await allowTemporarily(domain);
  }
  streak.lastOutcomeDate = today;
  await setStreak(streak);

  await appendHistory({
    domain,
    outcome,
    reason: reason || '',
    timestamp: Date.now()
  });
}

chrome.runtime.onInstalled.addListener(() => {
  rebuildRules();
});

chrome.runtime.onStartup.addListener(() => {
  rebuildRules();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('revert_')) {
    const domain = alarm.name.slice('revert_'.length);
    revertAllow(domain);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'addDomain') {
        await addDomain(message.domain);
        sendResponse({ ok: true, blocklist: await getBlocklist() });
      } else if (message.type === 'removeDomain') {
        await removeDomain(message.domain);
        sendResponse({ ok: true, blocklist: await getBlocklist() });
      } else if (message.type === 'getState') {
        sendResponse({
          ok: true,
          blocklist: await getBlocklist(),
          streak: await getStreak()
        });
      } else if (message.type === 'recordOutcome') {
        await recordOutcome(message.domain, message.outcome, message.reason);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (err) {
      console.error('message handling failed', err);
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true;
});

// The worker restarts fresh after roughly thirty seconds idle, so every
// wake reconciles the dynamic ruleset against storage rather than trusting
// anything held in memory from a previous life.
rebuildRules();
