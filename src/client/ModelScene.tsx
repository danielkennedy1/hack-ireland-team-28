import React, { useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface ModelSceneProps {
  position: [number, number, number];
  color: string;
  hoverColor: string;
  scale: number;
  modelPath?: string | null;
}

const ModelScene: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, modelPath }) => {
  const [hovered, setHovered] = useState(false);

  if (modelPath) {
    // Convert the file path to a static:// URL
    const staticUrl = `static://${modelPath.split('models/')[1]}`;
    const geometry = useLoader(STLLoader, staticUrl);

    return (
      <>
        <OrbitControls />
        <mesh
          position={position}
          scale={scale}
          geometry={geometry}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial color={hovered ? hoverColor : color} />
        </mesh>
      </>
    );
  }

  // Fallback cube when no model is loaded
  return (
    <>
      <OrbitControls />
      <mesh
        position={position}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry />
        <meshStandardMaterial color={hovered ? hoverColor : color} />
      </mesh>
    </>
  );
};

export default ModelScene;
