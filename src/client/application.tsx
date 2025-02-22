import React from "react";
import { Canvas } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import ModelScene from "./ModelScene";

interface ApplicationProps {}

const Application = (props: ApplicationProps) => {
  const values = useControls({
    x: {
        value: 0,
        min: -10,
        max: 10,
    },
    y: {
        value: 0,
        min: -10,
        max: 10,
    },
    z: {
        value: 0,
        min: -10,
        max: 10,
    },
    scale: {
        value: 0.1,
        min: 0.01,
        max: 1,
    },
    color: "yellow",
    hoverColor: "green",
  });

  return (
    <>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <ModelScene
          position={[values.x, values.y, values.z]}
          color={values.color}
          hoverColor={values.hoverColor}
          scale={values.scale}
        />
      </Canvas>

      <Leva />
    </>
  );
};

export default Application;
