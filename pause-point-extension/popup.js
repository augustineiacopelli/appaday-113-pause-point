const streakCurrentEl = document.getElementById('streakCurrent');
const streakBestEl = document.getElementById('streakBest');
const listEl = document.getElementById('blocklistItems');
const form = document.getElementById('addForm');
const input = document.getElementById('domainInput');

function renderList(blocklist) {
  listEl.innerHTML = '';
  if (!blocklist.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No sites blocked yet.';
    listEl.appendChild(empty);
    return;
  }
  blocklist.forEach((domain) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = domain;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'removeDomain', domain }, (response) => {
        if (response && response.ok) {
          renderList(response.blocklist);
        }
      });
    });
    li.appendChild(span);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

function renderStreak(streak) {
  streakCurrentEl.textContent = String(streak.current || 0);
  streakBestEl.textContent = String(streak.best || 0);
}

function loadState() {
  chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
    if (response && response.ok) {
      renderList(response.blocklist);
      renderStreak(response.streak);
    }
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const domain = input.value.trim();
  if (!domain) return;
  chrome.runtime.sendMessage({ type: 'addDomain', domain }, (response) => {
    if (response && response.ok) {
      input.value = '';
      renderList(response.blocklist);
    }
  });
});

loadState();
