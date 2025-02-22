import React from "react";
import { Leva, useControls } from "leva";
import ScrollDragCanvas from "./ScrollDragCanvas";

interface ApplicationProps {}

const Application = (props: ApplicationProps) => {
  const values = useControls({
    x: {
        value: 0,
        min: -10,
        max: 10,
    },
    y: {
        value: -2,
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
    color: "#15F2F0",
    hoverColor: "#FF0081",
  });

 
  return (
    <>
      <Leva />
    <ScrollDragCanvas {...values}/>
    </>
  );
};

export default Application;
