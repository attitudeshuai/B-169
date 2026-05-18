class Lottery3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.group = null;
        this.participants = [];
        this.isSpinning = false;
        this.rotationSpeed = 0.002;
        this.targetSpeed = 0.002;
        
        if (this.init()) {
            this.animate();
        }
    }

    init() {
        if (!window.WebGLRenderingContext) {
            this.showError("您的浏览器不支持 WebGL (Your browser does not support WebGL)");
            return false;
        }

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.z = 25;

        // Renderer
        try {
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        } catch (e) {
            console.error('WebGL init failed:', e);
            this.showError("WebGL 初始化失败 (WebGL Init Failed): " + e.message);
            return false;
        }
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Group for names
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        this.scene.add(pointLight);

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
        
        return true;
    }

    showError(msg) {
        this.container.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:red;font-size:1.2rem;text-align:center;padding:20px;background:rgba(0,0,0,0.5);border-radius:8px;">${msg}</div>`;
    }

    createTextTexture(text, color = 'white') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48;
        ctx.font = `Bold ${fontSize}px Arial`;
        const width = ctx.measureText(text).width;
        
        canvas.width = width + 20;
        canvas.height = fontSize + 20;

        ctx.font = `Bold ${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // smooth scaling
        return { texture, aspectRatio: canvas.width / canvas.height };
    }

    updateParticipants(list, emptyMsg = "等待导入数据...") {
        this.participants = list;
        // Clear existing with proper disposal to prevent memory leaks
        while(this.group.children.length > 0){ 
            const object = this.group.children[0];
            if (object.material) {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
            }
            if (object.geometry) {
                object.geometry.dispose();
            }
            this.group.remove(object); 
        }

        // Limit display count for performance if needed, e.g. 150
        const displayList = list.slice(0, 150);
        const count = displayList.length;

        // Fibonacci Sphere Distribution
        const phi = Math.PI * (3 - Math.sqrt(5));
        const radius = 12;

        displayList.forEach((p, i) => {
            let y, r, theta;
            
            if (count === 1) {
                // Single item centered
                y = 0;
                r = 1; // full radius
                theta = 0;
            } else {
                y = 1 - (i / (count - 1)) * 2;
                r = Math.sqrt(1 - y * y);
                theta = phi * i;
            }

            const x = Math.cos(theta) * r;
            const z = Math.sin(theta) * r;

            const { texture, aspectRatio } = this.createTextTexture(p.name);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            
            sprite.position.set(x * radius, y * radius, z * radius);
            
            // Scale sprite based on aspect ratio
            const scaleBase = 1.5;
            sprite.scale.set(scaleBase * aspectRatio, scaleBase, 1);
            
            this.group.add(sprite);
        });

        // Center msg if empty
        if (count === 0) {
            const { texture, aspectRatio } = this.createTextTexture(emptyMsg, "#94a3b8");
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
            sprite.scale.set(3 * aspectRatio, 3, 1);
            this.group.add(sprite);
        }
    }

    setSpinning(spinning) {
        this.isSpinning = spinning;
        // If not spinning, set target speed to 0 (stop) or very slow drift (0.0005)
        // User requested "stop check... still spinning", so let's make it almost static or stop.
        // Let's use 0 to be safe with "stop" request, or just extremely slow.
        // Giving it a tiny drift (0.0002) keeps it alive without being "spinning".
        this.targetSpeed = spinning ? 0.3 : 0.0005; 
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth acceleration/deceleration
        this.rotationSpeed += (this.targetSpeed - this.rotationSpeed) * 0.05;

        // Stop rotation calculation if speed is negligible to save CPU
        if (Math.abs(this.rotationSpeed) < 0.0001 && !this.isSpinning) {
             this.rotationSpeed = 0;
        }

        if (this.group && this.rotationSpeed !== 0) {
            this.group.rotation.y += this.rotationSpeed;
            // Reduce vertical wobble when idle
            this.group.rotation.x += this.isSpinning ? this.rotationSpeed * 0.2 : 0;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
