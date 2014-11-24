'use strict';

app.controller('jsonCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.disabled = false; //btn bool disable

  $scope.ExportsToJson= function() {
    $scope.disabled = !$scope.disabled;
    $scope.logs = ['loading']; //log output

    $http.post('/api/exportstojson').
    success(function(logs) {
      console.log(logs);
      $scope.logs = logs;
      $scope.disabled = !$scope.disabled;
    }).
    error(function(logs, status) {
      console.log(logs, status);
      
      if(!angular.isArray(logs))
        logs = [logs];

      $scope.logs = logs;
      $scope.disabled = !$scope.disabled;
    });
  }
}]);
