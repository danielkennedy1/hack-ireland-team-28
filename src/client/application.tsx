import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import ModelScene from "./ModelScene";
import { CONFIG } from "../electron/server/config";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { BufferGeometry } from "three";

const Application = () => {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  // Create a ref to track mount status
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Whenever modelPath changes, ensure the ref is true for this effect instance
    isMountedRef.current = true;

    console.log("in useEffect: Model path:", modelPath);
    const fullModelPath = modelPath
      ? `${CONFIG.SERVER_URL}/assets/${modelPath}`
      : `${CONFIG.SERVER_URL}/assets/3DBenchy.stl`;
    console.log("in useEffect: Full model path:", fullModelPath);

    function loadModel() {
      console.log("Loading model:", fullModelPath);
      new STLLoader().load(fullModelPath, (geometry) => {
        console.log("Loaded geometry:", geometry);
        // Only update state if still mounted
        if (!isMountedRef.current) return;
        setGeometry(geometry);
      });
      console.log("oops");
    }

    console.log("oops 99");
    const timer = setTimeout(() => {
      console.log("Timer triggered: Loading model:", fullModelPath);
      loadModel();
    }, 500);
    console.log("Timer:", timer);

    // Cleanup: clear the timer and mark as unmounted for this effect instance
    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
    };
  }, [modelPath]);const values = useControls({
    x: {
        value: 0,
        min: -10,
        max: 10,
    },
    y: {
        value: 0,
        min: -10,
        max: 10,
    },
    z: {
        value: 0,
        min: -10,
        max: 10,
    },
    scale: {
        value: 0.1,
        min: 0.01,
        max: 1,
    },
    color: "yellow",
    hoverColor: "green",
  });

  const handleSubmit = async () => {
    setStatus("Checking server...");
    
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
      
      setStatus("Generating...");
      
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
      
      setStatus("Generated successfully!");
      setModelPath(data.file_saved); // Set the filename directly
    } catch (error) {
      console.error('Generation error:', error);
      setStatus(`Error: ${error.message}`);
    }
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px' }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your model description..."
            style={{ width: '300px', marginRight: '10px' }}
          />
          <button type="button" onClick={handleSubmit}>Generate Model</button>
        <p>{status}</p>
        {modelPath && <p>Model saved to: {modelPath}</p>}
      </div>

      <div style={{ flex: 1 }}>
        <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <ModelScene
            position={[values.x, values.y, values.z]}
            color={values.color}
            hoverColor={values.hoverColor}
            scale={values.scale}
            geometry={geometry}
          />
        </Canvas>
      </div>

      <Leva />
    </div>
  );
};

export default Application;
