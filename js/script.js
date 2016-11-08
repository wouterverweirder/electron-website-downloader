{

  const {app} = require(`electron`).remote,
    url = require(`url`),
    fs = require(`fs`),
    path = require(`path`),
    css = require(`css`),
    cssMqParser = require(`css-mq-parser`);

  const {
    htmlEscape,
    needsJSONConversion,
    getFullUrlWithoutHash,
    getUniqueArray,
    fileExistsPromised,
    mkdirpPromised,
    getRelativeUrl,
    downloadFilePromised,
    canFetchAccordingToRobotsTxt
  } = require(`./utils`);

  const webviewEl = document.getElementById(`webview`);
  const formEl = document.querySelector(`form`);
  const consoleEl = document.querySelector(`.console`);
  const logs = [];
  const urlsToLoad = [`http://bump-festival.be`];
  const handledUrls = [];
  const breakPoints = {'320px': true};
  const breakpointsToLoad = [`320px`];

  let rootUrl = urlsToLoad[0];
  let parsedRootUrl = url.parse(rootUrl);
  let downloadQueue = Promise.resolve();
  let downloadFolder = app.getPath(`desktop`);
  let urlIndex = -1;
  let breakpointIndex = -1;

  const init = () => {
    webviewEl.addEventListener(`ipc-message`, e => webviewIpcMessageHandler(e));
    webviewEl.addEventListener(`did-get-response-details`, e => didGetResponseDetailsHandler(e));
    webviewEl.addEventListener(`did-finish-load`, () => didFinishLoad());
    webviewEl.addEventListener(`did-fail-load`, e => didFailLoad(e));
    webviewEl.setAttribute(`preload`, `js/webview-preload.js`);
    formEl.addEventListener(`submit`, e => {
      e.preventDefault();
      let urlToLoad = formEl.querySelector(`input[name='address']`).value;
      const urlParsed = url.parse(urlToLoad);
      if(!urlParsed.path) {
        alert(`Entered URL is not valid!`);
        return;
      }
      if(!urlParsed.protocol) {
        urlToLoad = `http://${urlToLoad}`;
      }
      urlsToLoad[0] = urlToLoad;
      rootUrl = urlsToLoad[0];
      parsedRootUrl = url.parse(rootUrl);
      downloadFolder = path.resolve(app.getPath(`desktop`), `${parsedRootUrl.host}-${Date.now()}`);
      setFormEnabled(false);
      canFetchAccordingToRobotsTxt(rootUrl).then(allowed => {
        if(!allowed) {
          alert(`Parsing not allowed by robots.txt`);
          setFormEnabled(true);
          return;
        }
        loadNextBreakpoint();
      });
    });
  };

  const log = (...args) => {
    let str = ``;
    args.forEach(arg => {
      if(str.length > 0) {
        str += ` `;
      }
      //is it an object or a simple type?
      if(needsJSONConversion(arg)) {
        arg = JSON.stringify(arg);
      }
      str += htmlEscape(arg);
    });
    logs.push(`<pre>${  str  }</pre>`);
    while(logs.length > 20) {
      logs.shift();
    }
    const html = logs.join(``);
    consoleEl.innerHTML = html;
    consoleEl.parentNode.scrollTop = consoleEl.parentNode.scrollHeight;
  };

  const setFormEnabled = value => {
    const inputs = formEl.querySelectorAll(`input`);
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].disabled = !value;
    }
    const buttons = formEl.querySelectorAll(`button`);
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = !value;
    }
  };

  const loadNextBreakpoint = () => {
    ++breakpointIndex;
    if(breakpointIndex < breakpointsToLoad.length) {
      urlIndex = -1;
      webviewEl.style.width = breakpointsToLoad[breakpointIndex];
      loadNextUrl();
    } else {
      log(`all done`);
      setFormEnabled(true);
    }
  };

  const loadNextUrl = () => {
    ++urlIndex;
    if(urlIndex < urlsToLoad.length) {
      log(`load url: ${urlsToLoad[urlIndex]} - ${breakpointsToLoad[breakpointIndex]}`);
      webviewEl.setAttribute(`src`, urlsToLoad[urlIndex]);
    } else {
      loadNextBreakpoint();
    }
  };

  const webviewIpcMessageHandler = e => {
    if(e.channel !== `get-urls`) {
      return;
    }
    const urls = e.args[0];
    const assetUrls = e.args[1];
    assetUrls.forEach(assetUrl => {
      downloadQueue = downloadQueue.then(() => {
        return downloadResource(getFullUrlWithoutHash(assetUrl, rootUrl));
      });
    });
    handleWebviewUrls(urls);
    loadNextUrl();
  };

  const handleWebviewUrls = webviewUrls => {
    //reduce urls to urls which are on this site's domain
    let reducedUrls = [];
    webviewUrls.forEach(webviewUrl => {
      if(!webviewUrl) {
        return;
      }
      const fullUrl = getFullUrlWithoutHash(webviewUrl, rootUrl);
      const parsedUrl = url.parse(fullUrl);
      if(parsedUrl.protocol.indexOf(`http`) !== 0) {
        return;
      }
      if(parsedUrl.host === parsedRootUrl.host) {
        reducedUrls.push(fullUrl);
        return;
      }
    });
    reducedUrls = getUniqueArray(reducedUrls);
    //only handle urls which have not been handled yet
    reducedUrls = reducedUrls.filter(o => handledUrls.indexOf(o) === -1);
    reducedUrls = reducedUrls.filter(o => urlsToLoad.indexOf(o) === -1);
    reducedUrls.forEach(o => urlsToLoad.push(o));
  };

  const didGetResponseDetailsHandler = e => {
    const contentType = (e.headers[`content-type`]) ? e.headers[`content-type`][0] : false;
    downloadQueue = downloadQueue.then(() => {
      return downloadResource(e.originalURL, contentType);
    });
  };

  const didFailLoad = e => {
    console.error(e);
  };

  const didFinishLoad = () => {
    handledUrls.push(webviewEl.getAttribute(`src`));
    //some scripts start loads a little bit after this event, wait a little bit before continueing
    setTimeout(() => {
      //get the hyperlinks in this page
      webviewEl.send(`get-urls`);
    }, 500);
  };

  const downloadResource = (resourceUrl, contentType = false) => {
    const localResourcePath = path.resolve(downloadFolder, getRelativeUrl(resourceUrl, downloadFolder, contentType));
    const localResourceFolder = path.resolve(localResourcePath, `..`);
    return new Promise(resolve => {
      fileExistsPromised(localResourceFolder)
      .then(exists => {
        return (exists) ? true : mkdirpPromised(localResourceFolder);
      })
      .then(() => fileExistsPromised(localResourcePath))
      .then(exists => {
        if(exists) {
          return false;
        }
        log(`downloading ${resourceUrl} to ${localResourcePath}`);
        return downloadFilePromised(resourceUrl, localResourcePath);
      })
      .then(downloadedFilePath => {
        if(!downloadedFilePath) {
          return;
        }
        if(contentType !== `text/css`) {
          return;
        }
        if(resourceUrl.indexOf(`${parsedRootUrl.protocol}//${parsedRootUrl.host}`) !== 0) {
          return;
        }
        return handleStylesheetBreakpoints(localResourcePath);
      })
      .then(() => {
        resolve(localResourcePath);
      })
      .catch(ex => {
        console.error(ex);
        resolve(false);
      });
    });
  };

  const handleStylesheetBreakpoints = filePath => {
    return new Promise(resolve => {
      fs.readFile(filePath, `utf8`, (err, data) => {
        if(err) {
          resolve(false);
          return;
        }
        try {
          const parsedCss = css.parse(data);
          parsedCss.stylesheet.rules.forEach(cssRule => {
            if(cssRule.media) {
              const parsedMq = cssMqParser(cssRule.media);
              parsedMq.forEach(parsedMqO => {
                parsedMqO.expressions.forEach(expression => {
                  if(expression.value === `0`) {
                    return;
                  }
                  breakPoints[expression.value] = true;
                  // console.log(`${expression.feature} ${expression.modifier} ${expression.value}`);
                });
              });
            }
          });
          for(const key in breakPoints) {
            if(breakpointsToLoad.indexOf(key) === -1) {
              breakpointsToLoad.push(key);
            }
          }
          resolve(parsedCss);
        }
        catch(ex) {
          resolve(false);
        }
      });
    });
  };

  init();
}
