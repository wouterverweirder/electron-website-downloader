{
  //setup ipc channel
  const {ipcRenderer} = require(`electron`);
  ipcRenderer.on(`get-urls`, () => {
    const urls = [],
      assetUrls = [];
    const links = document.querySelectorAll(`a`);
    links.forEach(link => urls.push(link.getAttribute(`href`)));
    const sources = document.querySelectorAll(`source`);
    sources.forEach(source => assetUrls.push(source.getAttribute(`srcset`)));
    ipcRenderer.sendToHost(`get-urls`, urls, assetUrls);
  });

  //source
}
