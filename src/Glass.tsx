import React, { useEffect, useRef } from 'react';

// Fine, regular soundwave contours respond gently to pointer movement.
// Kept off the CPU and capped at 24 fps; no camera pixels enter this canvas.
export function Glass({ color, paused }: { color: string; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;
  useEffect(() => {
    const element = canvas.current!;
    const gl = element.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}');
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec2 resolution; uniform float time; uniform vec3 tint; uniform vec2 pointer;
      void main(){
        vec2 uv=gl_FragCoord.xy/resolution;
        float wide=smoothstep(400.,1100.,resolution.x);
        float cycles=mix(1.6,3.2,wide);
        float envelope=pow(sin(uv.x*3.14159265),1.4);
        float amplitude=(.065+pointer.y*.025)*envelope;
        float ink=0.;
        for(int i=0;i<11;i++){
          float lane=float(i)-5.;
          float phase=uv.x*6.2831853*cycles-time*.38+lane*.12+pointer.x*.3;
          float wave=sin(phase)*amplitude+sin(phase*.5-time*.1)*amplitude*.24;
          float center=.44+lane*.017+wave;
          float distance=abs(uv.y-center)*resolution.y;
          float line=1.-smoothstep(.45,1.65,distance);
          ink+=line*(1.-abs(lane)*.09);
        }
        float alpha=clamp(ink,0.,1.)*.52*smoothstep(0.,.1,uv.x)*(1.-smoothstep(.9,1.,uv.x));
        gl_FragColor=vec4(tint*alpha,alpha);
      }`);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const resolution = gl.getUniformLocation(program,'resolution'), time = gl.getUniformLocation(program,'time'), tint = gl.getUniformLocation(program,'tint');
    const pointerUniform = gl.getUniformLocation(program, 'pointer');
    const target = { x: 0, y: 0 }, current = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      target.x = event.clientX / window.innerWidth * 2 - 1;
      target.y = 1 - event.clientY / window.innerHeight * 2;
    };
    const resetPointer = () => { target.x = 0; target.y = 0; };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, elapsed = 0, disposed = false;
    const draw = (now: number) => {
      if (disposed) return;
      frame=requestAnimationFrame(draw);
      if(now-last<1000/24 || document.hidden) return;
      const delta=Math.min(now-last,80); last=now;
      if(!motion.matches && !paused) elapsed+=delta/1000;
      const w=Math.max(1,Math.round(element.clientWidth)), h=Math.max(1,Math.round(element.clientHeight));
      if(element.width!==w||element.height!==h){element.width=w;element.height=h;gl.viewport(0,0,w,h);}
      if (!motion.matches && !paused) {
        current.x += (target.x-current.x)*.045;
        current.y += (target.y-current.y)*.045;
      }
      gl.uniform2f(pointerUniform, current.x, current.y);
      const hex=colorRef.current;
      gl.uniform3f(tint,parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
      gl.uniform2f(resolution,w,h);gl.uniform1f(time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
    };
    frame=requestAnimationFrame(draw);
    return () => { disposed=true;cancelAnimationFrame(frame);window.removeEventListener('pointermove',onPointer);document.removeEventListener('pointerleave',resetPointer);window.removeEventListener('blur',resetPointer);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment); };
  }, [paused]);
  return <canvas className="glass-surface" ref={canvas} aria-hidden="true" />;
}
