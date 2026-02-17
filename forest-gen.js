/* ═══════════════════════════════════════════
   FOREST-GEN.JS — Pixel art scene generator
   Ground tiles, layered forest, props, and fireflies
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    var forest = document.getElementById('forestLayer');
    if (!forest) return;

    /* ─── PIXEL ART GROUND ─── */
    (function buildGround() {
        var SCALE = 4;          // render scale (pixel art crisp)
        var GROUND_H = 192;     // total ground height in px (3 rows of 64)

        var groundCanvas = document.createElement('canvas');
        groundCanvas.id = 'groundCanvas';
        groundCanvas.style.cssText =
            'position:fixed;bottom:0;left:0;width:100%;' +
            'height:' + GROUND_H + 'px;' +
            'z-index:3;pointer-events:none;image-rendering:pixelated;';
        document.body.appendChild(groundCanvas);

        var tileset = new Image();
        tileset.src = 'assets/sunny-land/environment/tileset/tileset-sliced.png';
        tileset.onload = function () {
            var W = window.innerWidth;
            groundCanvas.width = W;
            groundCanvas.height = GROUND_H;
            var ctx = groundCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            // The Sunny Land tileset has grass-top ground tiles in the upper-right:
            // Full grass-top tile with dirt: approx (288, 0, 32, 32) — bright green grass over brown dirt
            // Dirt fill tile: approx (288, 32, 32, 32) — solid brown
            // These are 32x32 source tiles → rendered at 32*SCALE = 128px? Too big.
            // Instead use smaller tiles: Row 0 has 16x16 tiles.
            // Top-left corner piece at (0,0,16,16) — has grass on top-left corner
            // Flat grass middle at roughly (16,0,16,16) — grass top edge
            // Let's use the visible grass blocks from the right side:
            // Green-topped blocks at approximately: (272,0) and (304,0) at 32x32 size

            // Actually, let's draw a stylized ground using solid colors from the tileset palette
            var TILE_W = 64; // rendered tile width
            var cols = Math.ceil(W / TILE_W) + 1;

            // Draw grass-top row
            for (var col = 0; col < cols; col++) {
                var x = col * TILE_W;

                // Grass top (green strip)
                ctx.fillStyle = '#4a7a2e'; // dark grass green
                ctx.fillRect(x, 0, TILE_W, 16);
                ctx.fillStyle = '#6ab040'; // bright grass green
                ctx.fillRect(x, 0, TILE_W, 10);
                // Add grass blade variation
                ctx.fillStyle = '#7ec850';
                for (var g = 0; g < 4; g++) {
                    var gx = x + Math.floor(Math.random() * TILE_W);
                    ctx.fillRect(gx, 0, 2, 6 + Math.floor(Math.random() * 6));
                }

                // Dirt fill below grass
                ctx.fillStyle = '#8b5e3c'; // brown dirt
                ctx.fillRect(x, 16, TILE_W, GROUND_H - 16);

                // Dirt texture variation
                ctx.fillStyle = '#7a4e2c';
                for (var d = 0; d < 6; d++) {
                    var dx = x + Math.floor(Math.random() * TILE_W);
                    var dy = 20 + Math.floor(Math.random() * (GROUND_H - 30));
                    ctx.fillRect(dx, dy, 4 + Math.floor(Math.random() * 8), 2 + Math.floor(Math.random() * 4));
                }

                // Small rocks
                ctx.fillStyle = '#6b4626';
                if (Math.random() > 0.7) {
                    var rx = x + Math.floor(Math.random() * (TILE_W - 8));
                    ctx.fillRect(rx, 22 + Math.floor(Math.random() * 20), 6, 4);
                }
            }

            console.log('[SCENE] Pixel art ground rendered (' + cols + ' tiles across ' + W + 'px)');
        };

        // Re-render on resize
        window.addEventListener('resize', function () {
            if (tileset.complete) tileset.onload();
        });
    })();

    var treeSources = [
        'assets/sunny-land/environment/props/tree.png',
        'assets/sunny-land/environment/props/pine.png',
        'assets/sunny-land/environment/props/palm.png',
        'assets/sunny-land/environment/props/tree-2.png'
    ];

    function createTree(config) {
        var tree = document.createElement('div');
        tree.className = 'tree-silhouette ' + config.layer;
        var src = treeSources[Math.floor(Math.random() * (config.srcCount || treeSources.length))];
        tree.style.cssText =
            'left:' + config.x + '%;' +
            'height:' + config.height + 'px;' +
            'width:' + (config.height * 0.7) + 'px;' +
            'animation-delay:' + config.delay + 's;' +
            '--tree-opacity:' + config.opacity + ';';
        var img = document.createElement('img');
        img.src = src;
        tree.appendChild(img);
        forest.appendChild(tree);
    }

    function createProp(config) {
        var prop = document.createElement('div');
        prop.className = 'foxy-prop ' + config.type + ' ' + (config.layer || 'layer-front');
        prop.id = config.id || ('prop-' + config.type);
        prop.style.cssText =
            'left:' + config.x + '%;' +
            'bottom:' + (config.bottom || 110) + 'px;' +
            'height:' + (config.height || 100) + 'px;' +
            'width:' + (config.width || 100) + 'px;' +
            'z-index:' + (config.zIndex || 50) + ';';

        var img = document.createElement('img');
        img.src = 'assets/sunny-land/environment/props/' + config.type + '.png';
        prop.appendChild(img);

        // Data for Foxy to "read"
        if (config.label) prop.dataset.label = config.label;
        if (config.note) prop.dataset.note = config.note;

        document.body.appendChild(prop);
    }

    function createWaterBowl(config) {
        var container = document.createElement('div');
        container.className = 'foxy-item water-bowl';
        container.id = 'prop-water-bowl';
        container.dataset.type = 'water';
        container.dataset.label = 'Fresh Water';

        container.style.cssText = `
            position: fixed;
            left: ${config.x}%;
            bottom: 110px;
            width: 50px;
            height: 25px;
            z-index: 55;
        `;

        // The bowl itself (CSS base)
        var bowl = document.createElement('div');
        bowl.className = 'bowl-base';

        // The water inside
        var water = document.createElement('div');
        water.className = 'water-fill';

        container.appendChild(bowl);
        container.appendChild(water);
        document.body.appendChild(container);
    }

    function createFoodBowl(config) {
        var container = document.createElement('div');
        container.className = 'foxy-item food-bowl';
        container.id = 'prop-food-bowl';
        container.dataset.type = 'food';
        container.dataset.label = 'Crunchy Kibble';

        container.style.cssText = `
            position: fixed;
            left: ${config.x}%;
            bottom: 110px;
            width: 50px;
            height: 25px;
            z-index: 55;
        `;

        var bowl = document.createElement('div');
        bowl.className = 'bowl-base food';

        var kibble = document.createElement('div');
        kibble.className = 'kibble-fill';

        container.appendChild(bowl);
        container.appendChild(kibble);
        document.body.appendChild(container);
    }

    // Back layer — 14 small dark trees
    for (var i = 0; i < 14; i++) {
        createTree({
            layer: 'layer-back',
            x: (i / 14) * 100 + (Math.random() * 6 - 3),
            height: 120 + Math.random() * 200,
            delay: 0.5 + i * 0.1,
            opacity: 0.3 + Math.random() * 0.3
        });
    }

    // Mid layer — 8 medium trees
    for (var j = 0; j < 8; j++) {
        createTree({
            layer: 'layer-mid',
            x: (j / 8) * 100 + (Math.random() * 10 - 5),
            height: 180 + Math.random() * 250,
            delay: 0.8 + j * 0.15,
            opacity: 0.3 + Math.random() * 0.25
        });
    }

    // Front layer — 4 large prominent trees at edges
    [-2, 8, 85, 95].forEach(function (x, idx) {
        createTree({
            layer: 'layer-front',
            x: x,
            height: 300 + Math.random() * 300,
            delay: 1.0 + idx * 0.2,
            opacity: 0.4 + Math.random() * 0.3,
            srcCount: 2
        });
    });

    // Fireflies
    for (var k = 0; k < 15; k++) {
        // ... (rest of firefly code kept same, just adding props before)
    }

    // Interactive Props
    createProp({
        type: 'house',
        id: 'prop-house',
        x: 15,
        height: 180,
        width: 180,
        zIndex: 5, // Behind Foxy
        label: 'The Pixel Den',
        note: 'Cozy and somewhat translucent.'
    });

    createProp({
        type: 'big-crate',
        id: 'prop-crate',
        x: 75,
        height: 60,
        width: 60,
        zIndex: 60, // In front of Foxy
        label: 'Mystery Crate',
        note: 'Vibrates slightly when you touch it.'
    });

    createProp({
        type: 'sign',
        id: 'prop-sign',
        x: 45,
        height: 50,
        width: 50,
        zIndex: 10,
        label: 'The Fourth Wall',
        note: 'It says: BEWARE OF THE CURSOR.'
    });

    // Refreshments
    createWaterBowl({ x: 35 });
    createFoodBowl({ x: 40 });

    // Fireflies
    for (var k = 0; k < 15; k++) {
        var ff = document.createElement('div');
        ff.className = 'firefly';
        ff.style.cssText =
            'left:' + (5 + Math.random() * 90) + '%;' +
            'top:' + (30 + Math.random() * 60) + '%;' +
            '--fx:' + ((Math.random() - 0.5) * 40) + 'px;' +
            '--fy:' + (-10 - Math.random() * 40) + 'px;' +
            '--fx2:' + ((Math.random() - 0.5) * 30) + 'px;' +
            '--fy2:' + (-20 - Math.random() * 50) + 'px;' +
            'animation:fireflyFloat ' + (4 + Math.random() * 4) + 's ease-in-out ' + (Math.random() * 5) + 's infinite;';
        document.body.appendChild(ff);
    }

})();
