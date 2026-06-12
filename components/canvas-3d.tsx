"use client"

import { useEffect, useRef } from "react"

export default function Canvas3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let rx = 0
    let ry = 0
    let rz = 0
    let time = 0

    const t = (1 + Math.sqrt(5)) / 2
    const baseVertices = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ]

    const edges: [number, number][] = []
    for (let i = 0; i < baseVertices.length; i++) {
      for (let j = i + 1; j < baseVertices.length; j++) {
        const dx = baseVertices[i][0] - baseVertices[j][0]
        const dy = baseVertices[i][1] - baseVertices[j][1]
        const dz = baseVertices[i][2] - baseVertices[j][2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (Math.abs(dist - 2) < 0.1) {
          edges.push([i, j])
        }
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * (window.devicePixelRatio || 1)
      canvas.height = rect.height * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    }

    window.addEventListener("resize", resize)
    resize()

    const draw = () => {
      time += 0.005
      rx += 0.002
      ry += 0.003
      rz += 0.001

      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)

      ctx.clearRect(0, 0, width, height)

      const floatOffset = Math.sin(time * 2) * 12
      const rotated = baseVertices.map(([x, y, z]) => {
        let nx = x
        let ny = y
        let nz = z

        const cosX = Math.cos(rx)
        const sinX = Math.sin(rx)
        const y1 = ny * cosX - nz * sinX
        const z1 = ny * sinX + nz * cosX
        ny = y1
        nz = z1

        const cosY = Math.cos(ry)
        const sinY = Math.sin(ry)
        const x2 = nx * cosY + nz * sinY
        const z2 = -nx * sinY + nz * cosY
        nx = x2
        nz = z2

        const cosZ = Math.cos(rz)
        const sinZ = Math.sin(rz)
        const x3 = nx * cosZ - ny * sinZ
        const y3 = nx * sinZ + ny * cosZ
        nx = x3
        ny = y3

        const distance = 4.0
        const scale = Math.min(width, height) * 0.35
        const px = (nx * scale) / (nz + distance) + width / 2
        const py = (ny * scale) / (nz + distance) + height / 2 + floatOffset

        return { x: px, y: py, z: nz }
      })

      ctx.strokeStyle = "rgba(99, 102, 241, 0.12)"
      ctx.lineWidth = 1.5
      for (const [startIdx, endIdx] of edges) {
        const p1 = rotated[startIdx]
        const p2 = rotated[endIdx]
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      for (const p of rotated) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(129, 140, 248, 0.85)"
        ctx.fill()

        const glowSize = 12 + Math.sin(time * 4) * 4
        const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, glowSize)
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.25)")
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block bg-transparent"
    />
  )
}
