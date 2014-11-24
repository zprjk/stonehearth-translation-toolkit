var logs = [];

function debug(txt) {
  console.log(txt);
}

exports.Reset = function() {
  logs = [];
}

exports.Save = function(txt) {
  debug(txt);
  logs.push(txt);
}

exports.Load = function() {
  return logs;
}
