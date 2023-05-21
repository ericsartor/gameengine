import bodyImages from "./images/*.png";
// const body_1 = require("./photos/PNGbackground.png")

const bodySelect = document.querySelector("#bodyPicker");
const headSelect = document.querySelector("#headPicker");
const hairSelect = document.querySelector("#hairPicker");
const display: HTMLCanvasElement | null = document.querySelector("#characterDisplay");
if (display) {
	const displayContext = display.getContext("2d");
	displayContext?.drawImage(bodyImages[0], 0, 0);
} else {
	alert("failure");
}
