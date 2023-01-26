const cubeCanvas = document.querySelector(".canvas");
if (cubeCanvas){

const regl = createREGL({
  canvas: cubeCanvas,
  attributes: {
    antialias: true,
    alpha: false,
  },
});
const { mat4, mat3, vec3 } = glMatrix;

let tick;

const play = (action) => {
  if (!tick) {
    tick = regl.frame(action);
  }
};

const stop = () => {
  if (tick) {
    tick.cancel();
    tick = null;
  }
};

const Texture = (regl, src) => {
  const texture = regl.texture();

  const image = new Image();

  image.src = src;

  image.onload = function () {
    texture({
      data: image,
      flipY: true,
      min: "mipmap",
    });
  };

  return texture;
};

const emptyTexture = regl.texture();

const CONTENT_CONFIG = {
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotation: 0,
  rotateX: 1,
  rotateY: 1,
  rotateZ: 1,
  scale: 1,
};

const contentDraw = regl({
  frag: `
    precision mediump float;
    #define GLSLIFY 1

    uniform vec2 u_resolution;
    uniform sampler2D u_texture;
    uniform int u_maskId;
    uniform int u_typeId;
    uniform sampler2D u_displacement;
    uniform sampler2D u_mask;
    uniform float u_tick;

    varying vec2 v_uv;

    const float PI2 = 6.283185307179586;

    const float PI = 3.141592653589793;
    const float PI2_0 = 6.28318530718;

    mat2 scale(vec2 value) {
      return mat2(value.x, 0.0, 0.0, value.y);
    }

    mat2 rotate2d(float value){
      return mat2(cos(value), -sin(value), sin(value), cos(value));
    }

    vec3 gradient1(vec2 st, float tick) {
      vec3 c1 = vec3(253.0/255.0, 142.0/255.0,  98.0/255.0);
      vec3 c2 = vec3(251.0/255.0,  83.0/255.0, 184.0/255.0);
      vec3 c3 = c2;
      vec3 c4 = vec3( 57.0/255.0,  15.0/255.0, 248.0/255.0);

      st.y = 1.0 - st.y;

      vec2 toCenter = vec2(0.55, 0.58) - st;
      float angle = atan(toCenter.y, toCenter.x) / PI;

      vec3 colorA = mix(c1, c2, smoothstep(0.0, 0.5, angle));

      st -= vec2(0.5);
      st *= scale(vec2(1.4));
      st *= rotate2d(-1.44);
      st += vec2(0.5);

      vec3 colorB = mix(c2, c3, smoothstep(0.3, 0.8, st.x));
      colorB = mix(colorB, c4, smoothstep(0.55, 1.0, st.x));

      return mix(colorA, colorB, smoothstep(0.28, 0.65, st.x));
    }

    vec3 gradient2(vec2 st, float tick) {
      vec3 c1 = vec3(1.0, 0.8, 0.2);
      vec3 c2 = vec3(0.92, 0.20, 0.14);

      st -= vec2(0.5);
      st *= scale(vec2(3.8));
      st *= rotate2d(tick * PI);
      st += vec2(0.5);

      return mix(c1, c2, st.x);
    }

    vec3 gradient3(vec2 st, float tick) {
      vec3 c1 = vec3(229.0/255.0, 255.0/255.0, 196.0/255.0);
      vec3 c2 = vec3(200.0/255.0, 255.0/255.0, 224.0/255.0);
      vec3 c3 = vec3(180.0/255.0, 255.0/255.0, 245.0/255.0);
      vec3 c4 = vec3(203.0/255.0, 223.0/255.0, 255.0/255.0);
      vec3 c5 = vec3(233.0/255.0, 201.0/255.0, 255.0/255.0);

      st -= vec2(0.5);
      st *= scale(vec2(1.2));
      st *= rotate2d(tick * (PI / 2.5));
      st += vec2(0.5);

      vec3 colorB = mix(c1, c2, smoothstep(0.0, 0.25, st.x));
      colorB = mix(colorB, c3, smoothstep(0.25, 0.5, st.x));
      colorB = mix(colorB, c4, smoothstep(0.5, 0.75, st.x));
      colorB = mix(colorB, c5, smoothstep(0.75, 1.0, st.x));

      return colorB;
    }

    vec3 gradients(int type, vec2 st, float tick) {
      if (type == 1) {
        return gradient1(st, tick);
      } else if (type == 2) {
        return gradient2(st, tick);
      } else if (type == 3) {
        return gradient3(st, tick);
      }
    }

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution;

      vec4 displacement = texture2D(u_displacement, st);

      vec2 direction = vec2(cos(displacement.r * PI2), sin(displacement.r * PI2));
      float length = displacement.g;

      vec2 newUv = v_uv;

      newUv.x += (length * 0.07) * direction.x;
      newUv.y += (length * 0.07) * direction.y;

      vec4 texture = texture2D(u_texture, newUv);
      float tick = u_tick * 0.009;

      vec3 color = gradients(u_typeId, v_uv, tick);

      texture.rgb = color + (texture.rgb * color);

      vec4 mask = texture2D(u_mask, st);

      int maskId = int(mask.r * 4.0 + mask.g * 2.0 + mask.b * 1.0);

      if (maskId == u_maskId) {
        gl_FragColor = vec4(texture.rgb, texture.a * mask.a);
      } else {
        discard;
      }
    }
  `,
  vert: `
    precision mediump float;
    #define GLSLIFY 1

    attribute vec3 a_position;
    attribute vec2 a_uv;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;

    varying vec2 v_uv;

    void main() {
      v_uv = a_uv;

      gl_Position = u_projection * u_view * u_world * vec4(a_position, 1);
    }
  `,
  attributes: {
    a_position: [
      [-1, -1, 0],
      [1, -1, 0],
      [1, 1, 0],
      [-1, 1, 0],
    ],
    a_uv: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  uniforms: {
    u_texture: regl.prop("texture"),
    u_typeId: regl.prop("typeId"),
    u_maskId: regl.prop("maskId"),
  },
  depth: {
    enable: true,
    mask: false,
    func: "less",
  },
  blend: {
    enable: true,
    func: {
      srcRGB: "src alpha",
      srcAlpha: 1,
      dstRGB: "one minus src alpha",
      dstAlpha: 1,
    },
    equation: {
      rgb: "add",
      alpha: "add",
    },
    color: [0, 0, 0, 0],
  },
  elements: [0, 1, 2, 0, 2, 3],
  count: 6,
});

const contentSetup = regl({
  context: {
    world: () => {
      const {
        translateX,
        translateY,
        translateZ,
        rotation,
        rotateX,
        rotateY,
        rotateZ,
        scale,
      } = CONTENT_CONFIG;

      const world = mat4.create();

      mat4.translate(world, world, [translateX, translateY, translateZ]);
      mat4.rotate(world, world, rotation, [rotateX, rotateY, rotateZ]);
      mat4.scale(world, world, [scale, scale, scale]);

      return world;
    },
    mask: (context, { mask }) => {
      return mask || emptyTexture;
    },
    displacement: (context, { displacement }) => {
      return displacement || emptyTexture;
    },
  },
  uniforms: {
    u_world: regl.context("world"),
    u_mask: regl.context("mask"),
    u_displacement: regl.context("displacement"),
    u_tick: regl.context("tick"),
  },
});

const content = (props) => {
  contentSetup(props, (context, { textures }) => {
    regl.clear({
      color: [0, 0, 0, 0],
      depth: 1,
    });

    contentDraw(textures);
  });
};

const ContentTypes = {
  GRADIENT: 1,
  RED: 2,
  BLUE: 3,
};

const emptyCube = regl.cube();

const CUBE_CONFIG = {
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotation: 0,
  rotateX: 1,
  rotateY: 1,
  rotateZ: 1,
  scale: 1,
  borderWidth: 0.008,
  displacementLength: 0.028,
  reflectionOpacity: 0.3,
  scene: 3,
};

const cube = regl({
  frag: `
    precision mediump float;
    #define GLSLIFY 1

    uniform vec2 u_resolution;
    uniform int u_face;
    uniform int u_typeId;
    uniform sampler2D u_texture;
    uniform samplerCube u_reflection;
    uniform float u_tick;
    uniform float u_borderWidth;
    uniform float u_displacementLength;
    uniform float u_reflectionOpacity;
    uniform int u_scene;

    varying vec3 v_normal;
    varying vec3 v_center;
    varying vec3 v_point;
    varying vec2 v_uv;
    varying vec3 v_color;
    varying float v_depth;

    const float PI2 = 6.283185307179586;

    float borders(vec2 uv, float strokeWidth) {
      vec2 borderBottomLeft = smoothstep(vec2(0.0), vec2(strokeWidth), uv);

      vec2 borderTopRight = smoothstep(vec2(0.0), vec2(strokeWidth), 1.0 - uv);

      return 1.0 - borderBottomLeft.x * borderBottomLeft.y * borderTopRight.x * borderTopRight.y;
    }

    const float PI2_0 = 6.28318530718;

    vec4 radialRainbow(vec2 st, float tick) {
      vec2 toCenter = vec2(0.5) - st;
      float angle = mod((atan(toCenter.y, toCenter.x) / PI2_0) + 0.5 + sin(tick * 0.002), 1.0);

      // colors
      vec4 c1 = vec4(229.0/255.0, 255.0/255.0, 196.0/255.0, 1.0);
      vec4 c2 = vec4(200.0/255.0, 255.0/255.0, 224.0/255.0, 1.0);
      vec4 c3 = vec4(180.0/255.0, 255.0/255.0, 245.0/255.0, 1.0);
      vec4 c4 = vec4(203.0/255.0, 223.0/255.0, 255.0/255.0, 1.0);
      vec4 c5 = vec4(233.0/255.0, 201.0/255.0, 255.0/255.0, 1.0);
      // vec4 a = vec4(0.43, 0.48, 0.95, 1.0);
      // vec4 b = vec4(0.94, 0.79, 0.41, 1.0);
      // // vec4 b = vec4(0.49, 0.88, 1.00, 1.0);
      // vec4 c = vec4(0.68, 0.29, 0.68, 1.0);
      // vec4 d = vec4(0.94, 0.79, 0.41, 1.0);
      // vec4 e = vec4(0.43, 0.48, 0.95, 1.0);

      float step = 1.0 / 10.0;

      vec4 color = c1;

      color = mix(color, c2, smoothstep(step * 1.0, step * 2.0, angle));
      color = mix(color, c1, smoothstep(step * 2.0, step * 3.0, angle));
      color = mix(color, c2, smoothstep(step * 3.0, step * 4.0, angle));
      color = mix(color, c3, smoothstep(step * 4.0, step * 5.0, angle));
      color = mix(color, c4, smoothstep(step * 5.0, step * 6.0, angle));
      color = mix(color, c3, smoothstep(step * 6.0, step * 7.0, angle));
      color = mix(color, c4, smoothstep(step * 7.0, step * 8.0, angle));
      color = mix(color, c5, smoothstep(step * 8.0, step * 9.0, angle));
      color = mix(color, c1, smoothstep(step * 9.0, step * 10.0, angle));

      return color;
    }

    mat2 scale(vec2 value){
      return mat2(value.x, 0.0, 0.0, value.y);
    }

    mat2 rotate2d(float value){
      return mat2(cos(value), -sin(value), sin(value), cos(value));
    }

    vec2 rotateUV(vec2 uv, float rotation) {
      float mid = 0.5;
      return vec2(
        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
      );
    }

    vec4 type1() {
      vec2 toCenter = v_center.xy - v_point.xy;
      float angle = (atan(toCenter.y, toCenter.x) / PI2) + 0.5;
      float displacement = borders(v_uv, u_displacementLength) + borders(v_uv, u_displacementLength * 2.143) * 0.3;

      return vec4(angle, displacement, 0.0, 1.0);
    }

    vec4 type2() {
      return vec4(v_color, 1.0);
    }

    vec4 type3() {
      vec2 st = gl_FragCoord.xy / u_resolution;

      vec4 strokeColor = radialRainbow(st, u_tick);
      float depth = clamp(smoothstep(-1.0, 1.0, v_depth), 0.6, 0.9);
      vec4 stroke = strokeColor * vec4(borders(v_uv, u_borderWidth)) * depth;

      vec4 texture;

      if (u_face == -1) {
        vec3 normal = normalize(v_normal);
        texture = textureCube(u_reflection, normalize(v_normal));

        texture.a *= u_reflectionOpacity * depth;
      }  else {
        texture = texture2D(u_texture, st);
      }

      if (stroke.a > 0.0) {
        return stroke - texture.a;
      } else {
        return texture;
      }
    }

    vec4 switchScene(int id) {
      if (id == 1) {
        return type1();
      } else if (id == 2) {
        return type2();
      } else if (id == 3) {
        return type3();
      }
    }

    void main() {
      if (u_scene == 3) {
        gl_FragColor = switchScene(u_typeId);
      } else {
        gl_FragColor = switchScene(u_scene);
      }
    }
  `,
  vert: `
    precision mediump float;
    #define GLSLIFY 1

    attribute vec3 a_position;
    attribute vec3 a_center;
    attribute vec2 a_uv;
    attribute vec3 a_color;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;

    varying vec3 v_normal;
    varying vec3 v_center;
    varying vec3 v_point;
    varying vec2 v_uv;
    varying vec3 v_color;
    varying float v_depth;

    void main() {
      vec4 center = u_projection * u_view * u_world * vec4(a_center, 1.0);
      vec4 position = u_projection * u_view * u_world * vec4(a_position, 1.0);

      v_normal = normalize(a_position);
      v_center = center.xyz;
      v_point = position.xyz;
      v_uv = a_uv;
      v_color = a_color;
      v_depth = (mat3(u_view) * mat3(u_world) * a_position).z;

      gl_Position = position;
    }
  `,
  context: {
    world: (context, { matrix }) => {
      const {
        translateX,
        translateY,
        translateZ,
        rotation,
        rotateX,
        rotateY,
        rotateZ,
        scale,
      } = CUBE_CONFIG;

      const world = mat4.create();

      mat4.translate(world, world, [translateX, translateY, translateZ]);
      mat4.rotate(world, world, rotation, [rotateX, rotateY, rotateZ]);
      mat4.scale(world, world, [scale, scale, scale]);

      if (matrix) {
        mat4.multiply(world, world, matrix);
      }

      return world;
    },
    face: (context, { cullFace }) => {
      return cullFace === CubeFaces.FRONT ? -1 : 1;
    },
    texture: (context, { texture }) => {
      return texture || emptyTexture;
    },
    reflection: (context, { reflection }) => {
      return reflection || emptyCube;
    },
    textureMatrix: (context, { textureMatrix }) => {
      return textureMatrix;
    },
    borderWidth: () => {
      const { borderWidth } = CUBE_CONFIG;

      return borderWidth;
    },
    displacementLength: () => {
      const { displacementLength } = CUBE_CONFIG;

      return displacementLength;
    },
    reflectionOpacity: () => {
      const { reflectionOpacity } = CUBE_CONFIG;

      return reflectionOpacity;
    },
    scene: () => {
      const { scene } = CUBE_CONFIG;

      return parseFloat(scene);
    },
  },
  attributes: {
    a_position: [
      [-1, +1, +1],
      [+1, +1, +1],
      [+1, -1, +1],
      [-1, -1, +1], // front face
      [+1, +1, +1],
      [+1, +1, -1],
      [+1, -1, -1],
      [+1, -1, +1], // right face
      [+1, +1, -1],
      [-1, +1, -1],
      [-1, -1, -1],
      [+1, -1, -1], // back face
      [-1, +1, -1],
      [-1, +1, +1],
      [-1, -1, +1],
      [-1, -1, -1], // left face
      [-1, +1, -1],
      [+1, +1, -1],
      [+1, +1, +1],
      [-1, +1, +1], // top face
      [-1, -1, -1],
      [+1, -1, -1],
      [+1, -1, +1],
      [-1, -1, +1], // bottom face
    ],
    a_center: [
      [0, 0, 1], // front face
      [1, 0, 0], // right face
      [0, 0, -1], // back face
      [-1, 0, 0], // left face
      [0, 1, 0], // top face
      [0, -1, 0], // bottom face
    ].map((c) => {
      return [c, c, c, c];
    }),
    a_uv: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // front face
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // right face
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // back face
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // left face
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // top face
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1], // bottom face
    ],
    a_color: [
      [0, 1, 0], // front face => mask 2
      [0, 0, 1], // right face => mask 1
      [1, 0, 0], // back face => mask 4
      [1, 1, 0], // left face => mask 6
      [1, 0, 1], // top face => mask 5
      [0, 1, 1], // bottom face => mask 3
    ].map((c) => {
      return [c, c, c, c];
    }),
  },
  uniforms: {
    u_world: regl.context("world"),
    u_face: regl.context("face"),
    u_typeId: regl.prop("typeId"),
    u_texture: regl.context("texture"),
    u_reflection: regl.context("reflection"),
    u_tick: regl.context("tick"),
    u_borderWidth: regl.context("borderWidth"),
    u_displacementLength: regl.context("displacementLength"),
    u_reflectionOpacity: regl.context("reflectionOpacity"),
    u_scene: regl.context("scene"),
  },
  cull: {
    enable: true,
    face: regl.prop("cullFace"),
  },
  depth: {
    enable: true,
    mask: false,
    func: "less",
  },
  blend: {
    enable: true,
    func: {
      srcRGB: "src alpha",
      srcAlpha: 1,
      dstRGB: "one minus src alpha",
      dstAlpha: 1,
    },
    equation: {
      rgb: "add",
      alpha: "add",
    },
    color: [0, 0, 0, 0],
  },
  elements: [
    [2, 1, 0],
    [2, 0, 3], // front face
    [6, 5, 4],
    [6, 4, 7], // right face
    [10, 9, 8],
    [10, 8, 11], // back face
    [14, 13, 12],
    [14, 12, 15], // left face
    [18, 17, 16],
    [18, 16, 19], // top face
    [20, 21, 22],
    [23, 20, 22], // bottom face
  ],
  count: 36,
  framebuffer: regl.prop("fbo"),
});

