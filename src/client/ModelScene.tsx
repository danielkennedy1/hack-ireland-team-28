import React, { useState, Suspense, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { BufferGeometry } from 'three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ModelSceneProps {
  children?: React.ReactNode,
  position: [number, number, number];
  color: string;
  hoverColor: string;
  scale: number;
  geometry?: BufferGeometry;
  gridSize?: number;
  gridDivisions?: number;
  gridColor?: string;
  showGrid?: boolean;
}

const Model: React.FC<ModelSceneProps> = ({
  children,
  position,
  color,
  hoverColor,
  scale,
  geometry,
  gridSize,
  gridDivisions,
  gridColor,
  showGrid,
}) => {
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  camera.lookAt(0, 0, 0);

  const gridColorNum = parseInt(gridColor.replace('#', '0x'));
  const grid = new THREE.GridHelper(gridSize, gridDivisions, gridColorNum, gridColorNum);
  grid.position.set(0, 0, 0);
  grid.lookAt(0, 0, 0);

  return (
    (
      <group>
        <mesh
          scale={scale}
          geometry={geometry}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {children}
          <meshStandardMaterial color={hovered ? hoverColor : color} />
        </mesh>
        {showGrid && <primitive object={grid} />}
      </group>
    )
  );
};

export const ModelScene: React.FC<ModelSceneProps> = props => {
  return (
    <>
      <OrbitControls />
      <Model {...props}>
        {props.geometry ? "" : <boxGeometry args={[1, 1, 1]} />}
      </Model>
    </>
  );
};
