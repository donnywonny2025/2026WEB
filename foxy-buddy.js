/* ═══════════════════════════════════════════════════════
   FOXY-BUDDY.JS — Autonomous forest companion
   Creates a wandering Opossum NPC.
   ═══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const F = window.Foxy;

    class Opossum {
        constructor() {
            this.el = document.createElement('div');
            this.el.className = 'foxy-buddy opossum';
            this.el.id = 'buddy-opossum';

            this.state = {
                x: Math.random() * window.innerWidth,
                y: window.innerHeight - 140,
                facing: 'right',
                anim: 'walk',
                frame: 1,
                speed: 1.5,
                wandering: true
            };

            this.init();
        }

        init() {
            this.el.style.cssText = `
                position: fixed;
                bottom: 110px;
                width: 72px;
                height: 56px;
                image-rendering: pixelated;
                z-index: 45;
                transition: transform 0.1s linear;
            `;

            this.img = document.createElement('img');
            this.img.style.width = '100%';
            this.img.style.height = '100%';
            this.el.appendChild(this.img);
            document.body.appendChild(this.el);

            this.startLoops();
        }

        updateSprite() {
            this.img.src = `assets/sunny-land/enemies/opossum/opossum-${this.state.frame}.png`;
            this.el.style.transform = `translateX(${this.state.x}px) scaleX(${this.state.facing === 'left' ? 1 : -1})`;
        }

        startLoops() {
            // Animation loop (10fps walk)
            setInterval(() => {
                if (this.state.anim === 'walk') {
                    this.state.frame = (this.state.frame % 6) + 1;
                }
                this.updateSprite();
            }, 100);

            // Movement loop
            setInterval(() => {
                if (this.state.wandering) {
                    if (this.state.facing === 'left') {
                        this.state.x -= this.state.speed;
                        if (this.state.x < 50) this.state.facing = 'right';
                    } else {
                        this.state.x += this.state.speed;
                        if (this.state.x > window.innerWidth - 120) this.state.facing = 'left';
                    }
                }

                // Interaction: If Foxy is very close, pause and look
                if (F.body) {
                    const fx = F.body.getPosition().x;
                    const dist = Math.abs(fx - this.state.x);
                    if (dist < 100) {
                        this.state.speed = 0.5; // slow down
                    } else {
                        this.state.speed = 1.5;
                    }
                }
            }, 30);

            // Decision loop (change direction occasionally)
            setInterval(() => {
                if (Math.random() > 0.7) {
                    this.state.facing = this.state.facing === 'left' ? 'right' : 'left';
                }
            }, 5000 + Math.random() * 5000);
        }

        getPosition() {
            return { x: this.state.x, y: this.state.y };
        }
    }

    // Initialize buddy
    window.addEventListener('load', () => {
        F.buddy = new Opossum();
    });

})();
