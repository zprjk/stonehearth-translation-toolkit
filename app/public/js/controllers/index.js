'use strict';

app.controller('indexCtrl', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {

  //INIT
  $scope.saveSucess = false;
  $scope.emptyDir = false;
  loadGamePath();
  loadAppPackage();

  //FUNCTIONS
  function loadGamePath() {
    $http.post('/api/loadgamepath').
    success(function(cfg) {
      console.log(cfg);
      var path = cfg.game.basePath;
      $scope.gamePath = path;
      $scope.emptyDir = path === '' ? true : false;

      $scope.cfg = cfg;

      CheckGitAppVersion(); //get app git verison
    }).
    error(function(data, status) {
      console.log(data, status);
    });
  }

  function loadAppPackage() {
    $http.post('/api/loadapppackage').
    success(function(pkg) {
      console.log(pkg);
      $scope.pkg = pkg;
    });
  }

  function CheckGitAppVersion() {
    $http.post('/api/checkgitappversion').
    success(function(version) {
      console.log("Git App Version: " + version);
      $scope.gitAppVersion = version;

      if($scope.pkg.version != version)
        $scope.versionWarning = true;
    });
  }


  $scope.SaveGamePath = function(newPath) {

    $http.post('/api/savegamepath', {
      gamePath: newPath
    }).
    success(function(cfg, status) {
      console.log(cfg);
      var path = cfg.game.basePath;

      $scope.gamePath = path;
      $scope.emptyDir = path === '' ? true : false;

      $scope.errorSaving = false;
      $scope.saveSucess = true;
      $timeout(function() {
        $scope.saveSucess = false;
      }, 1500);
    }).
    error(function(data, status, headers, config) {
      console.log(data, status);
      $scope.errorSaving = true;
    });
  }
}]);
