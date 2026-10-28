/**
 * Mini Player - YouTube Music Background Service
 * Gerencia a comunicação entre o Popup e a aba do YouTube Music
 */

let sleepTimerId = null;
let sleepTimerMinutes = 0;
let sleepTimerEndTime = null;

// Encontra a aba ativa de música (prioriza music.youtube.com, depois youtube.com)
async function getMusicTab() {
  const ytmTabs = await browser.tabs.query({ url: "*://music.youtube.com/*" });
  if (ytmTabs.length > 0) {
    const audible = ytmTabs.find((t) => t.audible);
    return audible || ytmTabs[0];
  }

  const ytTabs = await browser.tabs.query({ url: "*://www.youtube.com/*" });
  if (ytTabs.length > 0) {
    const audible = ytTabs.find((t) => t.audible);
    return audible || ytTabs[0];
  }

  return null;
}

// Envia comando para a aba e injeta o script automaticamente caso a aba já estivesse aberta antes
async function sendCommandToTab(tabId, payload) {
  try {
    return await browser.tabs.sendMessage(tabId, payload);
  } catch (err) {
    try {
      await browser.tabs.executeScript(tabId, { file: "/ytm-controller.js" });
      return await browser.tabs.sendMessage(tabId, payload);
    } catch (retryErr) {
      return { error: retryErr.message || err.message };
    }
  }
}

// Ouvinte de mensagens da extensão
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_MUSIC_TAB") {
    getMusicTab().then((tab) => sendResponse({ tab }));
    return true;
  }

  if (message.action === "SEND_PLAYER_COMMAND") {
    getMusicTab().then(async (tab) => {
      if (!tab) {
        sendResponse({ error: "Nenhuma aba do YouTube Music encontrada." });
        return;
      }
      const res = await sendCommandToTab(tab.id, message.payload);
      sendResponse(res);
    });
    return true;
  }

  if (message.action === "FOCUS_MUSIC_TAB") {
    getMusicTab().then((tab) => {
      if (tab) {
        browser.tabs.update(tab.id, { active: true });
        browser.windows.update(tab.windowId, { focused: true });
      }
    });
  }

  if (message.action === "OPEN_YOUTUBE_MUSIC") {
    browser.tabs.create({ url: "https://music.youtube.com" });
  }

  if (message.action === "OPEN_DETACHED_WINDOW") {
    browser.windows.create({
      url: browser.runtime.getURL("popup/popup.html?detached=true"),
      type: "popup",
      width: 395,
      height: 520
    });
  }

  if (message.action === "GET_SLEEP_TIMER") {
    const remainingMs = sleepTimerEndTime ? Math.max(0, sleepTimerEndTime - Date.now()) : 0;
    if (remainingMs === 0) {
      sleepTimerMinutes = 0;
      sleepTimerEndTime = null;
    }
    sendResponse({
      minutes: sleepTimerMinutes,
      remainingMs
    });
    return true;
  }

  if (message.action === "SET_SLEEP_TIMER") {
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      sleepTimerId = null;
    }

    const minutes = Number(message.minutes) || 0;
    sleepTimerMinutes = minutes;

    if (minutes > 0) {
      sleepTimerEndTime = Date.now() + minutes * 60 * 1000;
      sleepTimerId = setTimeout(async () => {
        const tab = await getMusicTab();
        if (tab) {
          await sendCommandToTab(tab.id, { command: "PAUSE" });
        }
        sleepTimerId = null;
        sleepTimerMinutes = 0;
        sleepTimerEndTime = null;
      }, minutes * 60 * 1000);
      sendResponse({ status: "scheduled", minutes });
    } else {
      sleepTimerEndTime = null;
      sendResponse({ status: "cancelled" });
    }
    return true;
  }
});
