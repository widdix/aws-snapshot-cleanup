var index = require("../index.js"),
  assert = require("assert");

var ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;


function createSnapshot(snapshotId, startTime) {
  return {
    "SnapshotId": snapshotId,
    "StartTime": startTime
  }
}

describe("extractSnapshots2cleanup", function() {
  it("no rules", function() {
    var now = Date.now();
    var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
    var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, undefined, undefined, undefined, snapshots);
    assert.equal(snapshots2cleanup.length, 0);
  });
  describe("maxAgeInDays", function() {
    it("nothing to delete", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, undefined, undefined, 7, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
    it("something to delete", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, undefined, undefined, 5, snapshots);
      assert.equal(snapshots2cleanup.length, 2);
      assert.equal(snapshots2cleanup[0].SnapshotId, "1");
      assert.equal(snapshots2cleanup[1].SnapshotId, "2");
    });
  });
  describe("minSnapshots + maxAgeInDays", function() {
    it("snapshots older than maxAgeInDays found, but would violate minSnapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 2, undefined, undefined, 5, snapshots);
      assert.equal(snapshots2cleanup.length, 1);
      assert.equal(snapshots2cleanup[0].SnapshotId, "1");
    });
    it("snapshots older than maxAgeInDays found, but would violate minSnapshots, with minSnapshots > snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 5, undefined, undefined, 5, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
    it("snapshots older than maxAgeInDays found, but would not violate minSnapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 1, undefined, undefined, 5, snapshots);
      assert.equal(snapshots2cleanup.length, 2);
      assert.equal(snapshots2cleanup[0].SnapshotId, "1");
      assert.equal(snapshots2cleanup[1].SnapshotId, "2");
    });
  });
  describe("maxSnapshots", function() {
    it("max 2 of 3 snapshot, don't touch the first and last one", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 2, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 1);
      assert.equal(snapshots2cleanup[0].SnapshotId, "2");
    });
    it("max 3 of 3 snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 3, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
    it("max 2 of 6 snapshots, don't touch the first and last one", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS))), createSnapshot("4", new Date(now - (3 * ONE_DAY_IN_MS))), createSnapshot("5", new Date(now - (2 * ONE_DAY_IN_MS))), createSnapshot("6", new Date(now - (1 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 2, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 4);
      assert.equal(snapshots2cleanup[0].SnapshotId, "2");
      assert.equal(snapshots2cleanup[1].SnapshotId, "3");
      assert.equal(snapshots2cleanup[2].SnapshotId, "4");
      assert.equal(snapshots2cleanup[3].SnapshotId, "5");
    });
    it("max 3 of 6 snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS))), createSnapshot("4", new Date(now - (3 * ONE_DAY_IN_MS))), createSnapshot("5", new Date(now - (2 * ONE_DAY_IN_MS))), createSnapshot("6", new Date(now - (1 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 3, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 3);
      assert.equal(snapshots2cleanup[0].SnapshotId, "2");
      assert.equal(snapshots2cleanup[1].SnapshotId, "4");
      assert.equal(snapshots2cleanup[2].SnapshotId, "5");
    });
    it("max 4 of 6 snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS))), createSnapshot("4", new Date(now - (3 * ONE_DAY_IN_MS))), createSnapshot("5", new Date(now - (2 * ONE_DAY_IN_MS))), createSnapshot("6", new Date(now - (1 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 4, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 2);
      assert.equal(snapshots2cleanup[0].SnapshotId, "3");
      assert.equal(snapshots2cleanup[1].SnapshotId, "5");
    });
    it("max 5 of 6 snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS))), createSnapshot("4", new Date(now - (3 * ONE_DAY_IN_MS))), createSnapshot("5", new Date(now - (2 * ONE_DAY_IN_MS))), createSnapshot("6", new Date(now - (1 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 5, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 1);
      assert.equal(snapshots2cleanup[0].SnapshotId, "5");
    });
    it("max 6 of 6 snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS))), createSnapshot("4", new Date(now - (3 * ONE_DAY_IN_MS))), createSnapshot("5", new Date(now - (2 * ONE_DAY_IN_MS))), createSnapshot("6", new Date(now - (1 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, undefined, 6, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
  });
  describe("minSnapshots + maxSnapshots", function() {
    it("max 2 of 3 snapshot, but would violate minSnapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 3, 2, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
    it("max 2 of 3 snapshot, but would violate minSnapshots, with minSnapshots > snapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 5, 2, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 0);
    });
    it("max 2 of 3 snapshot, but would not violate minSnapshots", function() {
      var now = Date.now();
      var snapshots = [createSnapshot("1", new Date(now - (6 * ONE_DAY_IN_MS))), createSnapshot("2", new Date(now - (5 * ONE_DAY_IN_MS))), createSnapshot("3", new Date(now - (4 * ONE_DAY_IN_MS)))];
      var snapshots2cleanup = index.extractSnapshots2cleanup(now + 1, 2, 2, undefined, undefined, snapshots);
      assert.equal(snapshots2cleanup.length, 1);
      assert.equal(snapshots2cleanup[0].SnapshotId, "2");
    });
  });
});