const CubeTypes = {
  DISPLACEMENT: 1,
  MASK: 2,
  FINAL: 3,
};

const CubeFaces = {
  BACK: "back",
  FRONT: "front",
};

const CubeMasks = {
  M1: 1,
  M2: 2,
  M3: 3,
  M4: 4,
  M5: 5,
  M6: 6,
};

const CAMERA_CONFIG = {
  fov: 35,
  near: 0.01,
  far: 1000,
};

const cameraConfig = {
  eye: [0, 0, 6],
  target: [0, 0, 0],
  up: [0, 1, 0],
};

const camera = regl({
  context: {
    projection: ({ viewportWidth, viewportHeight }) => {
      const { fov, near, far } = CAMERA_CONFIG;
      const fovy = (fov * Math.PI) / 180;
      const aspect = viewportWidth / viewportHeight;

      return mat4.perspective([], fovy, aspect, near, far);
    },

    view: (context, props) => {
      const config = Object.assign({}, cameraConfig, props);

      const { eye, target, up } = config;

      return mat4.lookAt([], eye, target, up);
    },

    fov: () => {
      const { fov } = CAMERA_CONFIG;

      return fov;
    },
  },

  uniforms: {
    u_projection: regl.context("projection"),
    u_view: regl.context("view"),
    u_cameraPosition: regl.context("eye"),
    u_resolution: ({ viewportWidth, viewportHeight }) => {
      return [viewportWidth, viewportHeight];
    },
  },
});

