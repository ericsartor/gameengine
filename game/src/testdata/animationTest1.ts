export const animationTest1 = {
    "spritesheetImage": "/testdata/walkAnimationTest.png",
    "imageSize": {
        "width": 16,
        "height": 32
    },
    "animations": [
        {
            "name": "idle",
            "timeline": [
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 1, "y": 2, "durationMs": 500, "empty": false },
            ]
        },
        {
            "name": "walk-left",
            "timeline": [
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 0, "y": 1, "durationMs": 500, "empty": false },
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 2, "y": 1, "durationMs": 500, "empty": false }
            ]
        },
        {
            "name": "walk-right",
            "timeline": [
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 0, "y": 0, "durationMs": 500, "empty": false },
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 2, "y": 0, "durationMs": 500, "empty": false }
            ]
        },
        {
            "name": "run-left",
            "timeline": [
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 0, "y": 1, "durationMs": 500, "empty": false },
                { "x": 1, "y": 1, "durationMs": 500, "empty": false },
                { "x": 0, "y": 1, "durationMs": 500, "empty": false },
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 2, "y": 1, "durationMs": 500, "empty": false },
                { "x": 3, "y": 1, "durationMs": 500, "empty": false },
                { "x": 2, "y": 1, "durationMs": 500, "empty": false }
            ]
        },
        {
            "name": "run-right",
            "timeline": [
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 0, "y": 0, "durationMs": 500, "empty": false },
                { "x": 0, "y": 1, "durationMs": 500, "empty": false },
                { "x": 0, "y": 0, "durationMs": 500, "empty": false },
                { "x": 0, "y": 2, "durationMs": 500, "empty": false },
                { "x": 2, "y": 0, "durationMs": 500, "empty": false },
                { "x": 3, "y": 0, "durationMs": 500, "empty": false },
                { "x": 2, "y": 0, "durationMs": 500, "empty": false }
            ]
        }
    ]
};