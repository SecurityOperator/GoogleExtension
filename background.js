// const REMOTE_URL = "mock/response_danger.json";
const REMOTE_URL = "http://localhost:8081/sites";

const Log = (...data) => console.log("[DEBUG]", ...data);

var activeTabId;

const UpdateIcon = m =>
  chrome.browserAction.setIcon({ path: "images/icon_" + m + "_32.png" });

const sendMessage = ({ type, data }) => {
  Log("sendMessage", type, data);
  chrome.runtime.sendMessage({ type, data });
};

const Storage = {
  get: key =>
    new Promise(resolve => chrome.storage.sync.get([key], resolve)).then(
      d => d[key]
    ),
  set: (key, value) => {
    let o = {};
    o[key] = value;
    return new Promise(resolve => chrome.storage.sync.set(o, resolve));
  }
};

const ActiveTab = () =>
  new Promise(res => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      let tab = tabs[0];
      if (!tab)
        return chrome.tabs.get(activeTabId, tab => {
          if (!tab) return Log("No active tab identified.");
          res(tab);
        });
      res(tab);
    });
  });

chrome.runtime.onInstalled.addListener(async () => {
  await Storage.set("urls", []);
  Log("onInstalled");
});

chrome.tabs.onActivated.addListener(async activeInfo => {
  Log("onActivated", activeInfo);
  activeTabId = activeInfo.tabId;
  await checkData();
});

chrome.tabs.onCreated.addListener(data => {
  Log("onCreated", data);
});

chrome.runtime.onMessage.addListener(async msg => {
  Log("onMessage", msg.type);
  switch (msg.type) {
    case "onRequestFetch":
      checkData();
      break;
    case "onGetDocument":
      let { url } = await ActiveTab();
      Log(url, msg.data);
      fetchData({
        url: url,
        document: msg.data
      });
      break;
  }
});

const preload = async () => {
  chrome.browserAction.setBadgeText({ text: "ON" });
  let urls = await Storage.get("urls");
  if (!Array.isArray(urls)) urls = [];
  await Storage.set("urls", urls);
  Log("Loaded");
};

const getObjectFromArrayByUrl = (array, url) => {
  let data;
  array.find((el, i) => {
    if (el.url == url) data = array[i];
  });
  return data;
};

const documentLoad = async () => {
  chrome.tabs.executeScript(
    null,
    {
      file: "libs/getPagesSource.js"
    },
    function() {
      if (chrome.runtime.lastError) {
        Log(
          "There was an error injecting script : \n" +
            chrome.runtime.lastError.message
        );
      }
    }
  );
};

const checkData = async () => {
  let { url } = await ActiveTab();
  let urls = await Storage.get("urls");

  if (!Array.isArray(urls)) urls = [];

  if (urls.length > 0 && urls.some((el, i) => el.url == url)) {
    let data = getObjectFromArrayByUrl(urls, url);
    UpdateIcon(data.result);
    sendMessage({ type: "onResponseSuccess", data });
  } else {
    UpdateIcon("checking");
    sendMessage({ type: "onWaitRequest" });
    await documentLoad();
  }
};

const fetchData = data =>
  fetch(REMOTE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-type": "application/json"
    },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(async ({ response }) => {
      if (response && response.result) {
        if (!response.url) {
          let { url } = await ActiveTab();
          response.url = url;
        }
        let urls = await Storage.get("urls");
        response.updated_at = Date.now();
        urls.push(response);
        await Storage.set("urls", urls);
        UpdateIcon(response.result);
        Log(`Url is not exist: ${response.url}`);
        sendMessage({ type: "onResponseSuccess", data: response });
      }
    })
    .catch(data => sendMessage({ type: "onResponseError", data }));

const App = async () => {
  await preload();
  await checkData();
};

App();
