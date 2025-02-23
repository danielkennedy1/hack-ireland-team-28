import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import vm from 'vm';

export function buildThreeJsSystemMessage(dimsText: string): string {
  return `
You are an expert 3D modeling assistant that creates sophisticated and realistic Three.js models.
Leverage, your context, training data, embeddings to generate relevant examples.

Use arithmetic formulas based on the geometry parameters to ensure spatial consistency between meshes.
Place smaller meshes relative to larger meshes. Avoid ever using numerical values over formulas.
Scale positions up by the size of the mesh geometry. Ensure opposites sides are aligned.
Remember to adjust the position of shapes by half their size, as their centres are on their corners.

RESPONSE FORMAT:
- Return ONLY valid JavaScript code
- No explanation text
- No markdown code blocks
- Code must define the final result as either 'mesh' or 'group' variable (especially for complex forms or multiple objects)

AVAILABLE COMPONENTS (no imports needed):
- Basic geometries: CylinderGeometry, BoxGeometry, SphereGeometry, ExtrudeGeometry, TorusGeometry, LatheGeometry
  - Decide based on the prompt dimensions and requested shape
- Materials: MeshPhysicalMaterial, MeshStandardMaterial, MeshPhongMaterial, MeshLambertMaterial, 
            MeshBasicMaterial, MeshToonMaterial, MeshNormalMaterial, ShaderMaterial
- Colors: Color
- Groups: Mesh, Group
- Core classes: Vector3, Matrix4, Quaternion, Shape, Curve, BufferGeometry
- Core classes: Vector3, Shape, Curve, BufferGeometry
- Additional curve classes: LineCurve, QuadraticBezierCurve, CubicBezierCurve, EllipseCurve
  - Use these with operations to create custom shapes
- WebGL utilities: WebGLRenderer (and access to its raw WebGL context via getContext())
- Math (including Math.sin, Math.cos, etc)
- CSG (for boolean operations, i.e putting a hole in a shape, or removing part of a shape)
- Math operations (Math.PI, etc)

Example valid response:
const baseGeometry = new CylinderGeometry(10, 10, 20, 32);
const material = new MeshPhysicalMaterial({ color: 0xcccccc });
const mesh = new Mesh(baseGeometry, material);
var scene = new THREE.Scene();
scene.add(mesh);

Your response should be similar - just the code, no explanation.
Bounding box (max size) should fit within: ${dimsText}
  `.trim();
}

export function runThreeJsCode(code: string): THREE.Object3D {
  // Prepare a sandbox that includes core THREE.js components plus WebGL-related classes and math.
  const sandbox: any = {
    THREE,
    mesh: undefined,
    group: undefined,
    // Core classes and geometries:
    Vector3: THREE.Vector3,
    Box3: THREE.Box3,
    BoxGeometry: THREE.BoxGeometry,
    CylinderGeometry: THREE.CylinderGeometry,
    SphereGeometry: THREE.SphereGeometry,
    ExtrudeGeometry: THREE.ExtrudeGeometry,
    TorusGeometry: THREE.TorusGeometry,
    LatheGeometry: THREE.LatheGeometry,
    BufferGeometry: THREE.BufferGeometry,
    // Additional curve classes:
    Path: THREE.Path,
    Curve: THREE.Curve,
    LineCurve: THREE.LineCurve,
    QuadraticBezierCurve: THREE.QuadraticBezierCurve,
    CubicBezierCurve: THREE.CubicBezierCurve,
    EllipseCurve: THREE.EllipseCurve,
    // Materials and groups:
    Mesh: THREE.Mesh,
    Group: THREE.Group,
    Scene: THREE.Scene,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
    ShaderMaterial: THREE.ShaderMaterial,
    RawShaderMaterial: THREE.RawShaderMaterial,
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    MeshLambertMaterial: THREE.MeshLambertMaterial,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    MeshToonMaterial: THREE.MeshToonMaterial,
    MeshNormalMaterial: THREE.MeshNormalMaterial,

    // Add these utility classes
    Matrix4: THREE.Matrix4,
    Quaternion: THREE.Quaternion,
    Color: THREE.Color,
    // Shape for complex forms:
    Shape: THREE.Shape,
    // Expose WebGLRenderer for advanced control (note: may need headless-gl in Node)
    WebGLRenderer: THREE.WebGLRenderer,
    // Expose Math to allow advanced math functions and custom curves:
    Math,
    // CSG library for boolean operations:
    CSG,
  };

  // Create a secure VM context with the sandbox.
  const context = vm.createContext(sandbox);

  // Wrap the user-provided code in an IIFE that returns mesh or group.
  const wrappedCode = `(function() {
    ${code}
    return typeof mesh !== 'undefined' ? mesh : (typeof group !== 'undefined' ? group : undefined);
  })()`;

  try {
    const result = vm.runInContext(wrappedCode, context);
    if (!result) {
      throw new Error("GPT snippet did not define 'mesh' or 'group'.");
    }
    return result;
  } catch (error) {
    console.error('Error in Three.js code execution:', error);
    throw error;
  }
}

export function extractDimensionsMm(prompt: string): number[] {
  const regex = /(\d+(?:\.\d+)?)\s*mm/gi;
  const dims: number[] = [];
  for (const match of prompt.toLowerCase().matchAll(regex)) {
    if (match[1]) {
      dims.push(parseFloat(match[1]));
    }
  }
  return dims;
}

export function buildDimsText(dims: number[]): string {
  let [x, y, z] = [10, 10, 10];
  if (dims.length === 1) {
    x = dims[0];
  } else if (dims.length === 2) {
    [x, y] = dims;
  } else if (dims.length >= 3) {
    [x, y, z] = dims;
  }
  return `Dimensions ~ [0,0,0] to [${Math.max(x, 1)}, ${Math.max(y, 1)}, ${Math.max(z, 1)}] in mm (approx).`;
}

export function extractCodeFromResponse(response: string): string {
  // Look for code between JavaScript code blocks
  const codeMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }
  // Fallback: remove natural language text and code fences
  const lines = response.split('\n');
  const codeLines = lines.filter(
    line =>
      !line.startsWith('To ') &&
      !line.startsWith('This ') &&
      !line.includes('```') &&
      line.trim().length > 0
  );
  return codeLines.join('\n');
}
