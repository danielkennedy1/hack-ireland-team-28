import React, { useState, Suspense, useEffect } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { useLoader } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";
import { CONFIG } from "../electron/server/config";
import { useEffect } from "react";
import { BufferGeometry } from "three";

interface ModelSceneProps {
    position: [number, number, number];
    color: string;
    hoverColor: string;
    scale: number;
    modelPath?: string | null;
}

const Model: React.FC<ModelSceneProps> = ({ position, color, hoverColor, scale, modelPath }) => {
    const [hovered, setHovered] = useState(false);
    // Use the server URL to load the STL file
    const fullModelPath = modelPath ? `${CONFIG.SERVER_URL}/assets/${modelPath}` : `${CONFIG.SERVER_URL}/assets/3DBenchy.stl`;
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
    }, [fullModelPath]); // Depend on startLoading and fullModelPath

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
