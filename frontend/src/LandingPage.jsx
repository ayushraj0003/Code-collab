import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const LandingPage = () => {
  const mountRef = useRef(null);
  const [displayText, setDisplayText] = useState("");
  const fullText = "Code Together. Build Together."; // Tagline text
  const typingSpeed = 100; // Speed of typing in milliseconds

  useEffect(() => {
    // Typing effect logic
    let index = 0;
    const type = () => {
      if (index < fullText.length) {
        setDisplayText((prev) => prev + fullText.charAt(index));
        index++;
        setTimeout(type, typingSpeed);
      }
    };
    type();

    // SCENE SETUP
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);

    // Set scene background color
    scene.background = new THREE.Color(0x1e1e1e);

    // LIGHT SETUP
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    // CREATING CUBES
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Create and add multiple cubes to the scene
    const cubes = [];
    for (let i = 0; i < 50; i++) {
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      scene.add(cube);
      cubes.push(cube);
    }

    // ANIMATE CUBES
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate and move each cube
      cubes.forEach((cube) => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        
        // Move the cube randomly in the scene
        cube.position.x += (Math.random() - 0.5) * 0.02;
        cube.position.y += (Math.random() - 0.5) * 0.02;
        cube.position.z += (Math.random() - 0.5) * 0.02;
      });

      // Render the scene with the updated camera
      renderer.render(scene, camera);
    };
    animate();

    // Set initial camera position
    camera.position.z = 10;

    // RESPONSIVENESS: Update camera and renderer on window resize
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // CLEANUP: Only remove DOM element if it exists and is still a child of mountRef
    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement.parentElement === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: "100vw", height: "100vh", position: "relative" }}
    >
      {/* HERO ELEMENT WITH TYPING EFFECT */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          fontSize: "48px",
          textShadow: "0px 0px 10px rgba(255,255,255,0.9)",
          zIndex: 1,
          fontFamily: "monospace",
        }}
      >
        {displayText}
        <span className="blinking-cursor">|</span>
      </div>

      {/* CALL TO ACTION BUTTON */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <button
          style={{
            padding: "12px 24px",
            backgroundColor: "#ff6347",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "18px",
            zIndex: 1,
          }}
        >
          Get Started
        </button>
      </div>

      {/* Blinking cursor CSS */}
      <style>{`
        .blinking-cursor {
          font-weight: 100;
          font-size: 48px;
          color: white;
          animation: blink 1s step-start infinite;
        }

        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
