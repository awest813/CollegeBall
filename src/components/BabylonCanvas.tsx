/**
 * BabylonCanvas – a React component that owns the Babylon.js engine lifecycle.
 *
 * Responsibilities:
 *   • Creates a <canvas> and mounts a Babylon Engine + Scene
 *   • Handles resize events cleanly
 *   • Disposes everything on unmount (no memory leaks)
 *   • Exposes the Scene to children via a callback so scene-setup
 *     code lives in separate files (e.g. CourtScene)
 *
 * This replaces the third-party `babylonjs-hook` with a first-party
 * component we fully control.
 */

import { useEffect, useRef } from "react";
import { Engine, Scene } from "@babylonjs/core";

interface BabylonCanvasProps {
  /** Called once when the scene is ready. Set up meshes, lights, cameras here. */
  onSceneReady: (scene: Scene) => void;
  /** Called every frame before render. Drive animations / sync here. */
  onRender?: (scene: Scene) => void;
  className?: string;
}

export default function BabylonCanvas({
  onSceneReady,
  onRender,
  className,
}: BabylonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // Keep a ref to the latest onRender so the render loop always calls the
  // current version even though the render loop closure is only created once.
  const onRenderRef = useRef(onRender);
  onRenderRef.current = onRender;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // --- Engine ---
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    // --- Scene ---
    const scene = new Scene(engine);
    onSceneReady(scene);

    // --- Render loop ---
    engine.runRenderLoop(() => {
      onRenderRef.current?.(scene);
      if (scene.activeCamera) {
        scene.render();
      }
    });

    // --- Resize handler ---
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
    };
    // We intentionally run this effect only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", outline: "none", touchAction: "none" }}
    />
  );
}