const plane = regl({
  vert: `
    precision mediump float;
    #define GLSLIFY 1

    uniform sampler2D u_texture;

    varying vec4 vUv;

    void main() {
      gl_FragColor = texture2DProj(u_texture, vUv);
    }
  `,
  frag: `
    precision mediump float;
    #define GLSLIFY 1

    attribute vec3 a_position;

    uniform mat4 u_textureMatrix;
    uniform mat4 u_world;

    varying vec4 vUv;

    void main() {
      vUv = u_textureMatrix * vec4(a_position, 1.0);

      gl_Position = u_world * vec4(a_position, 1.0);
    }
  `,
  attributes: {
    a_position: [
      [-1, 1, 0],
      [1, -1, 0],
      [-1, -1, 0],
      [-1, 1, 0],
      [1, 1, 0],
      [1, -1, 0],
    ],
  },
  context: {
    world: (context, { uvRotation }) => {
      const world = mat4.create();

      mat4.rotate(world, world, uvRotation, [0, 0, 1]);

      return world;
    },
  },
  uniforms: {
    u_world: regl.context("world"),
    u_texture: regl.prop("texture"),
    u_textureMatrix: regl.prop("textureMatrix"),
  },
  count: 6,
});

const reflector = regl({
  frag: `
    precision mediump float;
    #define GLSLIFY 1

    uniform vec2 u_resolution;
    uniform sampler2D u_texture;
    uniform float u_depthOpacity;

    varying vec2 v_uv;
    varying float v_z;

    mat2 scale(vec2 scale){
      return mat2(scale.x, 0.0, 0.0, scale.y);
    }

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution;

      vec4 texture = texture2D(u_texture, v_uv);

      texture.a -= u_depthOpacity * v_z;

      gl_FragColor = texture;
    }
  `,
  vert: `
    precision mediump float;
    #define GLSLIFY 1

    attribute vec3 a_position;
    attribute vec2 a_uv;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;
    uniform vec2 u_viewport;

    varying vec2 v_uv;
    varying float v_z;

    void main() {
      v_uv = a_uv;
      v_z = 1.0 - (mat3(u_view) * mat3(u_world) * a_position).z;

      gl_Position = u_projection * u_view * u_world * vec4(a_position, 1);
    }
  `,
  context: {
    world: (
      { viewportWidth, viewportHeight },
      { cameraConfig: mainCameraConfig, fov }
    ) => {
      const fovy = (fov * Math.PI) / 180;
      const aspect = viewportWidth / viewportHeight;
      const cameraHeight = Math.tan(fovy / 2) * mainCameraConfig.eye[2];
      const cameraWidth = cameraHeight * aspect;

      const world = mat4.create();

      mat4.scale(world, world, [cameraWidth, cameraHeight, 1.0]);

      return world;
    },
    depthOpacity: () => {
      const depthOpacity = 0.75;

      return depthOpacity;
    },
  },
  attributes: {
    a_position: [
      [-1, -1, 0],
      [1, -1, 0],
      [1, 1, 0],
      [-1, 1, 0],
    ],
    a_uv: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  uniforms: {
    u_world: regl.context("world"),
    u_texture: regl.prop("texture"),
    u_depthOpacity: regl.context("depthOpacity"),
  },
  depth: {
    enable: true,
    mask: false,
    func: "less",
  },
  blend: {
    enable: true,
    func: {
      srcRGB: "src alpha",
      srcAlpha: 1,
      dstRGB: "one minus src alpha",
      dstAlpha: 1,
    },
    equation: {
      rgb: "add",
      alpha: "add",
    },
    color: [0, 0, 0, 0],
  },
  elements: [0, 1, 2, 0, 2, 3],
  count: 6,
});

const planes = [
  {
    position: [1, 0, 0],
    normal: [1, 0, 0],
    rotation: -Math.PI * 0.5,
    axis: [0, 1, 0],
    uvRotation: Math.PI,
  },
  {
    position: [-1, 0, 0],
    normal: [-1, 0, 0],
    rotation: Math.PI * 0.5,
    axis: [0, 1, 0],
    uvRotation: Math.PI,
  },
  {
    position: [0, 1, 0],
    normal: [0, 1, 0],
    rotation: Math.PI * 0.5,
    axis: [1, 0, 0],
    uvRotation: 0,
  },
  {
    position: [0, -1, 0],
    normal: [0, -1, 0],
    rotation: -Math.PI * 0.5,
    axis: [1, 0, 0],
    uvRotation: 0,
  },
  {
    position: [0, 0, 1],
    normal: [0, 0, 1],
    rotation: Math.PI,
    axis: [0, 1, 0],
    uvRotation: Math.PI,
  },
  {
    position: [0, 0, -1],
    normal: [0, 0, -1],
    rotation: 0,
    axis: [0, 1, 0],
    uvRotation: Math.PI,
  },
];

const renderTarget = regl.framebuffer();

const reflect = (a, b) => {
  const dot2 = new Array(3);

  dot2.fill(2 * vec3.dot(b, a));

  return vec3.sub([], a, vec3.mul([], dot2, b));
};

const reflectionSetup = regl({
  context: {
    config: (
      context,
      { cameraConfig: mainCameraConfig, rotationMatrix },
      batchId
    ) => {
      const { position, normal, rotation, axis } = planes[batchId];

      const planeMatrix = mat4.translate([], rotationMatrix, position);
      const normalMatrix = mat4.translate([], rotationMatrix, normal);

      mat4.rotate(planeMatrix, planeMatrix, rotation, axis);

      const planeWorldPosition = mat4.getTranslation([], planeMatrix);
      const planeWorldNormal = mat4.getTranslation([], normalMatrix);
      const cameraWorldPosition = mainCameraConfig.eye;

      let eye = [0, 0, 0];
      vec3.sub(eye, planeWorldPosition, cameraWorldPosition);
      eye = reflect(eye, planeWorldNormal);
      vec3.negate(eye, eye);
      vec3.add(eye, eye, planeWorldPosition);

      const lookAtPosition = [0, 0, -1];
      vec3.add(lookAtPosition, lookAtPosition, cameraWorldPosition);

      let target = [0, 0, 0];
      vec3.sub(target, planeWorldPosition, lookAtPosition);
      target = reflect(target, planeWorldNormal);
      vec3.negate(target, target);
      vec3.add(target, target, planeWorldPosition);

      let up = [0, 1, 0];
      up = reflect(up, planeWorldNormal);

      const cameraConfig = {
        eye,
        target,
        up,
      };

      return {
        cameraConfig,
        planeMatrix,
      };
    },
    uvRotation: (context, props, batchId) => {
      const { uvRotation } = planes[batchId];

      return uvRotation;
    },
    faceFbo: (context, { reflectionFbo }, batchId) => {
      return reflectionFbo.faces[batchId];
    },
  },
});

const reflection = ({
  reflectionFbo,
  cameraConfig,
  rotationMatrix,
  texture,
}) => {
  const props = new Array(6);

  props.fill({
    reflectionFbo,
    cameraConfig,
    rotationMatrix,
  });

  reflectionSetup(
    props,
    ({ viewportWidth, viewportHeight, config, uvRotation, faceFbo }) => {
      const textureMatrix = mat4.fromValues(
        0.5,
        0,
        0,
        0,
        0,
        0.5,
        0,
        0,
        0,
        0,
        0.5,
        0,
        0.5,
        0.5,
        0.5,
        1
      );

      renderTarget.resize(viewportWidth, viewportHeight);

      renderTarget.use(() => {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1,
        });

        camera(config.cameraConfig, ({ projection, view, fov }) => {
          mat4.multiply(textureMatrix, textureMatrix, projection);
          mat4.mul(textureMatrix, textureMatrix, view);
          mat4.mul(textureMatrix, textureMatrix, config.planeMatrix);

          reflector({
            texture,
            cameraConfig,
            fov,
          });
        });
      });

      faceFbo.use(() => {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1,
        });

        plane({
          texture: renderTarget,
          textureMatrix,
          uvRotation,
        });
      });
    }
  );
};

