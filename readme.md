Infinite canvas
===============

Infinite canvas is an automatically expanding, or lazy-loading, canvas.

Usage
-----

```js
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

// Initialization
var inf_ctx = infinity(ctx);

// Draw something
ctx.fillRect(canvas.width/2, canvas.height/2, 50, 50);

inf_ctx.updateChunks();

// Move the "view" or "camera"
inf_ctx.moveTo(100, 100); // absolute panning, move to (100, 100)
inf_ctx.moveBy(5, 5); // relative panning, move to (105, 105)
```

Because of how the infinite canvas works internally, you need to call `inf_ctx.updateChunks()` every time after anything has been drawn to the canvas. The visible canvas element should be treated as a "view" into the infinite canvas's chunk buffer, anything drawn needs to be synced to the underlying buffers before you move the canvas because the canvas "view" is cleared whenever it is moved.

Here's a simple drawing application example. Draw with the left mouse button, pan with the middle or right mouse button. Note that neary all of the code is boilerplate for the drawing application itself, notable code is highlighted.

```js
// create the canvas element and append it to the document
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/*
* * * * * * * * * * * * * *
*  Infinite canvas code!  *
* * * * * * * * * * * * * *
*/
// Initialize the infinite canvas buffer underneath the context
var inf_ctx = infiniteCanvas.initialize(ctx);

// Prepare some variables for the dragging gestures logic
var mouseIsDown = false;
var middleOrRightIsDown = false;
var previousMousePosition;

canvas.addEventListener("mousedown", function (event) {
    // 1 is leftmousebutton, 2 is middle, 3 is left
    if (event.which === 1) {
        mouseIsDown = true;
    } else {
        middleOrRightIsDown = true;
    }
});

window.addEventListener("mouseup", function (event) {
    // When leftmousebutton is released, synchronise the newly
    // drawn scribbles to the underlying buffer chunks
    if (event.which === 1) {
        mouseIsDown = false;
        /*
        * * * * * * * * * * * * * *
        *  Infinite canvas code!  *
        * * * * * * * * * * * * * *
        */
        inf_ctx.updateChunks();
    } else {
        middleOrRightIsDown = false;
    }
});

window.addEventListener("mousemove", function (event) {
    var newMousePosition = {x: event.offsetX, y: event.offsetY};

    if (mouseIsDown) {
        // draw lines when dragging with the left mosue button
        if (previousMousePosition) {
            ctx.beginPath();
            ctx.moveTo(previousMousePosition.x, previousMousePosition.y);
            ctx.lineTo(newMousePosition.x     , newMousePosition.y);
            ctx.stroke();
        }
    } else if (middleOrRightIsDown) {
        // pan the canvas whenever dragging with the middle or right mouse button
        var dx = previousMousePosition.x - newMousePosition.x;
        var dy = previousMousePosition.y - newMousePosition.y;
        // Canvas gets really messy if you do not clear it up :)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        /*
        * * * * * * * * * * * * * *
        *  Infinite canvas code!  *
        * * * * * * * * * * * * * *
        */
        inf_ctx.moveBy(dx, dy);
    }

    previousMousePosition = newMousePosition;
});
```

Limitations
-----------

Infinite canvas can be slow on older devices or high-resolution displays, 1920x1080 and above, this is a limitation that *can* improve over time however.

It is not possible to draw to the infinite canvas while panning the screen, disable user-input while panning.

While Infinite canvas was designed with speed in mind, it was developed on a modern device, do not expect this to work well on older hardware at all. Additionally, it takes a lot of time to process `updateChunks()` calls on very high resolution displays.

The infinite canvas is *not well suited* for real-time applications like games, and real-time data displays, updating chunks takes a few hundred milliseconds, this operation cannot realistically be performed 60 times per second, let alone more than twice.

Non-issues
----------

Infinite canvas uses surprisingly "little" memory when working with **huge** areas, each chunk only takes up a few MB of space, 500 chunks, which is a little over 60 full HD screens, will easily fit into the memory of any modern device.

Future
------

My motivation to build the infinite canvas was to build an application on top of, I want to build a paint-like application with an infinitely expanding canvas, and more importantly, I want to save this infinite canvas to a server and load it whenever the application loads up! To be able to build this, the infinite canvas needs to support loading and saving chunks to a server. This functionality will be added later on.

I'm thinking about implementing an undo system as well, depending on if I find it to be necessary or not.

Contribution
------------

If you'd like to contribute, I'd love it if you would look into performance or cross-browser compatibility.
