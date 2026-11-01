import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";
type FacePoint = readonly [number, number, number];

function getFaceWidth(y: number): number {
  const jaw = y < 0 ? 0.76 + ((y + 1.28) / 1.28) * 0.24 : 1;
  const crown = Math.sqrt(Math.max(0.08, 1 - (y / 1.37) ** 2));
  return 0.82 * jaw * crown;
}

function surfaceDepth(x: number, y: number): number {
  const width = Math.max(0.08, getFaceWidth(y));
  const u = THREE.MathUtils.clamp(x / width, -0.98, 0.98);
  const dome = 0.38 * Math.sqrt(Math.max(0.025, 1 - u * u));
  const bridge = 0.17 * Math.exp(-((x / 0.13) ** 2)) * Math.exp(-(((y + 0.02) / 0.53) ** 2));
  const cheek = 0.045 * Math.exp(-(((Math.abs(x) - 0.39) / 0.18) ** 2)) * Math.exp(-(((y + 0.14) / 0.3) ** 2));
  return dome + bridge + cheek;
}

function faceLandmarks(): FacePoint[] {
  const points: FacePoint[] = [];
  for (let index = 0; index < 17; index += 1) {
    const angle = Math.PI + (Math.PI * index) / 16;
    const x = 0.7 * Math.cos(angle);
    const y = -0.19 + 0.96 * Math.sin(angle);
    points.push([x, y, surfaceDepth(x, y) + 0.018]);
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const x = side * 0.32 + Math.cos(angle) * 0.17;
      const y = 0.28 + Math.sin(angle) * 0.067;
      points.push([x, y, surfaceDepth(x, y) + 0.022]);
    }
  }
  for (let index = 0; index < 5; index += 1) {
    const y = 0.42 - index * 0.14;
    points.push([0, y, surfaceDepth(0, y) + 0.028]);
  }
  for (let index = 0; index < 5; index += 1) {
    const angle = Math.PI * 0.14 + (Math.PI * 0.72 * index) / 4;
    const x = Math.cos(angle) * 0.13;
    const y = -0.2 + Math.sin(angle) * 0.055;
    points.push([x, y, surfaceDepth(x, y) + 0.025]);
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const x = Math.cos(angle) * 0.3;
    const y = -0.55 + Math.sin(angle) * 0.105;
    points.push([x, y, surfaceDepth(x, y) + 0.025]);
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const x = Math.cos(angle) * 0.19;
    const y = -0.55 + Math.sin(angle) * 0.04;
    points.push([x, y, surfaceDepth(x, y) + 0.03]);
  }
  for (let index = 0; index < 5; index += 1) {
    const x = -0.3 + index * 0.15;
    const y = 0.48 - Math.sin((Math.PI * index) / 4) * 0.055;
    points.push([x, y, surfaceDepth(x, y) + 0.022]);
  }
  return points;
}

function makeFaceGeometry(compact: boolean): THREE.BufferGeometry {
  const columns = compact ? 30 : 54;
  const rows = compact ? 34 : 62;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const indices: number[] = [];
  let offset = 0;
  for (let row = 0; row <= rows; row += 1) {
    const v = (row / rows) * 2 - 1;
    const y = v * 1.28;
    const width = getFaceWidth(y);
    for (let column = 0; column <= columns; column += 1) {
      const u = (column / columns) * 2 - 1;
      const x = u * width;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = surfaceDepth(x, y);
      offset += 3;
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWireGeometry(compact: boolean): THREE.BufferGeometry {
  const columns = compact ? 30 : 54;
  const rows = compact ? 34 : 62;
  const points: THREE.Vector3[] = [];
  for (let row = 2; row < rows; row += 4) {
    const y = ((row / rows) * 2 - 1) * 1.28;
    const width = getFaceWidth(y);
    for (let column = 0; column < columns; column += 1) {
      const x1 = (((column / columns) * 2) - 1) * width;
      const x2 = ((((column + 1) / columns) * 2) - 1) * width;
      points.push(new THREE.Vector3(x1, y, surfaceDepth(x1, y) + 0.004));
      points.push(new THREE.Vector3(x2, y, surfaceDepth(x2, y) + 0.004));
    }
  }
  for (let column = 2; column < columns; column += 4) {
    const u = (column / columns) * 2 - 1;
    for (let row = 0; row < rows; row += 1) {
      const y1 = ((row / rows) * 2 - 1) * 1.28;
      const y2 = (((row + 1) / rows) * 2 - 1) * 1.28;
      const x1 = u * getFaceWidth(y1);
      const x2 = u * getFaceWidth(y2);
      points.push(new THREE.Vector3(x1, y1, surfaceDepth(x1, y1) + 0.005));
      points.push(new THREE.Vector3(x2, y2, surfaceDepth(x2, y2) + 0.005));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function NeuralNetwork({ violet, compact }: { violet: string; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const count = compact ? 18 : 34;
    const coordinates = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.39996;
      const radius = 0.88 + (index % 5) * 0.105;
      coordinates[index * 3] = Math.cos(angle) * radius;
      coordinates[index * 3 + 1] = Math.sin(angle * 1.73) * 1.24;
      coordinates[index * 3 + 2] = 0.02 + (index % 4) * 0.055;
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(coordinates, 3));
    const links: THREE.Vector3[] = [];
    const linked = new Set<string>();
    for (let index = 0; index < count; index += 1) {
      const nearby = Array.from({ length: count }, (_, candidate) => candidate)
        .filter((candidate) => candidate !== index)
        .map((candidate) => {
          const dx = coordinates[index * 3] - coordinates[candidate * 3];
          const dy = coordinates[index * 3 + 1] - coordinates[candidate * 3 + 1];
          const dz = coordinates[index * 3 + 2] - coordinates[candidate * 3 + 2];
          return { candidate, distance: dx * dx + dy * dy + dz * dz };
        })
        .filter(({ distance }) => distance < 0.5)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 2);
      for (const { candidate } of nearby) {
        const key = [index, candidate].sort((left, right) => left - right).join(":");
        if (linked.has(key)) continue;
        linked.add(key);
        links.push(
          new THREE.Vector3(coordinates[index * 3], coordinates[index * 3 + 1], coordinates[index * 3 + 2]),
          new THREE.Vector3(coordinates[candidate * 3], coordinates[candidate * 3 + 1], coordinates[candidate * 3 + 2]),
        );
      }
    }
    const linkGeometry = new THREE.BufferGeometry().setFromPoints(links);
    return { pointGeometry, linkGeometry };
  }, [compact]);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.17) * 0.035;
  });
  return (
    <group ref={group}>
      <lineSegments geometry={points.linkGeometry}>
        <lineBasicMaterial color={violet} transparent opacity={0.28} />
      </lineSegments>
      <points geometry={points.pointGeometry}>
        <pointsMaterial color={violet} size={compact ? 0.035 : 0.043} transparent opacity={0.8} sizeAttenuation />
      </points>
    </group>
  );
}