const CONFIG = {
  cameraX: 0,
  cameraY: 0,
  cameraZ: 5.7,
  rotation: 4.8,
  rotateX: 1,
  rotateY: 1,
  rotateZ: 1,
  velocity: 0.005,
};

/**
 * Fbos
 */
const displacementFbo = regl.framebuffer();
const maskFbo = regl.framebuffer();
const contentFbo = regl.framebuffer();
const reflectionFbo = regl.framebufferCube(1024);

/**
 * Textures
 */
const availableTextures = {
  ["slide1"]: Texture(
    regl,
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFdQTFRFAAAA////gICAQEBAv7+/VVVVICAgEBAQMDAwcXFx39/fn5+fTk5Oj4+PSUlJ7+/vUFBQYGBgcHBwz8/PXV1dr6+vREREZmZmnZ2dmZmZampqiIiIAAAALUoRYQAAAB10Uk5T/////////////////////////////////////wBZhudqAAASi0lEQVR42uzd6WLiurIF4LKZ7EAgEALn3lPv/5yn03unmwQNHiRLVbX0s9vYstcXTbaBGMV0IVwCAEABABQAQAEAFABAAQAUAEABABQAQAEAFABAAQAUAEABABQAQAEAFABAAQAUAEABABQAQAEAFABAAQAUABB5/gQAtvO3LoCsx29dACF/2wQI+dsWQIjfNgFC/rYFEPK3LYAQv20ChPxtCyDEb5sAIX/bAgjx2yZAyN+2AEL8tgkQ8rctgBC/bQKE/G0TIMRvWwAhftsECPnbFkCI3zYBQvy2CRDyty2AEL9tAoT4bRMg5G9bACF+2wQI8dsmQIjfNgFC/LYFEOK3TYCQv20ChPhtEyDEb5sAIX7bBAjx2xZAiN82AUL8tgkQ4rdNgBC/bQKE+G0TIMRvmwAhftsECPHbJkCI3zYBQvy2CRDit02AkL5tAoT4bRMgxG+bACF+2wQI8dsmQEjftgFC/LYJEOK3TYCQvm0CZD1+Nk6AjMfP1l8nItNt/6IHBIDquv6ljwkAVQ38ihwXAKoZ95c6NgDUMesrP/IAgJriLzX6AIAiSz6VjUCMA6hpZc7eCiFZSz9y3c0tEpOx9Km2ShkGUOuNGVv3ishS+lRr5awBqP62rKFbxmQl/ZHX2MxjA4T4JY1QhQOQ9VSOjceHyEL6JKvKGgGQwPhtECDt6ZPQyqsBQCQ6/5InoAAAiY9f6OilCgCkI37JQ5iCAEhR/OLHMYsDIG3xs97vpCWV6RO6tEIASG38als2beHnHTTpO0NSlr76dY3UJ0q4KmJPlqoBYCl+bedL6BkFEwCAgvfRAUD7DNnGYqcKAFyoAID2hfLaCQBABW/WAID1n+6ULYAEXwGupQCA6fhLGrALgKsrAGA5/VIETALgegsAWE6/hAFrAFhCAQDL6Yv7ixADgGUVALCc/oIETABgqQUALKe/DAHtAFh+0Q8A6RckoBcAqyoAYDn9nARUAmClBQAsp1/rH0tdANhAAQDL6df3J1MLADZWAMBy+jX94ZQHMPfwja+YMCAdwPx4m+lbaDAgGcCwv+/T2lUe492vXOVxi3fXLk6DAfy/49/WlSAQC2BwA//q/PhjvG10i5Vrg/VQAH3n+Me2r6MlkAlgTAffFgdwc9W3PdbRH4gEwLIAEN0dAPJMXQCgPgBXoqMLwB0AagawSwag+7UzF4AOAGoGsEoGwF3jtpKvowWA3AAOn9tuXAAOALAEgNfCALaf23YuAFsAWKDSzbosgNZT5Zbq6AMAIDOA4z8b310AjgCgH8Dun42PLgA7AMhf6cIA+q9ZpbNr6IsDYADIC+Doq3NLefoAAKgLwO5r640LwA4Asle6LID+z9adc3bQA4BuAEdvrVvK0wcAQFUAdn83v7sA7ABANYD+YfOjc4GoBwDNAI6PtxedAI4AoBnA9nH71gVgCwCaAXzb/uACQAAgFsB7FMDh2/adE8ABAKQCiL8XsA3U++ugWwDQC+DHB+4uAFQUABsA8F4MwPXHB25OAFcAyFrrpikG4Oendk4AKwDQCuDpE60LAAGAUgD90ycOTgA9AOgEcHz6ROcEcASAnKPAcgC2wYr/PegWAEQC2MUAOD5zdwEgABAJYBUBcHV85uYEcAWArAB2ZQA4Ww0ngFUxAGwCwKoMAGfNWxcAAgDWB8D9SuLB+f+94B4AADzl4Kx55wRwAAB9ALpI1VvvjWIAkAHgEgbgqfrd2UUAgEAAbRBA76n6zQmgB4CMANoSAA6equ+cAA5lADAA+Dc4zwPQ+ereugB0AFAdgHYeAG/dD85ponkALA/AawhA76371gmgBwBxANZThgB/K99SlkEAADwL+CgAoPNX/uoC0AHAwo8FZwYQqPzNuVRcAgCLBUC1A+jjlf9x0B4ApAF4CQDYhCrfuwBsrAPIOAp8zwMgNAlYhSp/cAFY1d6TCgbQLA8gWPmtCwABgBkA5ATQAoAsAKFnQq/h2l9dAK6LX0U2A2CXA0DocYBbuPY3F4AbACx6PzgrgO2A6reeJWKzAFgRgFj1ewcAAgBZAM5+AH2s+gcXgB4A8lS+ac45AATuBm9itd+6AGwWvohsB0C7MIDVkOo/HXQFAFoA7KLVvzoA7GT2ABIAvOYAsG5mnMnN9eKIdQD5RoHrZQH0g+rf+p8YBwDZADYD6t87ABwWvYQMAPMAnGaMAT/Dfj7oCgAWvBkwG8CcMeDnRPD5oDsAyDUKpNAfcNO8pQUwrP5tjkxkA+AlAawf4nUu3b+FAXReAP2g+l9b36NCwvIXAcDxB/zxN173V4l++/XwMbcCNoPqv3IA2ADAcgD+vNvbNBf3ET7+ROwi4gdwG3YC/6H0o0AA8ABwdPLbPwBOnkHb6i+R1wCgp7IddgIX37NihgFwLgCtcxDQ+NcJvzUBzkGCfyV44AlsM6RiCQDNBfDrD7z5/L+Td9a2Pf0O2f1xL4CWppd2sevHtgDsPfO8z/LmP8T5ny2cn/YuBN5nALgKbAAEAPD9ZsTbe9N8dKFjdB+n5v1MowAcZgA4AMCSAGYV73tBqxk7XVkHkGsUeEoPwDsG3M3Zq8AhgAgAzYIACAAqHAVuU+e/yjEJmDsNAIAxS4GZAFxn7XZTX/O5LACWAsD7UPhh1m4P8hoAGQDa1AC860DzqK0AQAgA71eEzRtt7AAgj4CP1ADWWSYB86JRASBTE7BeCsDcpqYVl78MAC9LLQP0M/d7B4A8g4ClAGxm7ncDACJWgrzLAMe5OzYPIIuA5AsBqzyzwFnfGFoofyEA3tIC8D4QNnvP4hoAIQASLwS0ACAMwGtaAB+ZZoEz5oGl8uf0OxSwELDONAuc8VSYRQAjmoDECwGnTLPA6fNAAoAlFwJyzQKnf12gIgCcBUDShYBss8DpCwHF8pcCYLUIgATMACBHH+B9AbC2WeDUgAgAllwIeM0IoBXWAHCOXWboA5LOA9fZlgEAIBeA95QAfG+F3BPsewMAefoACTeDJwMomD9n2WcGAAnngV2+ZYCJ80AAWHQe+JZvGQAAMvUBSeeB3llgl2DnOwDI0QQkvR+4z/RI8OSMSuYvBEDSeeAaAAQCSHg/sMm4DDBpIcAygOF9QLL8d3kB3PNdLhYDIMcgINk0INObwdMXAggAhgA4pwJwybkOBADZACS7HfSa59Xw6QsBRfPnXLtNLiDZNGCd4/uhZgAgAFh2GnDKC2ALAJn6gET5b/N8Qdj0nMrmz9n2m/iCJZsGrJqs60CjgyIAWPZuQJsbQAsAeQAkuhvgvRPQ1g2AhQFILyDRNOA9N4C7qAZAEIBEo8CZPxaUeiUIAIYDSPJQUDfzx4JKAWBxAFILSPQlAefsAG4AkAlAkk7auxCc5InA0UuBBAALjwLXs34ythgAFgggeROQ5GcDmuwAdqIaAEkAUowC/WPAJI+Ejg2rfP6cdd+LjwKjDw2cZ/5mMACUawIGjAK7/fQxYAkABACjmoDoKPAcfYXQPwYM1HZk19NKagA4784XHgXuo6uF/gYg0Lz8FwAq6QNif4rvTTd5DBgA8H/jmoBeUg8gC8Bb9O/7PHkMGADQjntacCOpAeDMe08pIHpHeBXdYu8HcA+16QBQRxOwjj7r8T7xXnDwVkA77tujNpLylwUgMsb7aCJb7JqJAEa9M3IDgGx9QHi59tREtlhNBTCqD1glvjQA8BfAJTLEj2zRBgAcgwC6cgBYNIDEAj5iQ/zwFoFloNC9oHbce4MAkA/AS2yIH97iNBlA+h/EIwCY0geEhuOf3/4W3CKwDBQFcCsFgIUDSCoguNDz+5Wf4GLRJQSgCwO4JwZAADAJwD6yyhdcCvpoptWzHXmzUFIDwAscIaWAl9gqX2gp6GUOgBsAVNEE7CLxBpaCts0cACP6gFZQDyAOwFsk3sBS0HkWgBEvD7eCGgBe4hDpBAS6+MsXgHbCnaAhAI4JARAAJB8EfI3w/HeMgkOANhro8FfHekENAC9yjJRNwDayyOMdBISHAHEAw/uAjaAGQB6Ac2SRxzsIuMwFcASA7AAoDmAfuc/jHSYEVwGGAODFAbASAEmbgJfYfR7fSsBpNoBtIgAEAMkHAQ+PenjWCoI3AsK3+74AHBYGwGoAcMo+wHnH/+0RwNvYZwE4/HJ4O/I0boIaAHEAPHf8948A9mOfBRgKYGAfsBLUAPBSh0nXBJxic3znMGHXJABwTQGAAGBmH7CKdPCN6/WQtxQAGADKzwSd07z2O4DL2HXgoQC6+QAqy58XO066JsAxzfv+vL9rmPASzn8ggCsA1NAEbCMdvGMiGJkEhpf52pGnsRWUPy93oHQAzpEbvY6J4CUGYDUMwG3uGQBAAgEfkVVex0QwMgkcDOA+8wSqy58XPFK6JuDnB37+eT9NBGOTwMEAGADKNwFPLfzTFO9pInhOBuA2q/715c9LHioZgH1kivc0VdwnA9ADQAVNwEvsPt/PqeIplv9gAIMeC1lgRdw2gO8tvGOR78dU8a1JB+C4BABWCSCZgB8t/N4F4DKuBxgOoJ9eewKALH2Aa5Hvex/wEs1/OIAhfUArpwHgZQ+WrAnoIot83/qArkkJ4DAVAAFAOgAPT3C9ugFcIlv8KLvheWYHwGoBpBPwHmvfH5cLB/QAPCLP7TQABAApm4BtpH1/uCE0pAcYA+CQGQArBpBKwEML/+oDcB7TA4wBwJMAEACMBEDD5gG+9v1vLzGkBxgFoMsKgFUDSNcE/JuC95vf/vQSqyY1gOsEAAQASZuAP2tBez+Ay+BVoJEAeDyAavPn5Q+Ytg/wr/J/9QGnhlMD6ACggiagi6zy/9sHvDXpAVzHAqg3fy5wxEQA9pH2/d/Von0GAAwAFTQBny+I7ELt++9eYjcs/5EAbuMAVJw/lzhkEgG/nwsKPunzu5c4ZwFwB4AKAHxE3vn/3UusG84AgEcBqDl/LnLMRAJ2kfb9Vy+xbfIAOI4AQACQCcAl8rT/r16izQSgzwKAjQBIJeDlPZzur17ipeEsAMKPhbRyGoD6AVAg39ifd3yLyQCOGQCwGQAsH0A/9AMEABmbgNhxBufPm0CZ84Ha8+dSh60NQN3rnrYBBAREASD/SgEkElB7IQAAgMrPkRgCLDcAQgAQ8lcHgAHAOAD1AmScnhQApDp/mwAYACo4OTEACPmrA6BZAAEAAIg4MWIIMD28kQSAkL82AFoFAIDtTkDSOckCQPrytw5AoQBZJwQApjuACgCoE0AAkBUAIX9lAHQJIACw3QmIOxWBAAj5KwOgRwABgGkBEs9CJgACAF0AdDQBIs9BKABC/roAKBBAAGBagNTqywVAAKAKgPAmQGzlBQMg5K8KgGQBBACmBYhuu0QDwDqmKgBCBRAA2BYgfPoCALZXsIQvp1TwXD0AmBYgPX8NAAheFQGQJUB+/iz/tmrJr1mVn78SAASqegCIEaAif1bwbFWhS6sj/yoByBCgI39FAAgNgBoAAgRoyZ91vGKx+AVWk78qAASfagDULUBR/tUCqFmApvy1ASDrjZMeANUK0JV/xQAqFaAsf9bzfSvLXG1t+asEQNZaJa0A6hOgL39W9a17uS+5wvwrB1CVACIAkAOAkL8KAPUIUJp/9QBqEaA1f9b29euZrj0BgGkBevPXDYCQvwYAxQVozl8EgDkCCPkrAFBSABEAyAZAyF8+gGIC1OfPKn+NNVkU+vNnnb/HnCgMA/mz0p9kT5IHAYBlAWQifzsACPlLB7CoACv5iwIwVwAhf+EAlhJABACWBVjKXxqAJcIxlb84ALPjIeRvHACV9QUAVQswl79AAAkEEPKXDCCbACIAsCzAZP4yAaTIivLvEgAECbCav1QASQIj5C8XQFIBZDd/uQASpmY5f+sAfgVHpvMXDCCVANv5SwbAyN84AEb+xgEw8jcOgJG/cQAMAMYBMPI3DoCRv3EAjPyNA2DkbxwAI3/jABj5GwfAyN84AEb+xgEw4jcOgJG/cQCLEmAAMC2AAcC0AAYA0wIYAEwLYAAwLYABwLQABgDTAhgATAtgALBMQOWlYgiwnL9WAIz8jQNg5G8cACN/4wAY+RsHkJCA5mvEEGA5f+UAGPkbB8DI3ziApX9rCgCUCWAAMC2AAcAyAROXhiHAcv5WADDyNw5gNAEzl4UhwHL+lgAw8jcOYDABU5eEIcBy/tYADCBg7XowBFjO3yCAIAGDF4MhwHL+NgF4CNi8EgwBlvM3C+CJgNnLwBBgOX/LAB4IWL4GDAG2LwGzdQIMACgAgAIAKACAAgAoAIACACgAgAIAKACAAgAoAIACACgAgAIAKACAAgAoAIACACgAgAIAKACAAgAoAIACACjyyv8EGAD4d/mRupE42AAAAABJRU5ErkJggg=="
  ),
  ["slide2"]: Texture(
    regl,
    "data:image/png;base64,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"
  ),
  ["slide3"]: Texture(
    regl,
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAwBQTFRFtWT/t7e3Ygqyenl6lQC7dB2XjIyMZAS+l0LV2wW+mJiYOQBruAC2uIPYSwCNdQCW7wD1XgCfPwB7fQCxXRmULgBa/4SYOCNMoEn322S8e0yWmEi6ampqvQDfTiV1XgCNnWm1vYq3lDbvwWi5w0G3KABITgF8OwhpgDyyyAC74Ib9nmTZ4TX4xCn7jm6TqRfiNTQ3SgCL/4T/qFn57jHLxgvygxfm2Ia7y8rL0rDYsHTa2YzYOwBcfWqKNwtc/5CviADU+6v9UgGZTAB9kwC/wTvb/1//+830VlVWmwDQgQOuJiYna1J2zA28hgDQwwDR+26bXgB+k0maRDJT46fxJAs3giescgyrmBzQ/5DRnxbylADQ//P+fwHmhTjVvqe5SwRtLA5I/52Q52D3QQCalAav2S/B22fbXT9tpCDVeADghSK//zHP7FugSwBsLghbvAC9/6WsixGfl0fu/Dr/7Eao2Em+6yDFqADT/aTdkiHCkACfGwU4uwCz/x7DiCTrQAF7cSiqKiI2pwDBpQCwdSbD3C2sfyrQ5EifkSaqvAD0d2Z79mGmpwDi5zSsYACNMwBocQCEUACZXgB9QB1llh/gMyc3uRyzNRBMdwDTpH+wVUhXdx/Ql4qWHABEAQAE/2PXTEFVSgJdeYV5qwD2qE36pyG/NABPipSL6KG/ZQCcbGV17UTHlQDnzhatrS3sagC/XABtuRfBqCSsXz6H10mraXNq4MLqaiqCipSUXQCx1gC3XQBtl4WNLgZnUgCtc3NzuTmjwZy07X6jhmClSFJIjYqVeIp/9L7khHqGagC3XACsbgDFSkpKZAC0QkJCfwC8hwC7fwDFdhLEra2tpaWldgDFbBTFXAC0SkpBiADEfw/HbgO6jAvFTEFLQEpBdgC8QkJLiBC6agCofhO5bBe6aQCnWGRZXACmdhW4XAC1UlJJo62kMTEohISEmqablJSLawC0QkI4m6GlpaWbq7Wso62tUQCkN0M4aXNzY2Jjtpy0JzEoq7W1vl6tAAAAbmNHjgAAAQB0Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AFP3ByUAALJNSURBVHja7L0NVJNntjaME8lHSSWHAAuFSPCHJEor8PrTakOWq6GnLlTWig6EGUZK1ilOKV2kS+dtHWpHpHp8u3o8olKkVme1uCxM7Yy17bE60zppFzOnOacUAmq/A80sXsJYmQ45dOz5OqVavr33fT/JkxDIH6DW3E/+BLWV69rXvva+f56Ysei4o0dM9EcQJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAkQHVECREeUANERJUB0RAlwuwyb6/1lNrjeX+ayRQlwpw3r6Odnpecl+FFyXioZ/VypjBLgjhnK0bNSP19URglwZwS/0jrRN5RRAtwB4T8Jyt98/ygQJYAP/GdtgbJDlADf3/H5qDXg7/meWYEoAcTiHxS2EuVolADfT+8f7O8c/R5ZgVuEAOdHzo+4HzcHfusJP1/tWPd9zwM3mwAjUunxtrbj8CrFga/H285L4csjMwu/0uW/8JtAF85+X/LATSSASyp9/7yUDa9vMC5I246/L5XOyP8JSLrVHykw4VsnqP7hj5yKEiD8YXu/DTAGvT8v9YNym3Qk/vyIFH/L2PszkPxH/SOsFN5t/v+Y1RolQLjCD9iOvO9yTU4Sm02Kv3Gaw98q8f8Nq9JKFDjlXyDwd0z0R6MEmGygvJ8PNsfHYyqYRg4oraMSvwWhklkACnIgwgQZXyKRRAkQsuuTtp0PrUQADrRNV+lvncAVWK2o+xIbMUEyOtE8gERijRIghIGub+R8eKyZhv8dydnJ6gLEVqJk0EuUE7WJ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"
  ),
  ["slide4"]: Texture(
    regl,
    "data:image/png;base64,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"
  ),
};
const textures = [
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M1,
  },
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M2,
  },
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M3,
  },
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M4,
  },
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M5,
  },
  {
    texture: availableTextures.slide1,
    typeId: ContentTypes.BLUE,
    maskId: CubeMasks.M6,
  },
];

