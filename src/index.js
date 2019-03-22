// TODO: separate this in to a separate package to reduce the http boilerplate and better typing.
const fs = require('fs');
const https = require('https');

const LOCIZE_URL = 'https://api.locize.io';
const LOCIZE_URL_LANGUAGES = `${LOCIZE_URL}/languages`;

const makeRequest = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve(data));

  }).on('error', (err) => {
    reject(err);
  });
})

// TODO: remove after we upgrade to node v10.13
const createDir = (dir) => {
  const splitPath = dir.split('/');
  splitPath.reduce((path, subPath) => {
    let currentPath;
    if(subPath != '.'){
      currentPath = path + '/' + subPath;
      if (!fs.existsSync(currentPath)){
        fs.mkdirSync(currentPath);
      }
    }
    else{
      currentPath = subPath;
    }
    return currentPath
  }, '')
}

const checkOption = (options, val) => {
  if (!options || !options[val]) {
    throw new Error('Please make sure all options are supplied');
  }
  return options[val];
}

const verifyLangsAtLocize = async (projectId, locales) => {
  const resp = await makeRequest(`${LOCIZE_URL_LANGUAGES}/${projectId}`);
  const fetchedLocales = Object.keys(JSON.parse(resp));
  locales.forEach((locale) => {
    if (!fetchedLocales.includes(locale)) {
      throw new Error(`Supplied locale "${locale}" does not exist at locize.io`)
    }
  })
  return Promise.resolve();
}

const downloadLangFile = async (projectId, locale, namespace, version) => {
  const resp = await makeRequest(`${LOCIZE_URL}/${projectId}/${version}/${locale}/${namespace}`);
  return Promise.resolve(resp);
}

const writeLangFile = (locale, localePath, content, namespace) => {
  const contentToWrite = `{"${namespace}": ${content}}`;
  createDir(`${localePath}/${locale}`);
  // fs.mkdirSync(`${localePath}/${locale}`, { recursive: true });
  fs.writeFileSync(`${localePath}/${locale}/${locale}.json`, contentToWrite);
}

class i18nextLocizeWebpackPlugin {
  constructor(options) {
    this.pluginName = 'i18nextLocizeWebpackPlugin';
    this.localePath = checkOption(options, 'localePath');
    this.locales = checkOption(options, 'locales');
    this.projectId = checkOption(options, 'projectId');
    this.namespace = checkOption(options, 'namespace');
    this.version = checkOption(options, 'version');
  };

  apply(compiler) {
    compiler.hooks.beforeRun.tapPromise(this.pluginName, async (compiler) => {
      await verifyLangsAtLocize(this.projectId, this.locales);
      this.locales.map(async (locale) =>  {
        const langFileContents = await downloadLangFile(this.projectId, locale, this.namespace, this.version);
        writeLangFile(locale, this.localePath, langFileContents, this.namespace);
      })
    });
  }
}

module.exports = i18nextLocizeWebpackPlugin;