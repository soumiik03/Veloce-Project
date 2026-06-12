"use client"

import { useEffect, useRef } from "react"

export default function NeuroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
    if (!gl) return

    const vsSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;
      void main() {
          vUv = .5 * (a_position + 1.);
          gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform float u_scroll_progress;
      vec2 rotate(vec2 uv, float th) {
          return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }
      float neuro_shape(vec2 uv, float t, float p) {
          vec2 sine_acc = vec2(0.);
          vec2 res = vec2(0.);
          float scale = 8.;
          for (int j = 0; j < 15; j++) {
              uv = rotate(uv, 1.);
              sine_acc = rotate(sine_acc, 1.);
              vec2 layer = uv * scale + float(j) + sine_acc - t;
              sine_acc += sin(layer) + 2.4 * p;
              res += (.5 + .5 * cos(layer)) / scale;
              scale *= (1.2);
          }
          return res.x + res.y;
      }
      void main() {
          vec2 uv = .5 * vUv;
          uv.x *= u_ratio;
          vec2 pointer = vUv - u_pointer_position;
          pointer.x *= u_ratio;
          float p = clamp(length(pointer), 0., 1.);
          p = .5 * pow(1. - p, 2.);
          float t = .001 * u_time;
          vec3 color = vec3(0.);
          float noise = neuro_shape(uv, t, p);
          noise = 1.2 * pow(noise, 3.);
          noise += pow(noise, 10.);
          noise = max(.0, noise - .5);
          noise *= (1. - length(vUv - .5));
          color = vec3(0.1, 0.2, 0.8);
          color += vec3(0.0, 0.1, 0.4) * sin(3.0 * u_scroll_progress + 1.5);
          color = color * noise;
          gl_FragColor = vec4(color, noise);
      }
    `

    const createShader = (glContext: WebGLRenderingContext, source: string, type: number) => {
      const shader = glContext.createShader(type)
      if (!shader) return null
      glContext.shaderSource(shader, source)
      glContext.compileShader(shader)
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        console.error(glContext.getShaderInfoLog(shader))
        glContext.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER)
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
      return
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(program, i)
      if (info) {
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
      }
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    gl.useProgram(program)
    const positionLocation = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const pointer = { x: 0, y: 0, tX: 0, tY: 0 }

    const updateMouse = (x: number, y: number) => {
      pointer.tX = x
      pointer.tY = y
    }

    const onPointerMove = (e: PointerEvent) => updateMouse(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.targetTouches[0]) {
        updateMouse(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
      }
    }
    const onClick = (e: MouseEvent) => updateMouse(e.clientX, e.clientY)

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("touchmove", onTouchMove)
    window.addEventListener("click", onClick)

    const resize = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * devicePixelRatio
      canvas.height = window.innerHeight * devicePixelRatio
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uniforms.u_ratio) {
        gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height)
      }
    }

    window.addEventListener("resize", resize)
    resize()

    let animationId: number
    const render = () => {
      const currentTime = performance.now()
      pointer.x += (pointer.tX - pointer.x) * 0.2
      pointer.y += (pointer.tY - pointer.y) * 0.2

      if (uniforms.u_time) {
        gl.uniform1f(uniforms.u_time, currentTime)
      }
      if (uniforms.u_pointer_position) {
        gl.uniform2f(uniforms.u_pointer_position, pointer.x / window.innerWidth, 1 - pointer.y / window.innerHeight)
      }
      if (uniforms.u_scroll_progress) {
        gl.uniform1f(uniforms.u_scroll_progress, window.pageYOffset / (2 * window.innerHeight))
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("click", onClick)
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="neuro"
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  )
}