let nextTextureName;
setInterval(() => {
  if (nextTextureName) {
    const masks = visibleMasks(factor);
    for (const texture of textures) {
      if (!masks.includes(texture.maskId)) {
        texture.texture = availableTextures[nextTextureName];
      }
    }
  }
}, 100);

const setNextTexture = (name) => {
  nextTextureName = name;
};

const visibleMasks = (factor) => {
  if (factor < 0.9) return [CubeMasks.M1, CubeMasks.M2, CubeMasks.M3];
  if (factor < 1.05) return [CubeMasks.M1, CubeMasks.M2];
  if (factor < 1.3) return [CubeMasks.M2, CubeMasks.M3];
  if (factor < 2) return [CubeMasks.M2, CubeMasks.M3, CubeMasks.M6];
  if (factor < 2.2) return [CubeMasks.M3, CubeMasks.M6];
  if (factor < 2.45) return [CubeMasks.M3, CubeMasks.M4, CubeMasks.M6];
  if (factor < 2.9) return [CubeMasks.M3, CubeMasks.M4];
  if (factor < 3.05) return [CubeMasks.M4, CubeMasks.M1];
  if (factor < 3.2) return [CubeMasks.M4, CubeMasks.M5, CubeMasks.M1];
  if (factor < 3.6) return [CubeMasks.M4, CubeMasks.M5];
  if (factor < 3.8) return [CubeMasks.M4, CubeMasks.M5, CubeMasks.M6];
  if (factor < 3.95) return [CubeMasks.M5, CubeMasks.M6];
  if (factor < 4.6) return [CubeMasks.M5, CubeMasks.M6, CubeMasks.M2];
  if (factor < 4.75) return [CubeMasks.M2, CubeMasks.M6];
  if (factor < 5) return [CubeMasks.M2];
  return [1, 2, 3];
};

