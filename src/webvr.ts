//

import * as THREE from "three";

// import { WEBVR } from './jsm/vr/WebVR.js';

export interface SphereSettings {
  xscale: number;
  yscale: number;
  xofs: number;
  yofs: number;
}

// import { WEBVR } from './jsm/vr/WebVR.js';

export class SimpleScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly root: THREE.Object3D;
  private readonly controller1: THREE.Group;
  private readonly controller2: THREE.Group;
  private hasVideo = false;
  private isSelecting: boolean;
  private isDragging: boolean;
  private dragPreviousPosition = { x: 0, y: 0 };

  public readonly renderer: THREE.WebGLRenderer;

  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.vr.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x505050);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      10 // dual stream にするならすごく遠くにする
    );

    this.root = new THREE.Object3D();
    this.root.position.set(0, 1.6, 0);
    this.scene.add(this.root);

    this.controller1 = this.renderer.vr.getController(0);
    this.controller1.addEventListener("selectstart", () => {
      this.onSelectStart();
    });
    this.controller1.addEventListener("selectend", () => {
      this.onSelectEnd();
    });
    this.scene.add(this.controller1);
    this.controller2 = this.renderer.vr.getController(1);
    this.controller2.addEventListener("selectstart", () => {
      this.onSelectStart();
    });
    this.controller2.addEventListener("selectend", () => {
      this.onSelectEnd();
    });
    this.scene.add(this.controller2);

    /*
    {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );
      const material = new THREE.LineBasicMaterial({
        vertexColors: undefined,
        blending: THREE.AdditiveBlending
      });
      this.controller1.add(new THREE.Line(geometry, material));
      this.controller2.add(new THREE.Line(geometry, material));
    }
    {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, -10, 0, 0, 10], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.0, 0.0, 0.0, 0.5, 0.0], 3)
      );
      const material = new THREE.LineBasicMaterial({
        vertexColors: undefined,
        blending: THREE.AdditiveBlending
      });
      this.scene.add(new THREE.Line(geometry, material));
    }
    */

    this.renderer.domElement.addEventListener("touchstart", (event): void => {
      this.onTouchStart(event);
      event.preventDefault();
    });
    this.renderer.domElement.addEventListener("touchend", (event): void => {
      this.onReleaseDrag();
      event.preventDefault();
    });
    this.renderer.domElement.addEventListener("touchmove", (event): void => {
      this.onTouchMove(event);
      event.preventDefault();
    });
    this.renderer.domElement.addEventListener("mousedown", (event): void => {
      this.onMouseDown(event);
    });
    this.renderer.domElement.addEventListener("mouseup", (): void => {
      this.onReleaseDrag();
    });
    this.renderer.domElement.addEventListener("mousemove", (event): void => {
      this.onMouseMove(event);
    });
  }

  public onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public setVideo(video: HTMLVideoElement, settings: SphereSettings): void {
    if (this.hasVideo) {
      return;
    }
    this.hasVideo = true;
    const videoTexture = new THREE.VideoTexture(video);
    const ofs = Math.PI * 0.05;
    const sphere = new THREE.SphereBufferGeometry(
      8.0, // dual stream にするならすごく遠くにする
      16, // width_segments
      16, // heights_segments
      Math.PI + ofs, // phiStart
      Math.PI - ofs * 2, // phiLength
      0, // thetaStart
      Math.PI // thetaLength
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        texture: {
          type: "t",
          value: videoTexture
        }
      },
      vertexShader: `
                varying vec3 vNormal;
                void main() {
            	    vNormal = normal;
                	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform sampler2D texture;
                varying vec3 vNormal;
                void main() {
                    vec2 uv = normalize(vNormal).xy * vec2(
                      ${0.5 * settings.xscale},
                      ${0.5 * settings.yscale}) 
                    + vec2(
                      ${0.5 + settings.xofs},
                      ${0.5 + settings.yofs});
                    vec3 color = texture2D(texture, uv).rgb;
                    gl_FragColor = vec4(color, 1);
            }
            `
    });
    material.side = THREE.DoubleSide;
    const sphereMesh = new THREE.Mesh(sphere, material);
    this.root.add(sphereMesh);

    this.renderer.setAnimationLoop(() => {
      //this.handleController(this.controller1);
      //this.handleController(this.controller2);
      this.renderer.render(this.scene, this.camera);
    });
  }

  private onSelectStart(): void {
    this.isSelecting = true;
  }

  private onSelectEnd(): void {
    this.isSelecting = false;
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.hasVideo) {
      return;
    }
    this.isDragging = true;
    this.dragPreviousPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.hasVideo) {
      return;
    }
    this.isDragging = true;
    this.dragPreviousPosition = { x: event.offsetX, y: event.offsetY };
  }

  private onReleaseDrag(): void {
    this.isDragging = false;
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isDragging) {
      this.rotateRootObject(
        event.touches[0].clientX - this.dragPreviousPosition.x,
        event.touches[0].clientY - this.dragPreviousPosition.y
      );
    }
    this.dragPreviousPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.rotateRootObject(
        event.offsetX - this.dragPreviousPosition.x,
        event.offsetY - this.dragPreviousPosition.y
      );
    }
    this.dragPreviousPosition = {
      x: event.offsetX,
      y: event.offsetY
    };
  }

  private eulerX = 0;
  private eulerY = 0;

  private rotateRootObject(x: number, y: number): void {
    this.eulerX += -y * 0.001;
    this.eulerY += -x * 0.001;
    /*
    const deltaQuaternion = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(
            -y * 0.01,
            -x * 0.01,
            0,
            'XYZ'));
    this.root.quaternion.multiplyQuaternions(deltaQuaternion, this.root.quaternion);
    */
    this.root.quaternion.setFromEuler(
      new THREE.Euler(this.eulerX, this.eulerY, 0, "XYZ")
    );
  }
}
