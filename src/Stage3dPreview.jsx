import React, { useEffect, useRef, useState } from "react";

async function loadThreeWithRetry(attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await import("three");
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  throw lastError;
}

export default function Stage3dPreview({ projection }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const dynamicGroupRef = useRef(null);
  const threeRef = useRef(null);
  const [fallback, setFallback] = useState("");

  const disposeObject = (object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return undefined;

    loadThreeWithRetry()
      .then((THREE) => {
        if (cancelled || !mountRef.current) return;
        threeRef.current = THREE;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#f8fafc");
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
        camera.position.set(0, 92, 112);
        camera.lookAt(0, 0, 0);

        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        } catch {
          setFallback("이 브라우저에서는 3D 미리보기를 사용할 수 없습니다.");
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(mount.clientWidth || 320, mount.clientHeight || 220);
        mount.replaceChildren(renderer.domElement);

        scene.add(new THREE.HemisphereLight("#ffffff", "#cbd5e1", 2.6));
        const directional = new THREE.DirectionalLight("#ffffff", 1.5);
        directional.position.set(30, 80, 40);
        scene.add(directional);

        const grid = new THREE.GridHelper(100, 10, "#94a3b8", "#cbd5e1");
        grid.position.y = -0.02;
        scene.add(grid);

        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(100, 100),
          new THREE.MeshStandardMaterial({ color: "#eef2ff", roughness: 0.9, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.08;
        scene.add(floor);

        const front = new THREE.Mesh(
          new THREE.BoxGeometry(100, 0.35, 1.2),
          new THREE.MeshStandardMaterial({ color: "#b91c1c" })
        );
        front.position.set(0, 0.25, -20);
        scene.add(front);

        const dynamicGroup = new THREE.Group();
        scene.add(dynamicGroup);
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        dynamicGroupRef.current = dynamicGroup;
        setFallback("");

        const handleResize = () => {
          const width = mount.clientWidth || 320;
          const height = mount.clientHeight || 220;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          renderer.render(scene, camera);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        renderer.render(scene, camera);
        renderer.domElement.dataset.ready = "true";
        renderer.domElement.dataset.movemap3d = "ready";
        renderer.domElement._movemapResize = handleResize;
      })
      .catch(() => {
        if (!cancelled) setFallback("3D 미리보기 모듈을 불러오지 못했습니다.");
      });

    return () => {
      cancelled = true;
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const mountNode = mountRef.current;
      const handleResize = renderer?.domElement?._movemapResize;
      if (handleResize) window.removeEventListener("resize", handleResize);
      if (scene) scene.traverse(disposeObject);
      renderer?.dispose?.();
      mountNode?.replaceChildren();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      dynamicGroupRef.current = null;
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const THREE = threeRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const dynamicGroup = dynamicGroupRef.current;
    if (!THREE || !scene || !camera || !renderer || !dynamicGroup) return;

    dynamicGroup.children.forEach(disposeObject);
    dynamicGroup.clear();
    projection.paths.forEach((path) => {
      const material = new THREE.LineBasicMaterial({ color: path.context === "next" ? "#64748b" : "#334155", transparent: true, opacity: 0.46 });
      const points = [
        new THREE.Vector3(path.from.x, 0.45, path.from.z),
        new THREE.Vector3(path.to.x, 0.45, path.to.z)
      ];
      dynamicGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    });
    projection.tokens.forEach((token) => {
      const material = new THREE.MeshStandardMaterial({ color: token.color, roughness: 0.58, metalness: 0.05 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(token.focused ? 2.6 : 2.1, 24, 16), material);
      mesh.position.set(token.point.x, token.focused ? 2.7 : 2.2, token.point.z);
      dynamicGroup.add(mesh);
    });
    renderer.render(scene, camera);
  }, [projection]);

  return (
    <div className="stage-3d-preview" ref={mountRef} aria-label="3D 대형 미리보기">
      {fallback && <div className="stage-3d-fallback" role="status">{fallback}</div>}
    </div>
  );
}
