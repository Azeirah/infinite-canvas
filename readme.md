Infinite canvas
===============

Infinite canvas is an automatically expanding, or lazy-loading, canvas.

Usage
=====

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

Because of how the infinite canvas [works internally](#internals), you need to call `inf_ctx.updateChunks()` every time after anything has been drawn to the canvas. The visible HTML5 canvas element should be treated as a "view" and "controller" into the infinite canvas's huge chunk buffer, anything drawn needs to be synced to the underlying buffers before you move the canvas because the canvas "view" is cleared whenever it is moved.

Here's a simple drawing application example. Draw with the left mouse button, pan with the middle or right mouse button.
```js
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerheight;

// Initialization
var inf_ctx = infinity(ctx);

// this is the simplest drawing application code
var mouseIsDown = false;
var previousMousePosition;

canvas.addEventListener("mousedown", function () {
    mouseIsDown = true;
});

window.addEventListener("mouseup", function () {
    mouseIsDown = false;
    inf_ctx.updateChunks();
});

window.addEventListener("mousemove", function (event) {
    if (mouseIsDown) {
        var newMousePosition = {x: event.clientX, y: event.clientY};

        // if dragging with the left mouse button
        if (event.which === 1) {
            if (previousMousePosition) {
                ctx.beginPath();
                ctx.moveTo(previousMousePosition.x, previousMousePosition.y);
                ctx.lineTo(newMousePosition.x     , newMousePosition.y);
                ctx.stroke();
            }
        } else {
            // pan the canvas whenever dragging with the middle or right mouse button
            var dx = previousMousePosition.x - newMousePosition.x;
            var dy = previousMousePosition.y - newMousePosition.y;
            inf_ctx.moveBy(dx, dy);
        }

        previousMousePosition = newMousePosition;
    }
});
```

Limitations
===========

Infinite canvas can be slow on older devices or high-resolution displays, 1920x1080 and above, this is a limitation that *can* improve over time however.

It is not possible to draw to the infinite canvas while panning the screen, disable user-input while panning.

While Infinite canvas was designed with speed in mind, it was developed on a modern device, do not expect this to work well on older hardware at all. Additionally, it takes a lot of time to process `updateChunks()` calls on very high resolution displays.

The infinite canvas is *not well suited* for real-time applications like games, and real-time data displays, updating chunks takes a few hundred milliseconds, this operation cannot realistically be performed 60 times per second, let alone more than twice.

Non-issues
==========

Infinite canvas uses surprisingly "little" memory when working with **huge** areas, each chunk only takes up a few MB of space, 500 chunks, which is a little over 60 full HD screens, will easily fit into the memory of any modern device.

Future
======

My motivation to build the infinite canvas was to build a persistent lazy-loading infinite drawing canvas I can play around with. To be able to build this, the infinite canvas needs to support loading and saving chunks to a server. This functionality will be added later on.

I'm thinking about implementing an undo system as well, depending on if I find it to be necessary or not.

Contribution
============

If you'd like to contribute, I'd love it if you would look into performance or cross-browser compatibility.
