
        // Device detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        
        // Game initialization
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        function resizeCanvas() {
            if (isMobile) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            } else {
                const container = document.getElementById('gameContainer');
                canvas.width = Math.min(1000, window.innerWidth - 40);
                canvas.height = Math.min(700, window.innerHeight - 40);
            }
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Game state
        let gameState = 'loading'; // 'loading', 'menu', 'playing', 'paused', 'gameOver'
        let score = 0;
        let wave = 1;
        let enemiesKilled = 0;
        let enemiesPerWave = 5;
        let combo = 0;
        let maxCombo = 0;
        let comboTimer = 0;
        let scoreMultiplier = 1.0;
        
        // Game objects arrays
        let bullets = [];
        let enemies = [];
        let particles = [];
        let stars = [];
        let powerUps = [];
        
        // Input handling
        const keys = {};
        const mouse = { x: 0, y: 0, pressed: false };
        
        // Mobile controls
        const joystick = {
            active: false,
            centerX: 0,
            centerY: 0,
            knobX: 0,
            knobY: 0,
            deltaX: 0,
            deltaY: 0
        };
        
        let firePressed = false;
        
        // Create starfield background
        function createStars() {
            stars = [];
            for (let i = 0; i < 200; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speed: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.8 + 0.2
                });
            }
        }
        
        // Loading simulation
        function simulateLoading() {
            const loadingMessages = [
                "Initializing Systems...",
                "Loading Weapon Systems...",
                "Scanning for Hostiles...",
                "Preparing Defenses...",
                "Systems Online"
            ];
            
            let progress = 0;
            let messageIndex = 0;
            
            const loadingInterval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress > 100) progress = 100;
                
                document.getElementById('loadingProgress').style.width = progress + '%';
                
                if (messageIndex < loadingMessages.length - 1 && progress > (messageIndex + 1) * 20) {
                    messageIndex++;
                    document.getElementById('loadingText').textContent = loadingMessages[messageIndex];
                }
                
                if (progress >= 100) {
                    clearInterval(loadingInterval);
                    document.getElementById('startButton').classList.add('show');
                }
            }, 200);
        }
        
        // Particle class
        class Particle {
            constructor(x, y, color, type) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.size = type === 'explosion' ? Math.random() * 4 + 2 : Math.random() * 3 + 1;
                this.speedX = Math.random() * 6 - 3;
                this.speedY = Math.random() * 6 - 3;
                this.life = type === 'explosion' ? 40 : 25;
                this.maxLife = this.life;
                this.type = type;
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.speedX *= 0.98;
                this.speedY *= 0.98;
                this.life--;
                
                if (this.life <= 0) {
                    const index = particles.indexOf(this);
                    if (index > -1) {
                        particles.splice(index, 1);
                    }
                }
            }
            
            draw() {
                ctx.save();
                ctx.globalAlpha = this.life / this.maxLife;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        // Enhanced Player class
        class Player {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = 20;
                this.speed = isMobile ? 200 : 250;
                this.health = 100;
                this.maxHealth = 100;
                this.shield = 0;
                this.maxShield = 100;
                this.shootCooldown = 0;
                this.shootRate = 150; // milliseconds
                this.angle = 0;
                this.invincible = false;
                this.invincibleTimer = 0;
                this.specialWeapon = false;
                this.specialWeaponTimer = 0;
                this.blinkTimer = 0;
            }
            
            update(deltaTime) {
                if (this.shootCooldown > 0) {
                    this.shootCooldown -= deltaTime;
                }
                
                // Update invincibility
                if (this.invincible) {
                    this.invincibleTimer -= deltaTime;
                    this.blinkTimer += deltaTime;
                    if (this.invincibleTimer <= 0) {
                        this.invincible = false;
                    }
                }
                
                // Movement handling for both mobile and desktop
                let dx = 0, dy = 0;
                
                if (isMobile) {
                    dx = joystick.deltaX;
                    dy = joystick.deltaY;
                } else {
                    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
                    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
                    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
                    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
                }
                
                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    dx *= 0.707;
                    dy *= 0.707;
                }
                
                this.x += dx * this.speed * (deltaTime / 1000);
                this.y += dy * this.speed * (deltaTime / 1000);
                
                // Keep player within bounds with padding
                const padding = this.radius + 10;
                this.x = Math.max(padding, Math.min(canvas.width - padding, this.x));
                this.y = Math.max(padding, Math.min(canvas.height - padding, this.y));
                
                // Update angle
                if (!isMobile) {
                    this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
                } else if (dx !== 0 || dy !== 0) {
                    this.angle = Math.atan2(dy, dx);
                }
                
                // Shooting
                const shouldShoot = isMobile ? firePressed : (mouse.pressed || keys['Space']);
                if (shouldShoot && this.shootCooldown <= 0) {
                    this.shoot();
                }
                
                // Update special weapon timer
                if (this.specialWeapon) {
                    this.specialWeaponTimer -= deltaTime;
                    if (this.specialWeaponTimer <= 0) {
                        this.specialWeapon = false;
                    }
                }
                
                // Shield regeneration (slow)
                if (this.shield < this.maxShield && this.shield > 0) {
                    this.shield += 0.5 * (deltaTime / 1000);
                    this.shield = Math.min(this.shield, this.maxShield);
                }
            }
            
            shoot() {
                if (this.specialWeapon) {
                    // Special weapon - spread shot
                    for (let i = -2; i <= 2; i++) {
                        const angle = this.angle + (i * 0.15);
                        bullets.push(new Bullet(this.x, this.y, angle, 'player', true));
                    }
                    this.shootCooldown = this.shootRate / 1.5;
                } else {
                    // Normal dual shot
                    const offsetDistance = 12;
                    const leftX = this.x + Math.cos(this.angle + Math.PI/2) * offsetDistance;
                    const leftY = this.y + Math.sin(this.angle + Math.PI/2) * offsetDistance;
                    const rightX = this.x + Math.cos(this.angle - Math.PI/2) * offsetDistance;
                    const rightY = this.y + Math.sin(this.angle - Math.PI/2) * offsetDistance;
                    
                    bullets.push(new Bullet(leftX, leftY, this.angle, 'player'));
                    bullets.push(new Bullet(rightX, rightY, this.angle, 'player'));
                    
                    this.shootCooldown = this.shootRate;
                }
                
                // Create muzzle flash
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(
                        this.x + Math.cos(this.angle) * 20,
                        this.y + Math.sin(this.angle) * 20,
                        '#40e0ff',
                        'muzzle'
                    ));
                }
            }
            
            takeDamage(damage) {
                if (this.invincible) return;
                
                // Shield absorbs damage first
                if (this.shield > 0) {
                    this.shield -= damage;
                    if (this.shield < 0) {
                        this.health += this.shield; // Apply overflow damage to health
                        this.shield = 0;
                    }
                } else {
                    this.health -= damage;
                }
                
                // Grant invincibility frames
                this.invincible = true;
                this.invincibleTimer = 1000; // 1 second
                
                if (this.health <= 0) {
                    this.health = 0;
                    gameState = 'gameOver';
                    document.getElementById('finalScore').textContent = Math.floor(score);
                    document.getElementById('finalKills').textContent = enemiesKilled;
                    document.getElementById('finalWaves').textContent = wave;
                    document.getElementById('maxCombo').textContent = maxCombo;
                    document.getElementById('gameOver').style.display = 'block';
                    
                    // Create death explosion
                    for (let i = 0; i < 30; i++) {
                        particles.push(new Particle(this.x, this.y, '#40e0ff', 'explosion'));
                    }
                }
                
                // Screen shake effect
                canvas.style.transform = `translate(${Math.random() * 8 - 4}px, ${Math.random() * 8 - 4}px)`;
                setTimeout(() => canvas.style.transform = 'translate(0px, 0px)', 100);
                
                // Damage particles
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(this.x, this.y, '#ff4757', 'damage'));
                }
                
                // Reset combo on damage
                combo = 0;
                updateComboDisplay();
            }
            
            activateShield() {
                this.shield = this.maxShield;
            }
            
            activateSpecialWeapon() {
                this.specialWeapon = true;
                this.specialWeaponTimer = 8000; // 8 seconds
            }
            
            heal(amount) {
                this.health = Math.min(this.maxHealth, this.health + amount);
            }
            
            draw() {
                // Don't draw if blinking during invincibility
                if (this.invincible && this.blinkTimer % 200 < 100) {
                    return;
                }
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                
                // Draw shield
                if (this.shield > 0) {
                    ctx.strokeStyle = `rgba(64, 224, 255, ${this.shield / this.maxShield * 0.6})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // Main ship body
                const gradient = ctx.createLinearGradient(-20, 0, 20, 0);
                gradient.addColorStop(0, '#2a5ba8');
                gradient.addColorStop(0.5, '#4a90e2');
                gradient.addColorStop(1, '#2a5ba8');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(-15, -12);
                ctx.lineTo(-18, -8);
                ctx.lineTo(-18, 8);
                ctx.lineTo(-15, 12);
                ctx.closePath();
                ctx.fill();
                
                // Ship details
                ctx.fillStyle = '#6bb5ff';
                ctx.fillRect(5, -4, 10, 8);
                
                // Cockpit
                ctx.fillStyle = '#a0d0ff';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                ctx.fillStyle = '#2a5ba8';
                ctx.fillRect(-10, -14, 8, 4);
                ctx.fillRect(-10, 10, 8, 4);
                
                ctx.restore();
                
                // Health bar
                const barWidth = 40;
                const barHeight = 5;
                const barX = this.x - barWidth / 2;
                const barY = this.y - this.radius - 15;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336';
                ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            }
        }
        
        // Enhanced Enemy class
        class Enemy {
            constructor(x, y, isBoss = false) {
                this.x = x;
                this.y = y;
                this.isBoss = isBoss;
                this.radius = isBoss ? 35 : 15;
                this.speed = isBoss ? 40 : (50 + wave * 5);
                this.health = isBoss ? (100 + wave * 50) : (20 + wave * 5);
                this.maxHealth = this.health;
                this.damage = isBoss ? 25 : 10;
                this.lastAttack = 0;
                this.attackCooldown = 1500;
                this.angle = 0;
                this.type = isBoss ? 'boss' : (Math.random() > 0.7 ? 'heavy' : 'normal');
                this.shootTimer = 0;
                this.shootInterval = isBoss ? 800 : (1500 + Math.random() * 1000);
                this.movePattern = Math.random() > 0.5 ? 'direct' : 'strafe';
                this.strafeTimer = 0;
                this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
                
                if (this.type === 'heavy' && !isBoss) {
                    this.radius = 18;
                    this.health *= 1.5;
                    this.maxHealth = this.health;
                    this.damage *= 1.3;
                    this.speed *= 0.7;
                }
            }
            
            update(deltaTime) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                this.angle = Math.atan2(dy, dx);
                
                // Movement patterns
                if (this.movePattern === 'strafe') {
                    this.strafeTimer += deltaTime;
                    if (this.strafeTimer > 2000) {
                        this.strafeTimer = 0;
                        this.strafeDirection *= -1;
                    }
                    
                    const strafeAngle = this.angle + Math.PI/2 * this.strafeDirection;
                    this.x += Math.cos(strafeAngle) * this.speed * 0.5 * (deltaTime / 1000);
                    this.y += Math.sin(strafeAngle) * this.speed * 0.5 * (deltaTime / 1000);
                }
                
                // Move towards player
                if (distance > (this.isBoss ? 200 : 100)) {
                    this.x += (dx / distance) * this.speed * (deltaTime / 1000);
                    this.y += (dy / distance) * this.speed * (deltaTime / 1000);
                }
                
                // Keep within bounds
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
                
                // Enemy shooting
                this.shootTimer += deltaTime;
                if (this.shootTimer > this.shootInterval && distance < 500) {
                    this.shoot();
                    this.shootTimer = 0;
                }
                
                // Collision damage
                if (distance < this.radius + player.radius) {
                    const now = Date.now();
                    if (now - this.lastAttack > this.attackCooldown) {
                        player.takeDamage(this.damage);
                        this.lastAttack = now;
                    }
                }
            }
            
            shoot() {
                if (this.isBoss) {
                    // Boss shoots 3 bullets in a spread
                    for (let i = -1; i <= 1; i++) {
                        const angle = this.angle + (i * 0.2);
                        bullets.push(new Bullet(this.x, this.y, angle, 'enemy'));
                    }
                } else {
                    bullets.push(new Bullet(this.x, this.y, this.angle, 'enemy'));
                }
                
                // Muzzle flash
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(
                        this.x + Math.cos(this.angle) * this.radius,
                        this.y + Math.sin(this.angle) * this.radius,
                        '#ff4757',
                        'muzzle'
                    ));
                }
            }
            
            takeDamage(damage) {
                this.health -= damage;
                
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(this.x, this.y, '#ff6b7a', 'hit'));
                }
                
                if (this.health <= 0) {
                    this.destroy();
                }
            }
            
            destroy() {
                // Create explosion
                const particleCount = this.isBoss ? 40 : 15;
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(this.x, this.y, this.isBoss ? '#ffaa00' : '#ff8a80', 'explosion'));
                }
                
                // Chance to drop power-up (increased for boss)
                const dropChance = this.isBoss ? 0.8 : 0.25;
                if (Math.random() < dropChance) {
                    powerUps.push(new PowerUp(this.x, this.y));
                }
                
                // Remove from enemies array
                const index = enemies.indexOf(this);
                if (index > -1) {
                    enemies.splice(index, 1);
                }
                
                // Update score with combo multiplier
                const basePoints = this.isBoss ? 1000 : (this.type === 'heavy' ? 200 : 100);
                const points = Math.floor(basePoints * wave * scoreMultiplier);
                score += points;
                enemiesKilled++;
                
                // Update combo
                combo++;
                maxCombo = Math.max(maxCombo, combo);
                comboTimer = 3000; // 3 seconds to maintain combo
                updateComboDisplay();
                
                // Check if wave is complete
                if (enemies.length === 0) {
                    startNextWave();
                }
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                
                // Main body
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                if (this.isBoss) {
                    gradient.addColorStop(0, '#ffaa00');
                    gradient.addColorStop(0.5, '#ff6600');
                    gradient.addColorStop(1, '#cc4400');
                } else if (this.type === 'heavy') {
                    gradient.addColorStop(0, '#ff6b7a');
                    gradient.addColorStop(0.7, '#ff4757');
                    gradient.addColorStop(1, '#c44569');
                } else {
                    gradient.addColorStop(0, '#ff8a80');
                    gradient.addColorStop(0.7, '#ff5722');
                    gradient.addColorStop(1, '#d84315');
                }
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Details
                if (this.isBoss) {
                    ctx.strokeStyle = '#ffcc00';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.fillStyle = this.isBoss ? '#cc4400' : (this.type === 'heavy' ? '#c44569' : '#d84315');
                ctx.fillRect(-this.radius * 0.5, -2, this.radius, 4);
                
                ctx.restore();
                
                // Health bar
                const barWidth = this.isBoss ? 60 : 28;
                const barHeight = this.isBoss ? 6 : 4;
                const barX = this.x - barWidth / 2;
                const barY = this.y - this.radius - (this.isBoss ? 20 : 12);
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : '#ff5722';
                ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
                
                // Boss label
                if (this.isBoss) {
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = 'bold 12px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.fillText('BOSS', this.x, barY - 10);
                    ctx.textAlign = 'left';
                }
            }
        }
        
        // Enhanced Bullet class
        class Bullet {
            constructor(x, y, angle, owner, isSpecial = false) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.speed = owner === 'player' ? (isSpecial ? 600 : 550) : 350;
                this.radius = owner === 'player' ? (isSpecial ? 5 : 4) : 3.5;
                this.owner = owner;
                this.damage = owner === 'player' ? (isSpecial ? 25 : 18) : 12;
                this.lifetime = 4000;
                this.createdAt = Date.now();
                this.trail = [];
                this.isSpecial = isSpecial;
            }
            
            update(deltaTime) {
                // Add to trail
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 6) {
                    this.trail.shift();
                }
                
                this.x += Math.cos(this.angle) * this.speed * (deltaTime / 1000);
                this.y += Math.sin(this.angle) * this.speed * (deltaTime / 1000);
                
                if (this.x < -20 || this.x > canvas.width + 20 || 
                    this.y < -20 || this.y > canvas.height + 20 ||
                    Date.now() - this.createdAt > this.lifetime) {
                    this.destroy();
                }
            }
            
            destroy() {
                const index = bullets.indexOf(this);
                if (index > -1) {
                    bullets.splice(index, 1);
                }
            }
            
            draw() {
                // Draw trail
                this.trail.forEach((point, index) => {
                    const alpha = (index + 1) / this.trail.length * 0.4;
                    ctx.fillStyle = this.owner === 'player' ? 
                        `rgba(64, 224, 255, ${alpha})` : 
                        `rgba(255, 71, 87, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, this.radius * alpha, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Draw bullet
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
                if (this.owner === 'player') {
                    if (this.isSpecial) {
                        gradient.addColorStop(0, '#ffffff');
                        gradient.addColorStop(0.5, '#ffcc00');
                        gradient.addColorStop(1, 'transparent');
                    } else {
                        gradient.addColorStop(0, '#ffffff');
                        gradient.addColorStop(0.5, '#40e0ff');
                        gradient.addColorStop(1, 'transparent');
                    }
                } else {
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.5, '#ff4757');
                    gradient.addColorStop(1, 'transparent');
                }
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Power-up class
        class PowerUp {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = 12;
                this.speedY = 80;
                this.pulseTimer = 0;
                const rand = Math.random();
                if (rand < 0.35) {
                    this.type = 'health';
                    this.color = '#4caf50';
                } else if (rand < 0.65) {
                    this.type = 'shield';
                    this.color = '#40e0ff';
                } else {
                    this.type = 'weapon';
                    this.color = '#ffcc00';
                }
            }
            
            update(deltaTime) {
                this.pulseTimer += deltaTime;
                this.y += this.speedY * (deltaTime / 1000);
                
                // Remove if out of bounds
                if (this.y > canvas.height + this.radius) {
                    const index = powerUps.indexOf(this);
                    if (index > -1) {
                        powerUps.splice(index, 1);
                    }
                }
            }
            
            draw() {
                const pulse = 1 + Math.sin(this.pulseTimer / 200) * 0.2;
                
                // Draw glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Draw icon
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (this.type === 'health') {
                    ctx.fillText('+', this.x, this.y);
                } else if (this.type === 'shield') {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillText('★', this.x, this.y);
                }
                
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
            }
        }
        
        // Initialize player
        let player;
        
        // Collision detection
        function checkCollisions() {
            // Player bullets vs Enemies
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.owner !== 'player') continue;
                
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < bullet.radius + enemy.radius) {
                        enemy.takeDamage(bullet.damage);
                        bullet.destroy();
                        break;
                    }
                }
            }
            
            // Enemy bullets vs Player (THIS WAS MISSING!)
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.owner !== 'enemy') continue;
                
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bullet.radius + player.radius) {
                    player.takeDamage(bullet.damage);
                    bullet.destroy();
                }
            }
            
            // Player vs Power-ups
            for (let i = powerUps.length - 1; i >= 0; i--) {
                const powerUp = powerUps[i];
                const dx = player.x - powerUp.x;
                const dy = player.y - powerUp.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < player.radius + powerUp.radius) {
                    if (powerUp.type === 'health') {
                        player.heal(30);
                    } else if (powerUp.type === 'shield') {
                        player.activateShield();
                    } else {
                        player.activateSpecialWeapon();
                    }
                    
                    // Remove power-up
                    powerUps.splice(i, 1);
                    
                    // Collection effect
                    for (let j = 0; j < 15; j++) {
                        particles.push(new Particle(powerUp.x, powerUp.y, powerUp.color, 'explosion'));
                    }
                }
            }
        }
        
        // Spawn enemies for current wave
        function spawnWave() {
            const enemyCount = enemiesPerWave + Math.floor(wave / 2);
            
            // Spawn boss every 5 waves
            if (wave % 5 === 0) {
                const side = Math.floor(Math.random() * 4);
                let x, y;
                switch (side) {
                    case 0: x = canvas.width / 2; y = -40; break;
                    case 1: x = canvas.width + 40; y = canvas.height / 2; break;
                    case 2: x = canvas.width / 2; y = canvas.height + 40; break;
                    case 3: x = -40; y = canvas.height / 2; break;
                }
                enemies.push(new Enemy(x, y, true));
            }
            
            for (let i = 0; i < enemyCount; i++) {
                let x, y;
                const side = Math.floor(Math.random() * 4);
                const offset = Math.random() * (side % 2 === 0 ? canvas.width : canvas.height);
                
                switch (side) {
                    case 0: x = offset; y = -30; break;
                    case 1: x = canvas.width + 30; y = offset; break;
                    case 2: x = offset; y = canvas.height + 30; break;
                    case 3: x = -30; y = offset; break;
                }
                enemies.push(new Enemy(x, y));
            }
        }
        
        // Start next wave
        function startNextWave() {
            wave++;
            setTimeout(() => {
                spawnWave();
            }, 2500);
        }
        
        // Update combo system
        function updateComboDisplay() {
            if (combo >= 3) {
                document.getElementById('comboDisplay').style.display = 'block';
                document.getElementById('combo').textContent = combo;
                scoreMultiplier = 1.0 + (combo * 0.1);
                document.getElementById('multiplier').textContent = scoreMultiplier.toFixed(1);
            } else {
                document.getElementById('comboDisplay').style.display = 'none';
                scoreMultiplier = 1.0;
            }
        }
        
        // Update HUD
        function updateHUD() {
            document.getElementById('score').textContent = Math.floor(score);
            document.getElementById('health').textContent = Math.floor(player.health);
            document.getElementById('shield').textContent = Math.floor(player.shield);
            document.getElementById('wave').textContent = wave;
            document.getElementById('kills').textContent = enemiesKilled;
        }
        
        // Draw starfield
        function drawStars() {
            ctx.fillStyle = '#ffffff';
            stars.forEach(star => {
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
                
                ctx.globalAlpha = star.opacity;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
        
        // Game loop
        let lastTime = 0;
        function gameLoop(currentTime) {
            const deltaTime = Math.min(currentTime - lastTime, 50); // Cap delta time
            lastTime = currentTime;
            
            if (gameState === 'playing') {
                // Update combo timer
                if (combo > 0) {
                    comboTimer -= deltaTime;
                    if (comboTimer <= 0) {
                        combo = 0;
                        updateComboDisplay();
                    }
                }
                
                // Update game objects
                player.update(deltaTime);
                
                bullets.forEach(bullet => bullet.update(deltaTime));
                enemies.forEach(enemy => enemy.update(deltaTime));
                particles.forEach(particle => particle.update());
                powerUps.forEach(powerUp => powerUp.update(deltaTime));
                
                // Check collisions
                checkCollisions();
                
                // Update HUD
                updateHUD();
            }
            
            // Clear canvas
            ctx.fillStyle = '#0a0a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw stars
            drawStars();
            
            // Draw game objects
            if (gameState === 'playing' || gameState === 'paused') {
                powerUps.forEach(powerUp => powerUp.draw());
                player.draw();
                bullets.forEach(bullet => bullet.draw());
                enemies.forEach(enemy => enemy.draw());
                particles.forEach(particle => particle.draw());
                
                // Draw wave transition
                if (enemies.length === 0 && gameState === 'playing') {
                    ctx.fillStyle = 'rgba(64, 224, 255, 0.8)';
                    ctx.font = 'bold 32px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Wave ${wave} Complete!`, canvas.width / 2, canvas.height / 2 - 20);
                    ctx.font = '20px Orbitron';
                    ctx.fillText(`Preparing Wave ${wave + 1}...`, canvas.width / 2, canvas.height / 2 + 20);
                    ctx.textAlign = 'left';
                }
            }
            
            requestAnimationFrame(gameLoop);
        }
        
        // Event listeners
       document.addEventListener('keydown', (e) => {
    // Prevent default page scrolling for game keys
    const gameKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'KeyR'];
    if (gameKeys.includes(e.code)) {
        e.preventDefault();
    }

    keys[e.code] = true;

    // Pause game
    if (e.code === 'KeyP' && gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pauseScreen').style.display = 'block';
    } else if (e.code === 'KeyP' && gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pauseScreen').style.display = 'none';
    }

    // Restart game
    if (e.code === 'KeyR' && gameState === 'gameOver') {
        restartGame();
    }
});
        
     document.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', () => {
            if (gameState === 'playing') {
                mouse.pressed = true;
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            mouse.pressed = false;
        });
        
        canvas.addEventListener('mouseleave', () => {
            mouse.pressed = false;
        });
        
        // Mobile joystick
        const joystickBase = document.getElementById('joystickContainer');
        const joystickKnob = document.getElementById('joystickKnob');
        let joystickBounds = joystickBase.getBoundingClientRect();
        
        window.addEventListener('resize', () => {
            joystickBounds = joystickBase.getBoundingClientRect();
        });
        
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystick.active = true;
            updateJoystick(e.touches[0]);
        });
        
        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (joystick.active) {
                updateJoystick(e.touches[0]);
            }
        });
        
        joystickBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            joystick.active = false;
            joystick.deltaX = 0;
            joystick.deltaY = 0;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
        });
        
        function updateJoystick(touch) {
            const centerX = joystickBounds.left + joystickBounds.width / 2;
            const centerY = joystickBounds.top + joystickBounds.height / 2;
            const x = touch.clientX - centerX;
            const y = touch.clientY - centerY;
            
            const distance = Math.min(Math.sqrt(x * x + y * y), joystickBounds.width / 2 - 20);
            const angle = Math.atan2(y, x);
            
            const knobX = Math.cos(angle) * distance;
            const knobY = Math.sin(angle) * distance;
            
            joystick.deltaX = knobX / (joystickBounds.width / 2 - 20);
            joystick.deltaY = knobY / (joystickBounds.height / 2 - 20);
            
            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        }
        
        // Fire button
        const fireButton = document.getElementById('fireButton');
        fireButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            firePressed = true;
        });
        
        fireButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            firePressed = false;
        });
        
        // Restart game
        function restartGame() {
            gameState = 'playing';
            score = 0;
            wave = 1;
            enemiesKilled = 0;
            combo = 0;
            maxCombo = 0;
            scoreMultiplier = 1.0;
            bullets = [];
            enemies = [];
            particles = [];
            powerUps = [];
            
            player.health = player.maxHealth;
            player.shield = 0;
            player.x = canvas.width / 2;
            player.y = canvas.height / 2;
            player.specialWeapon = false;
            player.invincible = false;
            
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('gameHUD').style.display = 'block';
            updateComboDisplay();
            spawnWave();
        }
        
        // Start the game
        function startGame() {
            gameState = 'playing';
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('gameHUD').style.display = 'block';
            player = new Player(canvas.width / 2, canvas.height / 2);
            createStars();
            spawnWave();
            requestAnimationFrame(gameLoop);
        }
        
        // Initialize
        window.addEventListener('load', () => {
            resizeCanvas();
            simulateLoading();
            
            document.getElementById('startButton').addEventListener('click', startGame);
            document.getElementById('gameOver').addEventListener('click', () => {
                if (gameState === 'gameOver') restartGame();
            });
            
            window.addEventListener('resize', () => {
                resizeCanvas();
                createStars();
                joystickBounds = joystickBase.getBoundingClientRect();
            });
        });
    