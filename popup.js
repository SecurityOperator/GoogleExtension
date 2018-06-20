const Log = (...data) => console.log("[DEBUG]", ...data);

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
    chrome.tabs.query({ active: true, currentWindow: true }, res);
  }).then(r => r[0]);

const getObjectFromArrayByUrl = (array, url) => {
  let data;
  array.find((el, i) => {
    if (el.url == url) data = array[i];
  });
  return data;
};

function reportLink(link, result, message, link) {
  let containerContent = $(".main__container__content");
  containerContent.prepend("<a href="+ link + " id='buttonSeeReport'></a>");
  containerContent.prepend("<div id='containerText'></div>");
  $("#buttonSeeReport")
    .addClass("main__container__button main__container__button_" + result)
    .text("Смотреть отчет");
  $("#containerText")
    .addClass("main__container__text main__container__text_" + result)
    .text(message);
}

async function dataResult(message, link) {
  $("#buttonSeeReport").remove();
  $("#containerText").remove();
  switch (message) {
    case "warning":
      reportLink("url", message, "Предупреждение", link);
      break;
    case "danger":
      reportLink("url", message, "Опасность", link);
      break;
    case "secure":
      $(".main__container__content").prepend("<div id='containerText'></div>");
      $("#containerText")
        .addClass("main__container__text main__container__text_secure")
        .text("Страница безопасна");
      break;
    default:
      $(".main__container__content").prepend("<div id='containerText'></div>");
      $("#containerText")
        .addClass("main__container__text")
        .text("Идет загрузка...");
  }
}

const onButtonClickMore = () => sendMessage({ type: "onRequestFetch" });

document.addEventListener("DOMContentLoaded", async function() {
  Log("Start Application");
  // let { url } = await ActiveTab();
  // let urls = await Storage.get("urls");
  // Log(`[DOMContentLoaded] url: ${url}`);
  // if (urls.some((el, i) => el.url == url)) {
  //   Log(`[DOMContentLoaded] url is exist: ${url}`);
  //   let { result } = getObjectFromArrayByUrl(urls, url);
  //   dataResult(result);
  // } else {
    // Log(`[DOMContentLoaded] url is not exist: ${url}`);
    onButtonClickMore();
  // }

  $("#buttonCheckMore").click(() => sendMessage({ type: "onRequestFetch" }));
});

const sendMessage = data => {
  Log("sendMessage", data.type);
  chrome.runtime.sendMessage(data);
};

chrome.runtime.onMessage.addListener(function(msg) {
  Log("onMessage", msg.type, msg.data);
  switch (msg.type) {
    case "onResponseSuccess":
      dataResult(msg.data.result, msg.data.link);
      break;
    case "onWaitRequest":
      dataResult("waiting");
      break;
    case "onResponseError":
      Log(msg.data);
      break;
  }
});
