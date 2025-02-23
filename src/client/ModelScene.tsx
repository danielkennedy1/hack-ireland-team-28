import React, { useState, Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import { BufferGeometry } from "three";
import { useThree } from "@react-three/fiber";

interface ModelSceneProps {
  position: [number, number, number];
  color: string;
  hoverColor: string;
  scale: number;
  geometry?: BufferGeometry;
}

const Model: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, geometry }) => {
  const [hovered, setHovered] = useState(false);

  const { camera } = useThree();

  camera.lookAt(0, 0, 0);

  return (
    geometry && (
      <mesh
        position={position}
        scale={scale}
        geometry={geometry}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={hovered ? hoverColor : color} />
      </mesh>
    )
  );
};

// Fallback component when model is loading or errored
const DefaultBox: React.FC<ModelSceneProps> = ({ position, scale, color, hoverColor }) => {
  return (
    <mesh scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </mesh>
  );
};


export const ModelScene: React.FC<ModelSceneProps> = (props) => {
    return (
        <>
            <OrbitControls />
            <Suspense fallback={<DefaultBox {...props} />}>
                <Model {...props} />
            </Suspense>
        </>
    );
};
