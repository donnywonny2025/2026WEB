/* ═══════════════════════════════════════════
   FOREST-GEN.JS — Pixel art tree silhouettes
   Generates layered forest background + fireflies
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    var forest = document.getElementById('forestLayer');
    if (!forest) return;

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
