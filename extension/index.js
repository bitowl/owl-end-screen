"use strict";

const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

module.exports = function(nodecg) {
  const timecodes = nodecg.Replicant("timecodes", {
    defaultValue: [],
    persistent: true
  });

  nodecg.listenFor("mark-highlight", timecode => {
    if (timecode) {
      timecodes.value.push(timecode);
      console.log("mark-hightlight", timecode);
    }
  });
  nodecg.listenFor("generate-end-video", () => {
    console.log("generate-end-video");
    generateEndVideo();
    console.log(timecodes.value);
  });

  function generateEndVideo() {
    // TODO find the recording for the current stream

    const wholeVideo = 234;

    const highlightCount = timecodes.value.length;

    const duration = parseInt(wholeVideo / highlightCount);

    let completedHighlights = 0;

    for (let i = 0; i < highlightCount; i++) {
      const timecode = stringToTimecode(timecodes.value[i]);
      addSecondsToTimecode(timecode, -duration);
      cutOutHighlight(
        "/home/stream/Videos/2019-09-08 16-33-36.flv",
        `/tmp/highlight/test_${i}.flv`,
        timecodeToString(timecode),
        duration,
        () => {
          completedHighlights++;
          // TODO make thread-safe!!!!
          console.log(completedHighlights + "/" + highlightCount);
          if (completedHighlights === highlightCount) {
            console.log("Begin merging");
            // MERGE HIGHLIGHTS
            let highlights = [];
            for (let i = 0; i < highlightCount; i++) {
              highlights.push(`/tmp/highlight/test_${i}.flv`);
            }

            mergeHighlights(highlights, "/tmp/highlight/complete.flv", () => {
              console.log("Highlightvideo is ready");
            });
          }
        }
      );
    }
  }

  // 01:00:45.410
  // Timecodes are sent using the format: HH:MM:SS.mmm
  function stringToTimecode(str) {
    const parts = str.split(":");
    const parts2 = parts[2].split(".");
    return {
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1]),
      seconds: parseInt(parts2[0]),
      milliseconds: parseInt(parts2[1])
    };
  }

  function timecodeToString(timecode) {
    function fill(num, to = 10) {
      if (num < to) {
        return "0" + num;
      }
      return num;
    }
    return (
      fill(timecode.hours) +
      ":" +
      fill(timecode.minutes) +
      ":" +
      fill(timecode.seconds) +
      "." +
      fill(timecode.milliseconds, 100)
    );
  }

  function addSecondsToTimecode(timecode, seconds) {
    timecode.seconds += seconds;
    while (timecode.seconds >= 60) {
      timecode.seconds -= 60;
      timecode.minutes++;
    }
    while (timecode.seconds < 0) {
      timecode.seconds += 60;
      timecode.minutes--;
    }
    while (timecode.minutes >= 60) {
      timecode.minutes -= 60;
      timecode.hours++;
    }
    while (timecode.minutes < 0) {
      timecode.minutes += 60;
      timecode.hours--;
    }
    // return timecode;
  }

  function cutOutHighlight(
    sourceFile,
    outputFile,
    startTimestamp,
    duration,
    callback
  ) {
    const command = ffmpeg(sourceFile)
      .noAudio()
      .videoCodec("copy")
      .seekInput(startTimestamp)
      .duration(duration)
      /*      .on("stderr", function(stderrLine) {
              console.log("Stderr output: " + stderrLine);
            })
            .on("error", error => {
              console.error(error);
            })
            .on("progress", progress => {
              console.log(`Procressing ${progress.percent}% done`);
            })*/
      .on("end", () => {
        console.log("Finished processing the highlight");
        callback();
      })
      .save(outputFile);
  }

  function mergeHighlights(highlights, outputFile, callback) {
    const listFile = "/tmp/highlight/list.txt";

    let filenames = "";
    highlights.forEach((filename, index) => {
      filenames += "file " + filename + "\n";
    });
    fs.writeFileSync(listFile, filenames);

    const command = ffmpeg();
    command
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .noAudio()
      .videoCodec("copy")
      .on("end", () => {
        console.log("Merging finished");
        ffmpeg()
          .input("/tmp/highlight/without_sound.flv")
          .input("/home/stream/stream/see_you_next_time.mp3")
          .audioCodec("copy")
          .videoCodec("copy")
          .on("end", () => {
            console.log("Audio added");
            callback();
          })
          .save(outputFile);
      })
      .save("/tmp/highlight/without_sound.flv");
  }
};
