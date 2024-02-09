/**
 * @author mrdoob / http://mrdoob.com/
 */

var MiniMap = function (zombies, camera) {

    var mode = 0;


    var container = document.createElement('div');
    container.style.cssText = 'opacity:0.9;z-index:10000';
    window.addEventListener('keydown', function (event) {
        if (event.code == 'KeyZ') {

            event.preventDefault();
            showPanel(++mode % container.children.length);
        }
    }, false);

    //

    function addPanel(panel) {

        container.appendChild(panel.dom);
        return panel;

    }

    function showPanel(id) {

        for (var i = 0; i < container.children.length; i++) {

            container.children[i].style.display = i === id ? 'block' : 'none';

        }

        mode = id;

    }

    //

    var beginTime = (performance || Date).now(), prevTime = beginTime, frames = 0;


    var miniMapPanel = addPanel(new MiniMap.Panel('MiniMap', '#ffb000', '#282828'));


    showPanel(0);

    return {

        REVISION: 16,

        dom: container,

        addPanel: addPanel,
        showPanel: showPanel,

        begin: function () {

            beginTime = (performance || Date).now();

        },

        end: function () {

            frames++;

            var time = (performance || Date).now();

            msPanel.update(time - beginTime, 200);

            if (time >= prevTime + 1000) {

                fpsPanel.update((frames * 1000) / (time - prevTime), 100);

                prevTime = time;
                frames = 0;

                if (memPanel) {

                    var memory = performance.memory;
                    memPanel.update(memory.usedJSHeapSize / 1048576, memory.jsHeapSizeLimit / 1048576);

                }

            }

            return time;

        },

        updateMap: function () {



            miniMapPanel.updateZombiePoint(zombies, camera);




        },


        update: function () {

            //beginTime = this.end();

            this.updateMap();

        },

        // Backwards Compatibility

        domElement: container,
        setMode: showPanel

    };

};

MiniMap.Panel = function (name, fg, bg) {


    var PR = Math.round(window.devicePixelRatio || 1);

    let sizeFactor = 3;

    var WIDTH = 80 * sizeFactor * PR;
    var HEIGHT = 24 * sizeFactor * PR;
    var TEXT_X = 3 * PR;
    var TEXT_Y = 2 * PR;




    var canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = `width:${80 * sizeFactor}px;height:${24 * sizeFactor}px;`;


    var context = canvas.getContext('2d');
    context.font = 'bold ' + (9 * PR) + 'px Helvetica,Arial,sans-serif';
    context.textBaseline = 'top';

    return {

        dom: canvas,

        updateZombiePoint: function (zombies, camera) {

            //postion 
            //Z de la map vont de -55 à 40 
            //X pour -20 à 20

            context.clearRect(0, 0, WIDTH, HEIGHT);
            context.fillStyle = bg;
            context.globalAlpha = 1;
            context.fillRect(0, 0, WIDTH, HEIGHT);
            context.fillStyle = fg;
            context.fillText(name, TEXT_X, TEXT_Y);

            context.fillStyle = '#00ff66';
            context.globalAlpha = 1;

            context.fillRect((camera.position.z + 55) * 5, ((0 - camera.position.x + 20) * 4), 5, 5);


            for (let i = 0; i < zombies.length; i++) {

                context.fillStyle = '#AF2413';
                context.globalAlpha = 1;
                //postion 
                //Z de la map vont de -55 à 40 
                //X pour -20 à 20

                context.fillRect((zombies[i].position.z + 55) * 5, (zombies[i].position.x + 20) * 4, 8, 8);
            }


        },


    }

};


export { MiniMap };