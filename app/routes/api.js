'use strict';

var path = require('path'),
  fs = require('fs-extra'),
  _ = require('lodash'),
  request = require('request');

var tasks = require('../tasks/index');
var cfg = require('../tasks/config'); //json
var pkg = require('../package.json');

exports.SaveGamePath = function(req, res) {
  var gamePath = req.body.gamePath;
  var file = path.resolve('./tasks/config.json');

  cfg.game.basePath = gamePath;
  tasks.ConfigFileUpdated(cfg);

  fs.outputJson(file, cfg, function(err) {
    if (err) {
      console.log(err);
      res.status(404).send(err);
    } else
      res.send(cfg); //200
  });
}


exports.LoadGamePath = function(req, res) {
  var cfgClone = _.cloneDeep(cfg); //I don't want change the real cfg because the SaveGamePath func saves the whole cfg(var) in 'config.json'
  cfgClone.dist.csv.basePath = path.resolve(cfgClone.dist.csv.basePath); //absolute path
  cfgClone.dist.json.basePath = path.resolve(cfgClone.dist.json.basePath); //absolute path
  res.send(cfgClone);
}

exports.LoadAppPackage = function(req, res) {
  res.send(pkg);
}


exports.CheckGitAppVersion = function(req, res) {
  var options = {
    uri: 'https://raw.githubusercontent.com/zprjk/stonehearth-translation-toolkit/master/app/package.json',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'zprjk/stonehearth-translation-toolkit'
    }
  };

  request(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var obj = JSON.parse(body);
      console.log("Git App Version: " + obj.version)
      res.send(obj.version);
    } else {
      res.status(404).send(body);
    }
  });
}

exports.Generate = function(req, res) {
  var outputPath = path.join(cfg.dist.csv.basePath, cfg.dist.csv.originalFileName); // '_dist/csv/s.original.csv'

  tasks.GenerateOriginalCSV(outputPath, function(logs, err) {
    if (err) {
      console.log(err);
      res.status(404).send(logs);
    } else {
      // console.log(log);
      res.send(logs);
    }
  });
}

exports.UpdateCSV = function(req, res) {
  var dir = cfg.dist.csv.basePath; // '_dist/csv'
  console.log(dir);
  tasks.UpdateCSV(dir, function(logs, err) {
    if (err) {
      console.log(err);
      res.status(404).send(logs);
    } else {
      res.send(logs);
    }
  });
}


exports.ExportsToJson = function(req, res) {
  var dir = cfg.dist.csv.basePath; // '_dist/csv'
  console.log(dir);
  tasks.ExportsToJson(dir, function(logs, err) {
    if (err) {
      console.log(err);
      res.status(404).send(logs);
    } else {
      res.send(logs);
    }
  });
}
