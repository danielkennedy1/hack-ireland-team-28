import React, { useRef, useState, Suspense } from 'react'
import { MeshProps, useFrame, useLoader } from '@react-three/fiber'
import { STLLoader } from 'three-stdlib'

interface ModelProps extends MeshProps {
  x?: number
  y?: number
  z?: number
  scale?: number

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
      scale={1 ** props.scale}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      {...props}
    >
      <meshStandardMaterial color={hovered ? props.hoverColor : props.color} />
    </mesh>
  )
}

interface ModelSceneProps extends ModelProps {}

// Wrap your Model in Suspense to handle async loading
const ModelScene = (props: ModelSceneProps) => {
  return (
    <Suspense fallback={null}>
      <Model {...props}/>
    </Suspense>
  )
}

export default ModelScene
