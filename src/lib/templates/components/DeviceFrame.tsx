import React from 'react'
import { BrowserFrame } from './BrowserFrame'
import { MobileFrame } from './MobileFrame'

export type DeviceType = 'browser' | 'mobile'

interface DeviceFrameProps {
  device: DeviceType
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  canvasWidth?: number
  canvasHeight?: number
}

export function DeviceFrame({ device, canvasWidth, canvasHeight, ...props }: DeviceFrameProps) {
  if (device === 'mobile') {
    let ratio = 0.5 // landscape default
    if (canvasWidth && canvasHeight) {
      if (canvasWidth === canvasHeight) {
        ratio = 0.33 // square
      } else if (canvasHeight > canvasWidth) {
        ratio = 0.42 // portrait
      }
    }
    const mobileWidth = Math.round(props.width * ratio)
    return <MobileFrame {...props} width={mobileWidth} />
  }
  return <BrowserFrame {...props} />
}
