import React, { useState, Suspense, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { BufferGeometry } from 'three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ModelSceneProps {
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

  useEffect(() => {
    if (geometry) {
      const box = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Rotate geometry so its highest axis is going up
      geometry = geometry.rotateX(Math.PI / 2);

      // Offset position so it sits on the grid
      geometry = geometry.translate(0, 0, -size.y / 2);

      // Snap grid to the bottom of the geometry
      grid.position.z = -size.y / 2;
    } else {
      grid.position.y = 0;
    }
  }, [geometry]);

  useEffect(() => {
    camera.position.set(0, 20, 5); // Adjust camera position for better perspective
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    geometry && (
      <group>
        <mesh
          position={position}
          rotation={[Math.PI / 2, 0, 0]} // Rotate the shape so the largest face faces down
          scale={scale}
          geometry={geometry}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial color={hovered ? hoverColor : color} />
        </mesh>
        {showGrid && <primitive object={grid} />}
      </group>
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

export const ModelScene: React.FC<ModelSceneProps> = props => {
  return (
    <>
      <OrbitControls />
      <Suspense fallback={<DefaultBox {...props} />}>
        <Model {...props} />
      </Suspense>
    </>
  );
};
