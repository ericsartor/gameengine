"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __png_1 = __importDefault(require("./images/*.png"));
// const body_1 = require("./photos/PNGbackground.png")
const bodySelect = document.querySelector("#bodyPicker");
const headSelect = document.querySelector("#headPicker");
const hairSelect = document.querySelector("#hairPicker");
const display = document.querySelector("#characterDisplay");
if (display) {
    const displayContext = display.getContext("2d");
    displayContext === null || displayContext === void 0 ? void 0 : displayContext.drawImage(__png_1.default[0], 0, 0);
}
else {
    alert("failure");
}
