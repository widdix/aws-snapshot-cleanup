var globalConfig = require("./config.json");

// thirdparty modules
var async = require("neo-async");
var underscore = require("underscore");
var AWS = require("aws-sdk");

function getSnapshots(ec2, filters, cb) {
  "use strict";
  var snapshots = [];
  var nextToken = null;
  async.doWhilst(function(cb) {
    function loop() {
      ec2.describeSnapshots({
        "MaxResults": 1000,
        "Filters": filters,
        "NextToken": nextToken
      }, function(err, data) {
        if (err) {
          if (err.code === "RequestLimitExceeded") {
            console.log("Request limit exceeded. Pause for 5 seconds...");
            setTimeout(function() {
              loop();
            }, 5000);
          } else {
            cb(err);
          }
        } else {
          snapshots = snapshots.concat(data.Snapshots);
          nextToken = data.NextToken;
          cb();
        }
      });
    }
    loop();
  }, function() {
    return nextToken !== undefined;
  }, function(err) {
    if (err) {
      cb(err);
    } else {
      cb(null, snapshots);
    }
  });
}

function generateDates(oldest, youngest, maxSnapshots) {
  "use strict";
  var millisecondsBetweenYoungestAndOldest = youngest.getTime() - oldest.getTime();
  var distances = underscore.map(underscore.range(maxSnapshots), function(x) { return Math.pow(1.1, x)-1; });
  var largestDistance = underscore.last(distances);
  var distanceDivisor = largestDistance / millisecondsBetweenYoungestAndOldest;
  return underscore.map(distances, function(distance) { return new Date(youngest.getTime() - (distance / distanceDivisor)); }).reverse();
}
exports.generateDates = generateDates;

function extractSnapshots2cleanup(now, minSnapshots, maxSnapshots, minAgeInDays, maxAgeInDays, snapshots) {
  "use strict";
  var snapshots2keep = underscore.sortBy(snapshots, "StartTime"); // sort by time
  var snapshots2cleanup = [];

  if (maxAgeInDays !== undefined) {
    var maxDate = new Date(now - (maxAgeInDays * 24 * 60 * 60 * 1000));
    var tmp1 = underscore.partition(snapshots2keep, function(snapshot) { return snapshot.StartTime < maxDate; });
    snapshots2cleanup = tmp1[0];
    snapshots2keep = tmp1[1];
  }

  if (maxSnapshots !== undefined && snapshots2keep.length > maxSnapshots) {
    if (maxSnapshots < 2) {
      throw new Error("maxSnapshots >= 2");
    }
    var work;
    if (minAgeInDays !== undefined) {
      var minDate = new Date(now - (minAgeInDays * 24 * 60 * 60 * 1000));
      var tmp2 = underscore.partition(snapshots2keep, function(snapshot) { return snapshot.StartTime < minDate; });
      work = tmp2[0];
      snapshots2keep = tmp2[1];
    } else {
      work = snapshots2keep;
      snapshots2keep = [];
    }
    var oldest = underscore.first(work).StartTime;
    var youngest = underscore.last(work).StartTime;
    var dates = generateDates(oldest, youngest, maxSnapshots);
    var keep = [];
    dates.forEach(function(date) {
      var snapshotIndex = underscore.findLastIndex(work, function(snapshot) {
        return snapshot.StartTime <= date;
      });
      if (snapshotIndex !== -1) {
        keep.push(work[snapshotIndex]);
      }
    });
    keep = underscore.uniq(keep, function(snapshot) { return snapshot.SnapshotId; });
    snapshots2keep = snapshots2keep.concat(keep);
    snapshots2cleanup = snapshots2cleanup.concat(underscore.difference(work, keep));
  }

  if (minSnapshots !== undefined) {
    if (snapshots2keep.length < minSnapshots) {
      var missingSnapshots = minSnapshots - snapshots2keep.length;
      var snapshots2rescue = underscore.sortBy(snapshots2cleanup, "StartTime").reverse();
      snapshots2keep = snapshots2keep.concat(snapshots2rescue.slice(0, missingSnapshots));
      snapshots2cleanup = snapshots2rescue.slice(missingSnapshots);
    }
  }

  return snapshots2cleanup;
}
exports.extractSnapshots2cleanup = extractSnapshots2cleanup;

function cleanupSnapshotGroup(ec2, dryrun, minSnapshots, maxSnapshots, minAgeInDays, maxAgeInDays, snapshots, cb) {
  "use strict";
  var snapshots2cleanup = extractSnapshots2cleanup(Date.now(), minSnapshots, maxSnapshots, minAgeInDays, maxAgeInDays, snapshots);
  async.eachLimit(snapshots2cleanup, 1, function(snapshot, cb) {
    function loop() {
      ec2.deleteSnapshot({
        "SnapshotId": snapshot.SnapshotId,
        "DryRun": dryrun
      }, function(err) {
        if (err) {
          if (err.code === "RequestLimitExceeded") {
            console.log("Request limit exceeded. Pause for 5 seconds...");
            setTimeout(function() {
              loop();
            }, 5000);
          } else if (err.code === "InvalidSnapshot.NotFound") { // already deleted
            cb();
          } else {
            cb(err);
          }
        } else {
          cb();
        }
      });
    }
    loop();
  }, function(err) {
    if (err) {
      if (err.code === "DryRunOperation" && dryrun === true) {
        cb(null, {
          "count": snapshots.length,
          "keep": (snapshots.length - snapshots2cleanup.length),
          "cleanup": snapshots2cleanup.length
        });
      } else {
        cb(err);
      }
    } else {
      cb(null, {
        "count": snapshots.length,
        "keep": (snapshots.length - snapshots2cleanup.length),
        "cleanup": snapshots2cleanup.length
      });
    }
  });
}

function cleanup(ec2, dryrun, filters, rules, cb) {
  "use strict";
  getSnapshots(ec2, filters, function(err, snapshots) {
    if (err) {
      cb(err);
    } else {
      var snapshotGroups = underscore.groupBy(snapshots, "VolumeId");
      var reports = {};
      async.forEachOfLimit(snapshotGroups, 2, function(group, volumeId, cb) {
        var volumeConfig = rules[volumeId] || rules["*"];
        if (volumeConfig === undefined) {
          reports[volumeId] = {"skipped": true};
          return cb();
        }
        cleanupSnapshotGroup(ec2, dryrun, volumeConfig.minSnapshots, volumeConfig.maxSnapshots, volumeConfig.minAgeInDays, volumeConfig.maxAgeInDays, group, function(err, report) {
          if (err) {
            cb(err);
          } else {
            reports[volumeId] = report;
            cb();
          }
        });
      }, function(err) {
        if (err) {
          cb(err);
        } else {
          cb(null, reports);
        }
      });
    }
  });
}

exports.handler = function(event, context) {
  "use strict";
  console.log("handler()", event); 
  var ec2 = new AWS.EC2({
    region: event.region || globalConfig.region
  });
  var dryrun = true;
  if (globalConfig.dryrun !== undefined) {
    dryrun = globalConfig.dryrun;
  }
  if (event.dryrun !== undefined) {
    dryrun = event.dryrun;
  }
  cleanup(ec2, dryrun, event.filters || globalConfig.filters || [], event.rules || globalConfig.rules, function(err, reports) {
    if (err) {
      context.fail(err);
    } else {
      context.succeed(reports);
    }
  });
};
