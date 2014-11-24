'use strict';

var fs = require('fs-extra'),
  path = require('path'),
  jszip = require('jszip'),
  globule = require('globule'),
  csvParse = require('csv-parse'),
  csvStringify = require('csv-stringify'),
  fs = require('fs-extra'),
  async = require('async'),
  _ = require('lodash');

var cfg = require('./config');
var sPath = cfg.game.basePath;
var smodPath = path.join(sPath, cfg.game.modsPath);

var log = require('./Log');

//CONSTANTS
var CSV_DIST = cfg.dist.csv.basePath; // "_dist/csv"
var JSON_DIST = cfg.dist.json.basePath; // "_dist/json"
var PHRASES_ID = cfg.cons.phrasesId; // "phrasesId"
var ORIGINAL = cfg.cons.original; // "original"
var NEW = cfg.cons.newPhrase; // {{NEW}}
var UPDATED = cfg.cons.updatedPhrase; // {{UPDATED}}


//Above of this comment you will find a "callback-hell" little mess. Needs review
function UpdateCSV(filePath, originalPhrases, cb) {
  CSV2JSON(filePath, function(json, err) {
    if (err) {
      cb(err);
      return;
    }
    // var originalPhrases = OriginalPhrases();
    var newAndUpdatedKeys = {};
    var output = {};

    // _.clone() workaround-fix. Something shaddy is happening if I don't clone 'originalPhrases' obj. Needs review
    _.forEach(json, function(phrases, langId) {
      if (langId === ORIGINAL) { // "original"
        _.forOwn(originalPhrases, function(phrase, phraseId) {
          if (!_.has(phrases, phraseId)) {
            newAndUpdatedKeys[phraseId] = NEW; // {{NEW}}
          } else if (phrases[phraseId] != phrase)
            newAndUpdatedKeys[phraseId] = UPDATED; // {{UPDATED}}
        });
        phrases = _.defaults(_.clone(originalPhrases), phrases); //resets 'original' phrases
        phrases = _.omit(_.clone(originalPhrases), phrases); //cleans unused phrases

        output[langId] = phrases;
      } else {
        phrases = _.merge(_.clone(originalPhrases), phrases); //merge the new keys with the user's csv
        phrases = _.assign(phrases, newAndUpdatedKeys); //set to 'default' updated keys. This means, translator needs to review these keys.
        phrases = _.pick(phrases, function(value, key) { //cleans unused phrases
          if (_.has(originalPhrases, key)) return key;
        });

        output[langId] = phrases;
      }
    });

    JSON2CSV(output, function(csv, err, numPhrases) {
      if (err) {
        log.Save(err);
        cb(err);
        return;
      }
      log.Save(numPhrases + ' phrases processed');
      fs.outputFile(filePath, csv, function(err) {
        if (err) {
          console.log(err);
          log.Save(err);
        } else log.Save('File updated: ' + filePath);

        cb(err);
      });
    });
  });
}

function GenerateJSON(filePath, cb) {
  CSV2JSON(filePath, function(json, err) { //obj of languages: { 'original': { 'ok': 'OK', 'cancel': 'Cancel', ..}, 'pt': {'ok': 'Ok', 'cancel': 'Cancelar', ..}, .. }
    if (err) {
      cb(err);
      return;
    }

    //save file for each language
    var numLanguages = _.keys(json).length;
    var i = 0;

    _.forEach(json, function(phrases, language) {
      if (language == ORIGINAL) { //we don't need to save the original language json
        i++;
        if (numLanguages == 1) {
          log.Save('No aditional languages found (warning)');
          cb(null);
        }
        return;
      }
      
      

      var outputPath = path.resolve(path.join(JSON_DIST, language + '.json'))
      fs.outputJson(outputPath, phrases, function(err) {
        i++;
        log.Save(_.toArray(phrases).length + ' phrases processed');
        if (err) {
          console.log(err);
          log.Save(err);
          cb(err);
        } else {
          log.Save('File save:  ' + outputPath);

          if (i == numLanguages) {
            cb(err);
          }
        }
      });
    });
  });
}

