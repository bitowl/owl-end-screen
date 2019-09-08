"use strict";

module.exports = function(nodecg) {
  nodecg.listenFor("mark-highlight", () => {
    console.log("mark-hightlight");
  });
  nodecg.listenFor("generate-end-video", () => {
    console.log("generate-end-video");
    // TODO call ffmpeg
  });
};
