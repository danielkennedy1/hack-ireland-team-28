import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls, folder } from 'leva';
import { BufferGeometry } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { CONFIG } from '../electron/server/config';
import { Status } from './Status';
import { Whisper } from './whisper';
import { ModelScene } from './ModelScene';

const Application = () => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const fullModelPath = modelPath
      ? `${CONFIG.SERVER_URL}/assets/${modelPath}`
      : `${CONFIG.SERVER_URL}/assets/cube.stl`;

    function loadModel() {
      new STLLoader().load(fullModelPath, geometry => {
        // Only update state if still mounted
        setGeometry(geometry);
      });
    }

    const timer = setTimeout(() => {
      loadModel();
    }, 500);

    // Cleanup: clear the timer and mark as unmounted for this effect instance
    return () => {
      clearTimeout(timer);
    };
  }, [modelPath]);

  const values = useControls({
    color: '#ffff00',
    hoverColor: '#9090ff',
    grid: folder({
      showGrid: true,
      gridSize: { value: 10, min: 5, max: 50, step: 1 },
      gridDivisions: { value: 10, min: 2, max: 50, step: 1 },
      gridColor: '#ffffff',
    }),
  });

  useEffect(() => {
    if (prompt) {
      generateModel();
    }
  }, [prompt]);

  const generateModel = async () => {
    setStatus(Status.WAITING);

    try {
      // First check if server is accessible with proper fetch options
      const healthCheck = await fetch(CONFIG.SERVER_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!healthCheck.ok) {
        throw new Error('Server is not responding');
      }

      // Make the POST request directly instead of using the electron bridge
      const response = await fetch(`${CONFIG.SERVER_URL}/generate-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setStatus(Status.IDLE);
      setModelPath(data.file_saved); // Set the filename directly
    } catch (error) {
      console.error('Generation error:', error);
      setStatus(Status.ERROR);
      setErrMsg(error.message);
    }
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Whisper status={status} setStatus={setStatus} setPrompt={setPrompt}></Whisper>

      {status === Status.ERROR && <p style={{ color: 'red' }}>Error generating model: {errMsg} </p>}

      <div style={{ flex: 1 }}>
        <Canvas>
          <ambientLight intensity={0.1} />
          <pointLight position={[10, 10, 10]} intensity={0.3} />
          <ModelScene
            position={[0, 0, 0]}
            color={values.color}
            hoverColor={values.hoverColor}
            scale={0.1}
            geometry={geometry}
            showGrid={values.showGrid}
            gridSize={values.gridSize}
            gridDivisions={values.gridDivisions}
            gridColor={values.gridColor}
          />
        </Canvas>
      </div>

      <Leva />
    </div>
  );
};

export default Application;