function FaceModel({
  light,
  reducedMotion,
  compact,
  forensic,
}: {
  light: boolean;
  reducedMotion: boolean;
  compact: boolean;
  forensic: boolean;
}) {
  const face = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const violet = light ? "#7158d3" : "#a58bff";
  const cyan = light ? "#398bc0" : "#5edcf3";
  const geometry = useMemo(() => makeFaceGeometry(compact), [compact]);
  const wireGeometry = useMemo(() => makeWireGeometry(compact), [compact]);
  const landmarks = useMemo(faceLandmarks, []);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    if (face.current) {
      face.current.rotation.y = Math.sin(time * 0.28) * 0.12;
      face.current.rotation.x = Math.sin(time * 0.2) * 0.025;
    }
    if (beam.current) beam.current.position.y = Math.sin(time * 0.7) * 0.92;
  });
  return (
    <group>
      <NeuralNetwork violet={violet} compact={compact} />
      <group ref={face}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={light ? "#a6b8dd" : "#697eae"}
            emissive={light ? "#586fb0" : "#263d78"}
            emissiveIntensity={light ? 0.24 : 0.32}
            metalness={0.38}
            roughness={0.24}
            clearcoat={0.9}
            clearcoatRoughness={0.2}
            transparent
            opacity={light ? 0.88 : 0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments geometry={wireGeometry}>
          <lineBasicMaterial color={light ? "#354c78" : "#9dbbff"} transparent opacity={light ? (forensic ? 0.82 : 0.62) : (forensic ? 0.64 : 0.34)} />
        </lineSegments>
        <mesh position={[-0.315, 0.27, surfaceDepth(-0.315, 0.27) + 0.025]} scale={[0.16, 0.052, 0.035]}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshPhysicalMaterial color={light ? "#52617f" : "#25304d"} metalness={0.3} roughness={0.32} />
        </mesh>
        <mesh position={[0.315, 0.27, surfaceDepth(0.315, 0.27) + 0.025]} scale={[0.16, 0.052, 0.035]}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshPhysicalMaterial color={light ? "#52617f" : "#25304d"} metalness={0.3} roughness={0.32} />
        </mesh>
        <mesh position={[0, -0.1, surfaceDepth(0, -0.1) + 0.035]} scale={[0.075, 0.23, 0.06]}>
          <sphereGeometry args={[1, 18, 16]} />
          <meshPhysicalMaterial color={light ? "#9baed1" : "#8298c9"} metalness={0.25} roughness={0.3} />
        </mesh>
        {forensic && landmarks.map((point, index) => (
          <mesh key={index} position={point}>
            <sphereGeometry args={[index % 8 === 0 ? 0.023 : 0.015, 8, 8]} />
            <meshBasicMaterial color={index % 3 === 0 ? cyan : violet} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} position={[0, 0, 0.57]}>
        <planeGeometry args={[1.75, 0.012]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.16, 0, 0]} position={[0, 0, -0.16]}>
        <torusGeometry args={[1.55, 0.003, 4, 100]} />
        <meshBasicMaterial color={violet} transparent opacity={0.3} />
      </mesh>
      <pointLight position={[-2, 1.5, 2.4]} color={violet} intensity={light ? 2.3 : 2.8} distance={5} />
      <pointLight position={[2, -0.8, 1.8]} color={cyan} intensity={light ? 1.6 : 1.9} distance={4} />
    </group>
  );
}
export function FaceScanWebGL({ light, reducedMotion, compact, forensic, visible }: { light: boolean; reducedMotion: boolean; compact: boolean; forensic: boolean; visible: boolean }) {
  return (
    <Canvas dpr={compact ? 1 : [1, 1.35]} frameloop={visible && !reducedMotion ? "always" : "demand"} camera={{ position: [0, 0, 4.35], fov: 38 }} gl={{ alpha: true, antialias: !compact, powerPreference: "low-power" }} aria-hidden="true">
      <ambientLight intensity={light ? 1.2 : 0.78} />
      <FaceModel light={light} reducedMotion={reducedMotion} compact={compact} forensic={forensic} />
    </Canvas>
  );
}