function CSV2JSON(file, cb) {
  log.Save('Generating JSON object');

  var csv = fs.readFileSync(file, {
    encoding: 'utf8'
  });

  csvParse(csv, {
    columns: true
  }, function(err, jsonObj) {
    var formatedJson = {};
    var firstObj = _.first(jsonObj); //{ phrasesId: 'ok', original: 'OK' }

    if(err) {
      log.Save('An error occurred while parsing CSV file (ERROR) maybe the delimiter between words it"s not a ","(comma)');
    }

    var checkFirstWords = _.keys(firstObj);
    if (checkFirstWords[0] != PHRASES_ID | checkFirstWords[1] != ORIGINAL) {
      log.Save('Expecting the words "' + PHRASES_ID + '" and "' + ORIGINAL + '" in the first cells (ERROR)');
      log.Save('Words received: "' + checkFirstWords[0] + '" and "' + checkFirstWords[1] + '"');
      cb(formatedJson, 'Expecting the words "phrasesId" and "original" in the first cells (ERROR)');
      return;
    }

    var languages = [];
    _.forEach(firstObj, function(value, key) {
      if (key != PHRASES_ID) // "phrasesId"
        languages.push(key); // ['original', 'pt', 'fr', ..]
    });

    _.forEach(languages, function(lang) {
      formatedJson[lang] = {};
      _.forEach(jsonObj, function(value) {
        formatedJson[lang][value[PHRASES_ID]] = value[lang]; // { original: { ok: 'OK', cancel: 'cancel', .. }, pt: { ok: 'OK', cancel: 'cancelar', .. }
      });
    });
    cb(formatedJson, null);
  });
}


function JSON2CSV(json, cb) {
  //'json' can be a multiple obj of languages or just a simple obj of phrases(original lang json)
  log.Save('Generating CSV object');
  var csvArray = [];
  var headers = _.keys(json); // [ 'original', 'pt' ] or [ 'ok', 'cancel, 'accept', ..(list of phrases)]

  if (headers[0] != ORIGINAL) {
    //Process for ONE language json, aka, original game lang.
    var keys = _.keys(json); // ['ok', 'cancel', 'load_game', ..]
    var values = _.values(json); // ['OK', 'Cancel', 'Load Game', ..]
    log.Save(values.length + ' phrases processed');
    var csvArray = [];

    csvArray = _.zip(keys, values); // [ [ 'ok', 'Ok'], ['cancel', 'Cancel'], ..]
    csvArray.unshift([PHRASES_ID, ORIGINAL]); // [ ['phrasesId','original'], [ 'ok', 'Ok'], ['cancel', 'Cancel'], ..]
  } else {
    //Process for multi language
    headers.unshift(PHRASES_ID); // [ 'phrasesId', 'original', 'pt' ]
    csvArray.push(headers);

    json = _.toArray(json);
    var phrases = _.keys(_.first(json));

    var numPhrases = 0;
    for (var i = 0; i < phrases.length; i++) {
      var arr = [];
      var phrase = phrases[i]; //'ok'; 'cancel'
      numPhrases++;
      arr.push(phrase);

      for (var h = 0; h < headers.length - 1; h++) { //headers.length-1 because of 'phrasesId'
        var value = json[h][phrase];
        arr.push(value);
      }
      csvArray.push(arr);
    };
  }

  csvStringify(csvArray, {
    quoted: '"',
    quotedString: true,
    quotedEmpty: true
  }, function(err, csv) {
    if (err) console.log(err);

    cb(csv, err, numPhrases);
  });
}

