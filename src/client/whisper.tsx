import React, { useEffect, useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Status } from './Status';

interface WhisperProps {
  setPrompt: (prompt: string) => void;
  status: Status;
  setStatus: (status: Status) => void;
}

export const Whisper = ({ setPrompt, status, setStatus }: WhisperProps) => {
  const {
    status: recordingStatus,
    startRecording,
    stopRecording,
    mediaBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
  });

  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update status based on media recorder state
  useEffect(() => {
    if (recordingStatus === 'recording') {
      setStatus(Status.RECORDING);
    } else if (recordingStatus === 'stopped') {
      setStatus(Status.WAITING);
    } else if (recordingStatus === 'idle') {
      setStatus(Status.IDLE);
    }
  }, [recordingStatus, setStatus]);

  // Start timer when waiting for the server
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (status === Status.WAITING) {
      setElapsedTime(0); // Reset timer
      timerInterval = setInterval(() => {
        setElapsedTime(prev => prev + 0.1);
      }, 100);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [status]);

  // Send recording to server when available
  useEffect(() => {
    const onRecordingFinished = async () => {
      const blob = await fetch(mediaBlobUrl).then(b => b.blob());
      const reqBody = new FormData();
      reqBody.append('audio', blob);

      const response = await fetch('http://localhost:4000/transcribe', {
        method: 'POST',
        body: reqBody,
      });

      const json = await response.json();
      if (response.status !== 200) {
        console.error(json['error']);
        setStatus(Status.ERROR);
        return;
      }

      console.log('Got transcript:', json['transcript']);
      setTranscript(json['transcript']);
      setPrompt(json['transcript']);
      setStatus(Status.IDLE);
    };

    if (mediaBlobUrl) {
      onRecordingFinished();
    }
  }, [mediaBlobUrl, setPrompt, setStatus]);

  const getButtonLabel = (status: Status) => {
    switch (status) {
      case Status.IDLE:
        return 'Speak';
      case Status.RECORDING:
        return 'Stop';
      case Status.WAITING:
        return 'Sketching...';
      case Status.ERROR:
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Pulsing style applied to transcript when waiting
  const pulsingStyle = status === Status.WAITING ? { animation: 'pulse 1.0s infinite' } : {};

  return (
    <>
      {/* CSS for pulse animation and stylish button */}
      <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .stylish-button {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                    padding: 12px 20px;
                    font-size: 16px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                }
                .stylish-button:hover {
                    background-color: #45a049;
                    transform: scale(1.05);
                }
                .stylish-button:active {
                    transform: scale(0.95);
                }
            `}</style>
      <button
        className="stylish-button"
        disabled={status === Status.WAITING}
        onClick={status !== Status.RECORDING ? startRecording : stopRecording}
      >
        {getButtonLabel(status)}
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontFamily: 'Helvetica, sans-serif',
          fontSize: '24px',
          display: 'block',
          zIndex: 1000,
          ...pulsingStyle,
        }}
      >
        {status === Status.WAITING ? `${transcript} (${elapsedTime.toFixed(2)} sec)` : transcript}
      </div>
    </>
  );
};
