const params = new URLSearchParams(window.location.search);
const domain = params.get('domain') || '';

const domainLabel = document.getElementById('domainLabel');
const promptStage = document.getElementById('promptStage');
const pauseStage = document.getElementById('pauseStage');
const reasonInput = document.getElementById('reasonInput');
const reasonDisplay = document.getElementById('reasonDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const closeBtn = document.getElementById('closeBtn');
const proceedBtn = document.getElementById('proceedBtn');

domainLabel.textContent = domain || 'that site';

let secondsLeft = 60;
let intervalId = null;
let reasonText = '';

function recordOutcome(outcome) {
  try {
    chrome.runtime.sendMessage({
      type: 'recordOutcome',
      domain,
      outcome,
      reason: reasonText
    });
  } catch (err) {
    console.error('recordOutcome failed', err);
  }
}

startBtn.addEventListener('click', () => {
  reasonText = reasonInput.value.trim();
  reasonDisplay.textContent = reasonText ? `"${reasonText}"` : '';
  promptStage.style.display = 'none';
  pauseStage.style.display = 'block';

  intervalId = setInterval(() => {
    secondsLeft -= 1;
    timerDisplay.textContent = String(secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(intervalId);
      proceedBtn.disabled = false;
    }
  }, 1000);
});

closeBtn.addEventListener('click', () => {
  recordOutcome('close');
  window.close();
});

proceedBtn.addEventListener('click', () => {
  if (proceedBtn.disabled) return;
  recordOutcome('proceed');
  window.location.href = `https://${domain}`;
});
