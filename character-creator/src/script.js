"use strict";
// import bodyImages from "./images/*.png";
// const body_1 = require("./photos/PNGbackground.png")
const bodySelect = document.querySelector('#bodyPicker');
const headSelect = document.querySelector('#headPicker');
const hairSelect = document.querySelector('#hairPicker');
const hairColor = document.querySelector('#hairColor');
const bodyColor = document.querySelector('#bodyColor');
const display = document.querySelector('#characterDisplay');
const body = new Image();
const head = new Image();
const hair = new Image();
const renderImage = (canvas) => {
    canvas.clearRect(0, 0, 64, 128);
    canvas.drawImage(body, 0, 64, 16, 32, 0, 0, 64, 128);
    canvas.drawImage(head, 0, 0, 16, 32, 0, 0, 64, 128);
    canvas.drawImage(hair, 0, 0, 16, 32, 0, 0, 64, 128);
};
const rgbToHsl = (r, g, b) => {
    (r /= 255), (g /= 255), (b /= 255);
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h = (max + min) / 2;
    let s = (max + min) / 1;
    let l = (max + min) / 2;
    if (max === min) {
        h = 0;
        s = 0; // achromatic
    }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
};
const HslToRgb = (h, s, l) => {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
};
const colorFilter = (canvas) => {
    //Declare variables
    const imgData = canvas.getImageData(0, 0, 64, 128);
    const data = imgData.data;
    const red = new Array();
    const green = new Array();
    const blue = new Array();
    const alpha = new Array();
    //Read image and make changes on the fly as it's read
    for (let i = 0; i < data.length; i += 4) {
        if (imgData.data[i] >= 200) {
            switch (imgData.data[i + 1]) {
                case 200:
                    red[i] = 0;
                    green[i] = 0;
                    blue[i] = 0;
                    alpha[i] = 0;
                    break;
            }
        }
        else if (imgData.data[i + 1] >= 200) {
            switch (imgData.data[i + 1]) {
                case 200:
                    red[i] = 0;
                    green[i] = 0;
                    blue[i] = 0;
                    alpha[i] = 0;
                    break;
            }
        }
        else if (imgData.data[i + 2] >= 200) {
            switch (imgData.data[i + 1]) {
                case 200:
                    red[i] = 0;
                    green[i] = 0;
                    blue[i] = 0;
                    alpha[i] = 0;
                    break;
            }
        }
        else {
            red[i] = imgData.data[i];
            green[i] = imgData.data[i + 1];
            blue[i] = imgData.data[i + 2];
            alpha[i] = imgData.data[i + 3];
        }
    }
    // Write the image back to the canvas
    for (let i = 0; i < data.length; i += 4) {
        imgData.data[i] = red[i];
        imgData.data[i + 1] = green[i];
        imgData.data[i + 2] = blue[i];
        imgData.data[i + 3] = alpha[i];
    }
    canvas.putImageData(imgData, 0, 0);
};
if (display) {
    const displayContext = display.getContext('2d');
    if (displayContext) {
        displayContext.imageSmoothingEnabled = false;
        bodySelect === null || bodySelect === void 0 ? void 0 : bodySelect.addEventListener('change', (e) => {
            switch (e.target.value) {
                case 'Masculine':
                    body.src = './CharacterTest/Body/Body_Walk_M_NoTop.png';
                    break;
                case 'Masculine (No Top)':
                    body.src = './CharacterTest/Body/Body_Walk_M_Top.png';
                    break;
                case 'Feminine':
                    body.src = './CharacterTest/Body/Body_Walk_F_Top.png';
                    break;
                case 'Feminine (No Top)':
                    body.src = './CharacterTest/Body/Body_Walk_F_NoTop.png';
                    break;
            }
            body.onload = () => {
                renderImage(displayContext);
            };
        });
        headSelect === null || headSelect === void 0 ? void 0 : headSelect.addEventListener('change', (e) => {
            switch (e.target.value) {
                case 'Head 1':
                    head.src = './CharacterTest/Head/Head_1.png';
                    break;
                case 'Head 2':
                    head.src = './CharacterTest/Head/Head_2.png';
                    break;
                case 'Head 3':
                    head.src = './CharacterTest/Head/Head_3.png';
                    break;
                case 'Head 4':
                    head.src = './CharacterTest/Head/Head_4.png';
                    break;
            }
            head.onload = () => {
                renderImage(displayContext);
            };
        });
        hairSelect === null || hairSelect === void 0 ? void 0 : hairSelect.addEventListener('change', (e) => {
            switch (e.target.value) {
                case 'Hair 1':
                    hair.src = './CharacterTest/Hair/Hair_1.png';
                    break;
                case 'Hair 2':
                    hair.src = './CharacterTest/Hair/Hair_2.png';
                    break;
                case 'Hair 3':
                    hair.src = './CharacterTest/Hair/Hair_3.png';
                    break;
                case 'Hair 4':
                    hair.src = './CharacterTest/Hair/Hair_4.png';
                    break;
            }
            hair.onload = () => {
                renderImage(displayContext);
            };
        });
        bodyColor === null || bodyColor === void 0 ? void 0 : bodyColor.addEventListener('change', (e) => {
            console.log(e.target.value, e);
        });
    }
}
else {
    alert('failure');
}