let factor = 0;
let radX = 0;
let radY = 0;

let fps = Date.now();
let skipFrames = false;
let offset = 0;

function enableFrameSkip() {
  skipFrames = true;
}

function disableFrameSkip() {
  skipFrames = false;
}

const animate = ({ viewportWidth, viewportHeight, tick }) => {
  const {
    rotation,
    rotateX,
    rotateY,
    rotateZ,
    velocity,
    cameraX,
    cameraY,
    cameraZ,
  } = CONFIG;
  /**
   * Resize Fbos
   */
  displacementFbo.resize(viewportWidth, viewportHeight);
  maskFbo.resize(viewportWidth, viewportHeight);
  contentFbo.resize(viewportWidth, viewportHeight);

  /**
   * Rotation Matrix
   */
  if (skipFrames && tick % 2 == 0) {
    factor = ((tick + offset + 0.5) * velocity) % (Math.PI * 2);
    offset -= 1;
  } else {
    factor = ((tick + offset) * velocity) % (Math.PI * 2);
  }
  const rotationMatrix = mat4.create();

  mat4.rotate(rotationMatrix, rotationMatrix, rotation, [
    rotateX,
    rotateY,
    rotateZ,
  ]);
  mat4.rotate(rotationMatrix, rotationMatrix, factor, [
    Math.cos(factor),
    Math.sin(factor),
    0.5,
  ]);

  /**
   * Camera config
   */
  const cameraConfig = {
    eye: [cameraX, cameraY, cameraZ],
    target: [0, 0, 0],
  };

  /**
   * Clear context
   */
  regl.clear({
    color: [0, 0, 0, 0],
    depth: 1,
  });

  camera(cameraConfig, () => {
    /**
     * Render the displacement into the displacementFbo
     * Render the mask into the displacementFbo
     */
    cube([
      {
        fbo: displacementFbo,
        cullFace: CubeFaces.BACK,
        typeId: CubeTypes.DISPLACEMENT,
        matrix: rotationMatrix,
      },
      {
        fbo: maskFbo,
        cullFace: CubeFaces.BACK,
        typeId: CubeTypes.MASK,
        matrix: rotationMatrix,
      },
    ]);

    /**
     * Render the content to print in the cube
     */
    contentFbo.use(() => {
      content({
        textures,
        displacement: displacementFbo,
        mask: maskFbo,
      });
    });
  });

  /**
   * Render the content reflection
   */
  reflection({
    reflectionFbo,
    cameraConfig,
    rotationMatrix,
    texture: contentFbo,
  });

  camera(cameraConfig, () => {
    /**
     * Render the back face of the cube
     * Render the front face of the cube
     */
    cube([
      {
        cullFace: CubeFaces.FRONT,
        typeId: CubeTypes.FINAL,
        reflection: reflectionFbo,
        matrix: rotationMatrix,
      },
      {
        cullFace: CubeFaces.BACK,
        typeId: CubeTypes.FINAL,
        texture: contentFbo,
        matrix: rotationMatrix,
      },
    ]);
  });
  fps = Date.now();
};

const init = () => {
  play(animate);
};
init();

let imageCycle = ["slide1", "slide2", "slide3", "slide4", "slide1"];
let cycleHandler;
const startCycle = () => {
  let cycleIndex = 0;
  cycleHandler = setInterval(() => {
    setNextTexture(
      imageCycle[(cycleIndex = (cycleIndex + 1) % imageCycle.length)]
    );
  }, 3000);
};
const stopCycle = () => clearInterval(cycleHandler);

startCycle();
}
