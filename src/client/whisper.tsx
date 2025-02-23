import React, { useEffect, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Status } from "./Status";

interface WhisperProps {
    setPrompt: (prompt: string) => void;
    status: Status;
    setStatus: (status: Status) => void;
}

export const Whisper = ({ setPrompt, status, setStatus }: WhisperProps) => {

    const { status: recordingStatus, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
        audio: true
    });

    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        if (recordingStatus === "recording") {
            setStatus(Status.RECORDING);
        } else if (recordingStatus === "stopped") {
            setStatus(Status.WAITING);
        } else if (recordingStatus === "idle") {
            setStatus(Status.IDLE);
        }
    }, [recordingStatus]);

    useEffect(() => {
        const onRecordingFinished = async () => {
            const blob = await fetch(mediaBlobUrl).then(b => b.blob());

            const reqBody = new FormData();
            reqBody.append("audio", blob);

            const response = await fetch("http://localhost:4000/transcribe", {
                method: "POST",
                body: reqBody,
            });

            const json = await response.json();
            if (response.status !== 200) {
                console.error(json["error"]);
                return;
            }

            console.log("Got transcript:", json["transcript"]);
            setTranscript(json["transcript"]);
            setPrompt(json["transcript"]);
        }

        if (mediaBlobUrl !== undefined) {
            onRecordingFinished();
        }
    }, [mediaBlobUrl, transcript]);

    const getButtonLabel = (status: Status) => {
        switch (status) {
            case Status.IDLE:
                return "Start recording";
            case Status.RECORDING:
                return "Stop recording";
            case Status.WAITING:
                return "Waiting for server";
            case Status.ERROR:
                return "Error";
            default:
                return "Unknown";
        }
    }

    return (
        <>
            <button
                style={{ 
                    position: "absolute", 
                    top: "0", 
                    left: "0", 
                    zIndex: 1000, 
                    marginLeft: "auto", 
                    marginRight: "auto", 
                    display: "block" 
                    }}
                disabled={status === Status.WAITING}
                onClick={status !== Status.RECORDING ? startRecording : stopRecording}>
                {getButtonLabel(status)}
            </button>
            <p
                style={{ "position": "absolute", "bottom": "0", "right": "0", color: "white", "backgroundColor": "transparent" }}
            >"{transcript}"</p>
        </>
    );
};