//lacks in performance I believe. TODO better
function OriginalPhrases() {
  var translationJson;

  var smodName = cfg.game.smod; // "stonehearth.smod"
  var extension = cfg.game.extension; // ".smod'
  var languagePath = cfg.game.languagePath; // "/locales/en.json"

  var smodFiles = globule.find(smodName, { // "stonehearth.smod"
    srcBase: smodPath
  });

  if (smodFiles.length == 0) {
    log.Save('"' + smodName + '" file not found in ' + smodPath + ' directory (ERROR)');
    if (_.isEmpty(smodPath))
      log.Save('The game directory path is empty.');

    log.Save('End');
    // cb(log.Load(), null);
    return translationJson;
  }

  _.forEach(smodFiles, function(fileName) {
    var filePath = path.join(smodPath, fileName);
    var file = fs.readFileSync(filePath);

    var zip = new jszip();
    zip.load(file);
    var zipFile = fileName.slice(0, fileName.indexOf(extension)); // '.smod'
    zipFile += '/' + languagePath; // "locales/en.json"

    log.Save('Fetching ' + path.join(filePath, zipFile));
    var translations = zip.file(zipFile).asText();
    translationJson = JSON.parse(translations);
  });

  var numPhrases = _.keys(translationJson).length;
  log.Save('Original language JSON has ' + numPhrases + ' phrases');

  return translationJson;
}


/*** MODULE EXPORTS ***/
exports.ConfigFileUpdated = function(newCfg) { // when 'tasks/config.json' is updated.
  cfg = newCfg;
  sPath = cfg.game.basePath;
  smodPath = path.join(sPath, cfg.game.modsPath);
}

exports.GenerateOriginalCSV = function(outputPath, cb) { // './_dist/csv/s.original.csv'
  log.Reset();
  log.Save('Start');

  var originalPhrases = OriginalPhrases(); // { 'ok': 'OK', 'cancel': 'Cancel', 'load_game': 'Load Game', ..}
  if (_.isEmpty(originalPhrases)) {
    cb(log.Load(), null);
    return;
  }

  JSON2CSV(originalPhrases, function(csv) {
    //save csv
    fs.outputFile(outputPath, csv, function(err) {
      if (err) {
        console.log(err);
        log.Save('err: ' + err);
      } else log.Save('File saved: ' + path.resolve(outputPath));

      log.Save('End');
      cb(log.Load(), err);
    });
  });
}

exports.UpdateCSV = function(dir, cb) {
  log.Reset();
  log.Save('Start');

  var csvFiles = globule.find('*.csv', {
    srcBase: dir,
    prefixBase: true
  });

  if (csvFiles.length == 0) {
    log.Save(path.resolve(dir) + ' directory is empty. No file was processed');
    log.Save('End');
    cb(log.Load(), null);
    return;
  }

  var originalPhrases = OriginalPhrases();
  if (_.isEmpty(originalPhrases)) {
    cb(log.Load(), null);
    return;
  }

  async.eachSeries(csvFiles, function(filePath, callback) {
    filePath = path.resolve(filePath);
    log.Save('Reading: ' + filePath);

    UpdateCSV(filePath, originalPhrases, function(err) {
      if (err) {
        cb(log.Load(), err);
        return;
      }

      callback(); //async.eachSeries callback
    });
  }, function(err) {
    if (err) {
      log.Save('A file failed to process');
    } else {
      log.Save('All files have been processed successfully');
      log.Save('End');
      cb(log.Load(), null);
    }
  });
}

exports.ExportsToJson = function(dir, cb) {
  log.Reset();
  log.Save('Start');

  var csvFiles = globule.find('*.csv', {
    srcBase: dir,
    prefixBase: true
  });

  if (csvFiles.length == 0) {
    log.Save(path.resolve(dir) + ' directory is empty. No file was processed');
    log.Save('End');
    cb(log.Load(), null);
    return;
  }

  async.eachSeries(csvFiles, function(filePath, callback) {
    filePath = path.resolve(filePath);
    log.Save('Reading: ' + filePath);

    GenerateJSON(filePath, function(err) {
      if (err) {
        cb(log.Load(), err);
        return;
      }

      callback(); //async.eachSeries callback
    });
  }, function(err) {
    if (err) {
      log.Save('A file failed to process');
    } else {
      log.Save('All files have been processed successfully');
      log.Save('End');
      cb(log.Load(), null);
    }
  });
}
