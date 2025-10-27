import type { Body } from 'matter-js'

export interface Drink {
  id: number
  body: Body
  radius: number
  color: string
  image: string
  level: number
  x: number
  y: number
  angle: number
}

export type DropEffect = 'consume'

export interface DropItem {
  id: number
  radius: number
  color: string
  image: string
  x: number
  y: number
  angle: number
  effect?: DropEffect
}