import React, { useState, Suspense } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { useLoader } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";

interface ModelSceneProps {
  position: [number, number, number];
  color: string;
  hoverColor: string;
  scale: number;
  modelPath?: string | null;
}

const Model: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, modelPath }) => {
  const [hovered, setHovered] = useState(false);
  // /Users/adambyrne/code/hack-ireland-team-28/src/assets/3DBenchy.stl
  const geometry = useLoader(STLLoader, modelPath || '../assets/3DBenchy.stl');

  return (
    <mesh
      position={position}
      scale={scale}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial color={hovered ? hoverColor : color} />
    </mesh>
  );
};

// Fallback component when model is loading or errored
const DefaultBox: React.FC<ModelSceneProps> = ({ position, scale, color, hoverColor }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Box
      position={position}
      scale={scale}
      args={[1, 1, 1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}


      
    >
      <meshStandardMaterial color={hovered ? hoverColor : color} />
    </Box>
  );
};

const ModelScene: React.FC<ModelSceneProps> = (props) => {
  return (
    <>
      <OrbitControls />
      <Suspense fallback={<DefaultBox {...props} />}>
        <Model {...props} />
      </Suspense>
    </>
  );
};

export default ModelScene;
