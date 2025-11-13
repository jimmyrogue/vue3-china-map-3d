import type * as THREE from 'three'

export interface RotatingPlane {
  mesh: THREE.Object3D
  speed: number
}

export interface PulsingHalo {
  mesh: THREE.Mesh
  speed: number
  min: number
  max: number
  opacityRange: [number, number]
  time: number
}

export interface WaterRipple {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  uniforms: {
    uTime: { value: number }
    uSpeed: { value: number }
    uWidth: { value: number }
    uOpacity: { value: number }
    uMaxRadius: { value: number }
    uColor: { value: THREE.Color }
  }
  timeScale: number
}

export type WaveMesh = THREE.Mesh & { _s: number, size: number }
