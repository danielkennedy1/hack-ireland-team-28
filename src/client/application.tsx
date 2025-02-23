import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import ModelScene from "./ModelScene";
import {CONFIG} from "../electron/server/config";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { BufferGeometry } from "three";


const Application = () => {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [fullModelPath, setFullModelPath] = useState<string | null>(null);

  useEffect(() => {
    setFullModelPath( modelPath ? `${CONFIG.SERVER_URL}/assets/${modelPath}` : `${CONFIG.SERVER_URL}/assets/3DBenchy.stl`)
  }, [modelPath]);

  
    // Use the server URL to load the STL file
    // State to hold the loaded geometry
    const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

    // Effect to load the model when startLoading is true
    useEffect(() => {
        async function loadModel() {
            new STLLoader().load(fullModelPath, (geometry) => {
                console.log("Loaded geometry:", geometry);
                setGeometry(geometry);
            });
        }
        const timer = setTimeout(() => {
            console.log("Loading model:", fullModelPath);
            loadModel();
        }, 3000); // 3000 ms = 3 seconds
        return () => clearTimeout(timer);
    }, [fullModelPath]); // Depend on startLoading and fullModelPath

  const values = useControls({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your model description..."
            style={{ width: '300px', marginRight: '10px' }}
          />
          <button type="submit">Generate Model</button>
        </form>
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
