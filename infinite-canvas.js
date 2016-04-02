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
            canvas: canvas,
            ctx: ctx,
            configuration: configuration
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
            // Takes a chunk position
            // returns corresponding (x, y) coordinates in the viewport
            return {
                x: (x * configuration.chunkWidth) - infinity.position.x,
                y: (y * configuration.chunkHeight) - infinity.position.y
            };
        }

        function getChunk(chunkId) {
            // we serialize the coordinate of a chunk with a key, computed from its x and y coordinates
            // say we have a chunk at {x: 1, y: 3}, then our chunks dict looks like
            // {
            //  ...
            //  "1, 3": ..chunkData
            //  ...
            // }
            // if the chunk doesn't exist, create it!
            if (Object.keys(infinity.chunks).indexOf(chunkId) === -1) {
                infinity.chunks[chunkId] = new Image(configuration.chunkWidth, configuration.chunkHeight);
            }

            // now that we're sure that it exists, return the motherfucker <3
            return infinity.chunks[chunkId];
        }

        function renderChunks(chunks) {
            Object.keys(chunks).forEach(function (key) {
                var coord = parseChunkKey(key);
                var renderCoordinate = chunkCoordToRenderCoord(coord.x, coord.y);
                try {
                    // drawImage can fail with <img> tags on firefox, this is a confirmed bug.
                    // see http://stackoverflow.com/a/18580878 for more details
                    ctx.drawImage(infinity.chunks[key], renderCoordinate.x, renderCoordinate.y);
                } catch (error) {
                    if (error.name == "NS_ERROR_NOT_AVAILABLE") {
                        // failed! This doesn't matter however, it easily gets painted hundreds of times
                        // in a few seconds.
                    } else {
                        throw error;
                    }
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
                    chunksInViewport[chunkKey] = getChunk(chunkKey);
                }
            }

            return chunksInViewport;
        }

        // =====================================
        //             API Methods
        // =====================================
        infinity.updateChunks = function () {
            // a way to speed up this method quite significantly is by preventing
            // updating chunks that did not change.
            // A really simple method would be to pass a bounding box to this function
            // only the chunks inside the bounding box will get updated, this will
            // remove a large part of the redundancy.
            // the bounding box will be generated by the caller
            // for example, draw a box around a path drawn with the mouse, and you have a
            // bounding box around all edited boxes.
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

                if (chunks[key].src) {
                    offscreenRenderCtx.drawImage(chunks[key], 0, 0);
                }

                // ..clear the visible part of the chunk
                offscreenRenderCtx.clearRect(putLocation.x, putLocation.y, width, height);
                // ..render the contents of the main canvas to the offscreen context
                offscreenRenderCtx.drawImage(canvas, chunkSourceCoord.x, chunkSourceCoord.y, width, height, putLocation.x, putLocation.y, width, height);
                // ..serialize the offscreen context
                infinity.chunks[key].src = offscreenRenderCtx.canvas.toDataURL();
                // ..finally, clear up the offscreen context so the contents won't be dupllicated to other chunks later in this loop
                offscreenRenderCtx.clearRect(0, 0, configuration.chunkWidth, configuration.chunkHeight);
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

        infinity.refresh = function () {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            infinity.moveBy(0, 0);
        };

        infinity.getAllChunks = function () {
            return infinity.chunks;
        };

        // expects a chunk-id, ex "2, 3" and an <img></img> with a src
        infinity.loadChunk = function (chunkId, chunk) {
            infinity.chunks[chunkId] = chunk;
            infinity.refresh();
        };

        return infinity;
    }

    window.infiniteCanvas = {
        initialize: initializeWorld
    };
}());
