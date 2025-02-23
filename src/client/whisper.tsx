import React, { useEffect, useState } from "react";

import { useReactMediaRecorder } from "react-media-recorder";

interface WhisperProps { }

const Whisper = (props: WhisperProps) => {

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true
  });

  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    const onRecordingFinished = async () => {
      const blob = await fetch(mediaBlobUrl).then(b => b.blob());

      const reqBody = new FormData();
      reqBody.append("audio", blob);

      const response = await fetch("http://localhost:4000/transcribe", {
        method: "POST",
        // headers: {
        //   "Content-Type": "multipart/form-data",
        // },

        body: reqBody,
      });

      const json = await response.json();
      if (response.status !== 200) {
        console.error(json["error"]);
        return;
      }

      console.log("Got transcript:", json["transcript"]);
      setTranscript(json["transcript"]);
    }

    if (mediaBlobUrl !== undefined) {
      onRecordingFinished();
    }
  }, [mediaBlobUrl, transcript]);


  return (
    <>
      <button onClick={status !== "recording" ? startRecording : stopRecording}>{status !== "recording" ? "Start" : "Stop"} recording</button>
      <audio src={mediaBlobUrl} controls />
      <p>{transcript === "" ? "Record to get transcript" : transcript}</p>
    </>
  );
};

export default Whisper;
