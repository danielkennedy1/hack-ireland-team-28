import React, { useState, Suspense } from "react";
import { OrbitControls, Box } from "@react-three/drei";
import { BufferGeometry } from "three";

interface ModelSceneProps {
    position: [number, number, number];
    color: string;
    hoverColor: string;
    scale: number;
    geometry?: BufferGeometry;
}

const Model: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, geometry }) => {
    const [hovered, setHovered] = useState(false);

    return (geometry &&
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
    return (
        <mesh
            scale={scale}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
            />
        </mesh>
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
