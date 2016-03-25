(function () {
    // Chunksize might not be optimal. It has been found that really small chunk sizes
    // have a (very) negative impact on performance, other than that, not much experimentation
    // has been done with the chunksizes.
    var configuration = {
        chunkWidth: 500,
        chunkHeight: 500
    };

    function initializeWorld(ctx) {
        var offscreenRenderCanvas    = document.createElement("canvas");
        var offscreenRenderCtx       = offscreenRenderCanvas.getContext("2d");

        offscreenRenderCanvas.width  = configuration.chunkWidth;
        offscreenRenderCanvas.height = configuration.chunkHeight;

        var canvas                   = ctx.canvas;

        // This function needs to take into account asynchronous loading of position data later!
        var infinity = {
            position: {
                x: 0,
                y: 0
            },
            // stores ImageData per chunk, used to draw on
            chunks: {},
            // stores ImageBitmap per chunk, used for rendering, significantly faster than ImageData rendering
            images: {}
        };

        function constructChunkKey(x, y) {
            // chunk keys look like "0, 1"
            return x.toString() + ", " + y.toString();
        }

        function parseChunkKey(key) {
            var split = key.split(", ");

            return {
                x: parseInt(split[0]),
                y: parseInt(split[1])
            };
        }

        function worldCoordToChunkCoord(x, y) {
            // Takes a position in the world
            // returns the coordinate of the grid this position lies in

            return {
                x: Math.floor(x / configuration.chunkWidth),
                y: Math.floor(y / configuration.chunkHeight)
            };
        }

        function chunkCoordToWorldCoord(x, y) {
            return {
                x: x * configuration.chunkWidth,
                y: y * configuration.chunkHeight
            };
        }

        function chunkCoordToRenderCoord(x, y) {
            return {
                x: (x * configuration.chunkWidth) - infinity.position.x,
                y: (y * configuration.chunkHeight) - infinity.position.y
            };
        }

        function getChunk(x, y) {
            // we serialize the coordinate of a chunk with a key, computed from its x and y coordinates
            // say we have a chunk at {x: 1, y: 3}, then our chunks dict looks like
            // {
            //  ...
            //  "1, 3": ..chunkData
            //  ...
            // }
            var chunkKey = constructChunkKey(x, y);

            // if the chunk doesn't exist, create it!
            if (Object.keys(infinity.chunks).indexOf(chunkKey) === -1) {
                infinity.chunks[chunkKey] = ctx.createImageData(configuration.chunkWidth, configuration.chunkHeight);
            }

            // now that we're sure that it exists, return the motherfucker <3
            return infinity.chunks[chunkKey];
        }

        function renderChunks(chunks) {
            Object.keys(chunks).forEach(function (key) {
                var coord = parseChunkKey(key);
                var renderCoordinate = chunkCoordToRenderCoord(coord.x, coord.y);

                if (Object.keys(infinity.images).indexOf(key) !== -1) {
                    // drawImage is IMMENSELY faster compared to putImageData
                    ctx.drawImage(infinity.images[key], renderCoordinate.x, renderCoordinate.y);
                } else {
                    // fall back to putImageData if the createImageData is not supported in the browser
                    var chunk = getChunk(coord.x, coord.y);
                    ctx.putImageData(chunk, renderCoordinate.x, renderCoordinate.y);
                }
            });
        }

        function getChunksInViewport() {
            var chunksInViewport = {};

            // we need to figure out what chunks are in the viewport
            // what we need to do is find the coordinates of the chunks in the four corners
            // and then retrieve those chunks, as well as all chunks inbetween those corners
            var topLeft     = worldCoordToChunkCoord(infinity.position.x,                infinity.position.y);
            var bottomRight = worldCoordToChunkCoord(infinity.position.x + canvas.width, infinity.position.y + canvas.height);

            var chunksOnXAxis = Math.abs(topLeft.x - bottomRight.x);
            var chunksOnYAxis = Math.abs(topLeft.y - bottomRight.y);

            // <= instead of < because we definitely need to include the outer layer of chunks as well!
            for (var x = 0; x <= chunksOnXAxis; x++) {
                for (var y = 0; y <= chunksOnYAxis; y++) {
                    var chunkKey               = constructChunkKey(topLeft.x + x, topLeft.y + y);
                    chunksInViewport[chunkKey] = getChunk(topLeft.x + x, topLeft.y + y);
                }
            }

            return chunksInViewport;
        }

        // =====================================
        //             API Methods
        // =====================================
        infinity.updateChunks = function () {
            var chunks = getChunksInViewport();

            Object.keys(chunks).forEach(function (key) {
                var coord           = parseChunkKey(key);
                var renderCoord     = chunkCoordToRenderCoord(coord.x, coord.y);
                var chunkWorldCoord = chunkCoordToWorldCoord(coord.x, coord.y);

                var chunkSourceCoord = {
                    x: Math.max(renderCoord.x, 0),
                    y: Math.max(renderCoord.y, 0)
                };

                var width  = Math.min(renderCoord.x + configuration.chunkWidth , canvas.width)  - chunkSourceCoord.x;
                var height = Math.min(renderCoord.y + configuration.chunkHeight, canvas.height) - chunkSourceCoord.y;

                // don't even bother to update chunks that are not even visible on the canvas! :o
                if (width <= 0 || height <= 0) return;

                var putLocation = {
                    x: configuration.chunkWidth - width,
                    y: configuration.chunkHeight - height
                };

                if (chunkWorldCoord.x >= infinity.position.x) {
                    putLocation.x = 0;
                }

                if (chunkWorldCoord.y >= infinity.position.y) {
                    putLocation.y = 0;
                }

                // ..simply load the chunk into the render context, nothing special here
                offscreenRenderCtx.putImageData(chunks[key], 0, 0);
                // ..now get the corresponding data from the canvas and put it into the chunk
                // clear the chunk beforehand, otherwise transparent pixels (anti-aliasing) will accumulate
                // resulting in ugly thick lines
                offscreenRenderCtx.clearRect(putLocation.x, putLocation.y, width, height);
                offscreenRenderCtx.drawImage(canvas, chunkSourceCoord.x, chunkSourceCoord.y, width, height, putLocation.x, putLocation.y, width, height);
                // ..overwrite the storage chunk to the just rendered one
                infinity.chunks[key] = offscreenRenderCtx.getImageData(0, 0, configuration.chunkWidth, configuration.chunkHeight);
                // createImageBitmap gives us a HUGE performance increase during padding, use it if it's available
                // I don't want to use this as a default, because even the latest version of chrome doesn't support it,
                // only firefox dev edition does
                // note that by using this, we're effectively doubling the amount of memory used per chunk.. not very nice
                if (window.createImageBitmap) {
                    createImageBitmap(offscreenRenderCtx).then(function (bmp) {
                        infinity.images[key] = bmp;
                    });
                }
            });
        };

        infinity.moveBy = function(dx, dy, render) {
            // default `render` to true, only skip rendering when it's false
            render = render === undefined? true : render;
            infinity.position.x += dx;
            infinity.position.y += dy;

            if (render) {
                renderChunks(getChunksInViewport());
            }
        };

        infinity.moveTo = function(x, y, render) {
            // default `render` to true, only skip rendering when it's false
            render = render === undefined? true : render;
            infinity.position.x = x;
            infinity.position.y = y;

            if (render) {
                renderChunks(getChunksInViewport());
            }
        };

        return infinity;
    }

    window.infiniteCanvas = {
        initialize: initializeWorld
    };
}());
