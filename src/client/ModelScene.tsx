import React, { useRef, useState, Suspense, useEffect } from 'react'
import { MeshProps, useLoader, useThree } from '@react-three/fiber'
import { STLLoader } from 'three-stdlib'

interface ModelProps extends MeshProps {
    x?: number
    y?: number
    z?: number
    scale?: number
    rotation?: [number, number, number]

    color: string
    hoverColor: string
}

const Model = (props: ModelProps) => {
    const mesh = useRef<THREE.Mesh>(null)
    const [hovered, setHover] = useState(false)
    const { gl, scene, camera } = useThree();

    // Load the STL geometry
    const geometry = useLoader(
        STLLoader,
        'assets/3DBenchy.stl'
    )

    useEffect(() => {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        console.log(dataUrl); // or send this to a server
    }, [])

    return (
        <mesh
            ref={mesh}
            geometry={geometry}
            scale={1 ** props.scale}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
            rotation={props.rotation}
            {...props}
        >
            <meshStandardMaterial color={hovered ? props.hoverColor : props.color} />
        </mesh>
    )
}

interface ModelSceneProps extends ModelProps { }

// Wrap your Model in Suspense to handle async loading
const ModelScene = (props: ModelSceneProps) => {
    return (
        <Suspense fallback={null}>
            <Model {...props} />
        </Suspense>
    )
}

export default ModelScene
