const htmlEscape = str => {
  return String(str).replace(/&/g, `&amp;`)
    .replace(/\"/g, `&quot;`)
    .replace(/'/g, `&#39;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`);
};

const needsJSONConversion = arg => {
  if(
    typeof arg === `number` ||
    typeof arg === `string` ||
    typeof arg === `boolean`
  ) {
    return false;
  }
  return true;
};

const getFullUrlWithoutHash = (value, rootUrl) => {
  let fullUrl = getFullUrl(value, rootUrl);
  const hashIndex = fullUrl.indexOf(`#`);
  if(hashIndex > -1) {
    fullUrl = fullUrl.substr(0, hashIndex - 1);
  }
  return fullUrl;
};

const getFullUrl = (value, rootUrl = ``) => {
  const url = require(`url`);
  const parsedUrl = url.parse(value);
  const parsedRootUrl = url.parse(rootUrl);
  if(parsedUrl.protocol === null) {
    if(parsedUrl.href.indexOf(`/`) === 0) {
      return `${parsedRootUrl.protocol}//${parsedRootUrl.host}${parsedUrl.href}`;
    }
    return `${parsedRootUrl.protocol}//${parsedRootUrl.host}/${parsedUrl.href}`;
  }
  return value;
};

const getUniqueArray = a => {
  const seen = {};
  return a.filter(item => {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
};

const fileExistsPromised = filePath => {
  return new Promise(resolve => {
    const fs = require(`fs`);
    fs.access(filePath, fs.constants.F_OK, error => {
      if(error) {
        return resolve(false);
      }
      return resolve(true);
    });
  });
};

const mkdirpPromised = folderPath => {
  return new Promise((resolve, reject) => {
    const mkdirp = require(`mkdirp`);
    mkdirp(folderPath, error => {
      if(error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const getPathWithoutProtocol = path => {
  return path.replace(/.*?:\/\//g, ``);
};

const getPathWithoutQueryString = path => {
  return path.split(`?`)[0];
};

const getRelativeUrl = (resourceUrl, downloadFolder, contentType = false) => {
  const path = require(`path`);
  let relativeUrl = path.resolve(downloadFolder, getPathWithoutProtocol(getPathWithoutQueryString(resourceUrl)));
  const ext = path.extname(relativeUrl);
  if(!contentType) {
    return relativeUrl;
  }
  const contentTypeSplit = contentType.split(`;`); //some contentTypes have ; charset suffix
  contentType = contentTypeSplit[0];
  if(contentType === `text/html`) {
    if(ext !== `.html` && ext !== `.htm`) {
      relativeUrl += `/index.html`;
    }
  }
  else if(contentType.toLowerCase().indexOf(`javascript`) > -1) {
    if(ext !== `.js`) {
      relativeUrl += `.js`;
    }
  }
  return relativeUrl;
};

const downloadFilePromised = (fileUrl, filePath) => {
  return new Promise(resolve => {
    const fs = require(`fs`);
    const url = require(`url`);
    const file = fs.createWriteStream(filePath);
    const fileUrlParsed = url.parse(fileUrl);
    const httpLib = (fileUrlParsed.protocol === `https:`) ? require(`https`) : require(`http`);
    httpLib.get({
      host: fileUrlParsed.host,
      path: fileUrlParsed.path,
      headers: {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
      }
    }, response => {
      response.pipe(file);
      response.on(`end`, () => resolve(filePath));
    });
  });
};

const canFetchAccordingToRobotsTxt = urlWeWantToFetch => {
  return new Promise(resolve => {
    const robots = require(`robots`),
      parser = new robots.RobotsParser(),
      url = require(`url`),
      urlParsed = url.parse(urlWeWantToFetch);
    parser.setUrl(`${urlParsed.protocol}//${urlParsed.host}/robots.txt`, (parser, success) => {
      if(!success) {
        return resolve(true);
      }
      parser.canFetch(`*`, urlParsed.path, access => {
        console.log(urlParsed.path, access);
        resolve(access);
      });
    });
  });
};

module.exports = {
  htmlEscape,
  needsJSONConversion,
  getFullUrlWithoutHash,
  getFullUrl,
  getUniqueArray,
  fileExistsPromised,
  mkdirpPromised,
  getPathWithoutProtocol,
  getPathWithoutQueryString,
  getRelativeUrl,
  downloadFilePromised,
  canFetchAccordingToRobotsTxt
};
