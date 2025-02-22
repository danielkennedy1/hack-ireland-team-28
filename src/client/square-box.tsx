import React, { useRef, useState, Suspense } from 'react'
import { MeshProps, useFrame, useLoader } from '@react-three/fiber'
import { STLLoader } from 'three-stdlib'

interface ModelProps extends MeshProps {
  color: string
  hoverColor: string
}

const Model = (props: ModelProps) => {
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  // Load the STL geometry
  const geometry = useLoader(
    STLLoader,
    'assets/3DBenchy.stl'
  )

  // Rotate the mesh each frame
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta
    }
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      scale={0.1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      {...props}
    >
      <meshStandardMaterial color={hovered ? props.hoverColor : props.color} />
    </mesh>
  )
}

// Wrap your Model in Suspense to handle async loading
const ModelScene = () => {
  return (
    <Suspense fallback={null}>
      <Model color="#888" hoverColor="#ff1050" />
    </Suspense>
  )
}

export default ModelScene
