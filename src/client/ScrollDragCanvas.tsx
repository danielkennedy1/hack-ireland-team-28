import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import ModelScene from "./ModelScene";
import { MouseWheelInputEvent } from "electron/main";

interface ScrollDragCanvasProps {
    x: number;
    y: number;
    z: number;
    color: string;
    hoverColor: string;
    scale: number;
}

const ScrollDragCanvas = (props: ScrollDragCanvasProps) => {
    const canvasRef = useRef(null);

    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    const [rotation, setRotation] = useState<[number, number, number]>([-Math.PI / 2, 0, 0]);

    const [scale, setScale] = useState(props.scale);

    const handleMouseDown = (e: any) => {
        setLastMousePos({ x: e.clientX, y: e.clientY });
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: any) => {
        if (!isDragging) return;

        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;

        // Update the last mouse position
        setLastMousePos({ x: e.clientX, y: e.clientY });
        console.log(dy, dx);

        // Update the rotation
        setRotation([rotation[0] + (dy / document.body.clientHeight)*2, 0, rotation[2] + (dx / document.body.clientWidth)*2]);
    };

    const handleMouseUp = () => {
        // End dragging
        setIsDragging(false);
    };

    const handleWheel = (e: any) => {
        const zoomSpeed = 0.001;
        const newScale = scale + e.deltaY * zoomSpeed;

        setScale(Math.min(Math.max(newScale, 0.1), 5));
    };

    return (

        <Canvas
            style={{ height: "100vh", width: "100vw", position: "absolute", top: 0, left: 0, backgroundColor: "black" }}
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <ModelScene
                position={[props.x, props.y, props.z]}
                rotation={rotation}
                color={props.color}
                hoverColor={props.hoverColor}
                scale={scale}
            />
        </Canvas>
    )
}

export default ScrollDragCanvas;
