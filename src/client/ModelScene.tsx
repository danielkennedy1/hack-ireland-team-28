import React, { useState, Suspense, forwardRef, useImperativeHandle } from "react";
import { OrbitControls } from "@react-three/drei";
import { BufferGeometry } from "three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ModelSceneProps {
  ref: any;
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

const Model: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, geometry, gridSize, gridDivisions, gridColor, showGrid }) => {
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  camera.lookAt(0, 0, 0);

  const gridColorNum = parseInt(gridColor.replace('#', '0x'));
  const grid = new THREE.GridHelper(gridSize, gridDivisions, gridColorNum, gridColorNum);
  grid.position.set(0, 0, 0);
  grid.lookAt(0, 0, 0);

  return (
    (
      <mesh
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


export const ModelScene: React.FC<ModelSceneProps> = forwardRef((props, ref) => {
  const { camera, gl, scene } = useThree();

  const getCanvasImageDataURL = () => {
    gl.render(scene, camera);

    const aspect = window.innerWidth / window.innerHeight;

    const desiredWidth = 300;  // Pick whatever smaller dimensions you need
    const desiredHeight = desiredWidth / aspect; // while maintaining aspect ratio if needed

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = desiredWidth;
    tempCanvas.height = desiredHeight;

    const ctx = tempCanvas.getContext('2d');

    ctx.drawImage(gl.domElement, 0, 0, desiredWidth, desiredHeight);

    const dataUrl = tempCanvas.toDataURL('image/png');
    return dataUrl;
  }
  useImperativeHandle(ref, () => ({
    getCanvasImageDataURL: getCanvasImageDataURL
  }));
  return (
    <>
      <OrbitControls />
      {props.geometry ? <Model ref={ref} {...props} /> : null}
    </>
  );
});
