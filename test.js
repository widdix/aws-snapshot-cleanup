function succeed(res) {
  "use strict";
  console.log("done", res);
  process.exit(0);
}

function fail(err) {
  "use strict";
  console.log("err", err);
  process.exit(1);
}

require("./index.js").handler({}, {functionName: "test", succeed: succeed, fail: fail});
