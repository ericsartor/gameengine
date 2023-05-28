"use strict";
const bodySelect = document.querySelector("#bodyPicker");
const headSelect = document.querySelector("#headPicker");
const hairSelect = document.querySelector("#hairPicker");
const hairColor = document.querySelector("#hairColor");
const bodyColor = document.querySelector("#bodyColor");
const eyeColor = document.querySelector("#eyeColor");
const display = document.querySelector("#characterDisplay");
const body = new Image();
const head = new Image();
const hair = new Image();
const runCharacterCreator = () => {
    if (bodySelect && headSelect && hairSelect && hairColor && bodyColor && eyeColor && display) {
        const renderImage = (canvas) => {
            canvas.clearRect(0, 0, 64, 128);
            canvas.drawImage(body, 0, 64, 16, 32, 0, 0, 64, 128);
            canvas.drawImage(head, 0, 0, 16, 32, 0, 0, 64, 128);
            canvas.drawImage(hair, 0, 0, 16, 32, 0, 0, 64, 128);
            colorFilter(canvas);
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
        const hslToRgb = (h, s, l) => {
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
            const red = [];
            const green = [];
            const blue = [];
            const alpha = [];
            //Read image and make changes on the fly as it's read
            for (let i = 0; i < data.length; i += 4) {
                // Red value indicates hair color
                if (imgData.data[i] >= 200) {
                    const redValue = parseInt(hairColor.value.substring(1, 3), 16);
                    const greenValue = parseInt(hairColor.value.substring(3, 5), 16);
                    const blueValue = parseInt(hairColor.value.substring(5), 16);
                    const hsl = rgbToHsl(redValue, greenValue, blueValue);
                    switch (imgData.data[i]) {
                        case 201:
                            const dark = hslToRgb(hsl[0] - 4 < 0 ? hsl[0] - 4 + 360 : hsl[0] - 4, hsl[1], hsl[2] - 20 < 0 ? 0 : hsl[2] - 20);
                            red[i] = dark[0];
                            green[i] = dark[1];
                            blue[i] = dark[2];
                            alpha[i] = 255;
                            break;
                        case 225:
                            const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
                            red[i] = base[0];
                            green[i] = base[1];
                            blue[i] = base[2];
                            alpha[i] = 255;
                            break;
                        case 255:
                            const light = hslToRgb(hsl[0] + 4 > 360 ? hsl[0] + 4 - 360 : hsl[0] + 4, hsl[1] - 20 < 0 ? 0 : hsl[1] - 20, hsl[2]);
                            red[i] = light[0];
                            green[i] = light[1];
                            blue[i] = light[2];
                            alpha[i] = 255;
                            break;
                    }
                    // Green Color indicates body color
                }
                else if (imgData.data[i + 1] >= 82) {
                    const redValue = parseInt(bodyColor.value.substring(1, 3), 16);
                    const greenValue = parseInt(bodyColor.value.substring(3, 5), 16);
                    const blueValue = parseInt(bodyColor.value.substring(5), 16);
                    const hsl = rgbToHsl(redValue, greenValue, blueValue);
                    switch (imgData.data[i + 1]) {
                        case 82:
                            const darker = hslToRgb(hsl[0] - 8 < 0 ? hsl[0] - 8 + 360 : hsl[0] - 8, hsl[1], hsl[2] - 40 < 0 ? 0 : hsl[2] - 40);
                            red[i] = darker[0];
                            green[i] = darker[1];
                            blue[i] = darker[2];
                            alpha[i] = 255;
                            break;
                        case 204:
                            const dark = hslToRgb(hsl[0] - 4 < 0 ? hsl[0] - 4 + 360 : hsl[0] - 4, hsl[1], hsl[2] - 20 < 0 ? 0 : hsl[2] - 20);
                            red[i] = dark[0];
                            green[i] = dark[1];
                            blue[i] = dark[2];
                            alpha[i] = 255;
                            break;
                        case 225:
                            const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
                            red[i] = base[0];
                            green[i] = base[1];
                            blue[i] = base[2];
                            alpha[i] = 255;
                            break;
                        case 255:
                            const light = hslToRgb(hsl[0] + 4 > 360 ? hsl[0] + 4 - 360 : hsl[0] + 4, hsl[1] - 20 < 0 ? 0 : hsl[1] - 20, hsl[2]);
                            red[i] = light[0];
                            green[i] = light[1];
                            blue[i] = light[2];
                            alpha[i] = 255;
                            break;
                    }
                    // Blue Color indicates eye color
                }
                else if (imgData.data[i + 2] >= 255) {
                    const redValue = parseInt(eyeColor.value.substring(1, 3), 16);
                    const greenValue = parseInt(eyeColor.value.substring(3, 5), 16);
                    const blueValue = parseInt(eyeColor.value.substring(5), 16);
                    const hsl = rgbToHsl(redValue, greenValue, blueValue);
                    const base = hslToRgb(hsl[0], hsl[1], hsl[2]);
                    red[i] = base[0];
                    green[i] = base[1];
                    blue[i] = base[2];
                    alpha[i] = 255;
                    // Color should not change
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
            const displayContext = display.getContext("2d");
            if (displayContext) {
                displayContext.imageSmoothingEnabled = false;
                body.src = "./CharacterTest/Body/Body_Walk_M_NoTop.png";
                body.onload = () => {
                    renderImage(displayContext);
                };
                head.onload = () => {
                    renderImage(displayContext);
                };
                hair.onload = () => {
                    renderImage(displayContext);
                };
                body.src = "./CharacterTest/Body/Body_Walk_M_Top.png";
                head.src = "./CharacterTest/Head/Head_1.png";
                hair.src = "./CharacterTest/Hair/Hair_1.png";
                bodySelect === null || bodySelect === void 0 ? void 0 : bodySelect.addEventListener("change", (e) => {
                    switch (e.target.value) {
                        case "Masculine":
                            body.src = "./CharacterTest/Body/Body_Walk_M_NoTop.png";
                            break;
                        case "Masculine (No Top)":
                            body.src = "./CharacterTest/Body/Body_Walk_M_NoTopTest.png";
                            break;
                        case "Feminine":
                            body.src = "./CharacterTest/Body/Body_Walk_F_Top.png";
                            break;
                        case "Feminine (No Top)":
                            body.src = "./CharacterTest/Body/Body_Walk_F_NoTop.png";
                            break;
                    }
                });
                headSelect === null || headSelect === void 0 ? void 0 : headSelect.addEventListener("change", (e) => {
                    switch (e.target.value) {
                        case "Head 1":
                            head.src = "./CharacterTest/Head/Head_1Test.png";
                            break;
                        case "Head 2":
                            head.src = "./CharacterTest/Head/Head_1.png";
                            break;
                        case "Head 3":
                            head.src = "./CharacterTest/Head/Head_3.png";
                            break;
                        case "Head 4":
                            head.src = "./CharacterTest/Head/Head_4.png";
                            break;
                    }
                });
                hairSelect === null || hairSelect === void 0 ? void 0 : hairSelect.addEventListener("change", (e) => {
                    switch (e.target.value) {
                        case "No Hair":
                            hair.src = "./CharacterTest/blank.png";
                            break;
                        case "Hair 1":
                            hair.src = "./CharacterTest/Hair/Hair_1.png";
                            break;
                        case "Hair 2":
                            hair.src = "./CharacterTest/Hair/Hair_2.png";
                            break;
                        case "Hair 3":
                            hair.src = "./CharacterTest/Hair/Hair_3.png";
                            break;
                        case "Hair 4":
                            hair.src = "./CharacterTest/Hair/Hair_4.png";
                            break;
                    }
                });
                bodyColor === null || bodyColor === void 0 ? void 0 : bodyColor.addEventListener("change", () => {
                    renderImage(displayContext);
                });
                hairColor === null || hairColor === void 0 ? void 0 : hairColor.addEventListener("change", (e) => {
                    renderImage(displayContext);
                });
                eyeColor === null || eyeColor === void 0 ? void 0 : eyeColor.addEventListener("change", (e) => {
                    renderImage(displayContext);
                });
            }
        }
        else {
            alert("failure");
        }
    }
};
runCharacterCreator();
