const rgbToHsl = (r: number, g: number, b: number) => {
	(r /= 255), (g /= 255), (b /= 255);

	let max = Math.max(r, g, b);
	let min = Math.min(r, g, b);
	let h: number = (max + min) / 2;
	let s: number = (max + min) / 1;
	let l: number = (max + min) / 2;

	if (max === min) {
		h = 0;
		s = 0; // achromatic
	} else {
		let d: number = max - min;
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

const hslToRgb = (h: number, s: number, l: number) => {
	s /= 100;
	l /= 100;
	const k = (n: any) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: any) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [255 * f(0), 255 * f(8), 255 * f(4)];
};

const lightnessCheck = (lightness: number, selection: number[]) => {
	switch (lightness) {
		case 39: // Dark Color
			return hslToRgb(
				selection[0] - 4 < 0 ? selection[0] - 4 + 360 : selection[0] - 4,
				selection[1],
				selection[2] - 20 < 0 ? 0 : selection[2] - 20,
			);
		case 44: // Base Color
			return hslToRgb(selection[0], selection[1], selection[2]);
		case 50: // Light Color
			return hslToRgb(
				selection[0] + 4 > 360 ? selection[0] + 4 - 360 : selection[0] + 4,
				selection[1] - 20 < 0 ? 0 : selection[1] - 20,
				selection[2],
			);
		default:
			return [0, 0, 0];
	}
};

export type ColorFilterSelections = [
	string | null,
	string | null,
	string | null,
	string | null,
	string | null,
	string | null,
];
export const colorFilter = (ctx: CanvasRenderingContext2D, selections: ColorFilterSelections) => {
	const [
		redChannelColorSelection,
		greenChannelColorSelection,
		blueChannelColorSelection,
		magentaChannelColorSelection,
		yellowChannelColorSelection,
		cyanChannelColorSelection,
	] = selections;

	//Declare variables
	const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	const data = imgData.data;

	const red: number[] = [];
	const green: number[] = [];
	const blue: number[] = [];
	const alpha: number[] = [];

	//Read image and make changes on the fly as it's read
	for (let i: number = 0; i < data.length; i += 4) {
		const HSLOfCurrentPixel = rgbToHsl(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]);

		let newRGBValue = [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]];

		switch (HSLOfCurrentPixel[0]) {
			case 0: {
				// Red Hue
				if (!redChannelColorSelection) break;
				const redValue = parseInt(redChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(redChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(redChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
			case 60: {
				// Yellow Hue
				if (!yellowChannelColorSelection) break;
				const redValue = parseInt(yellowChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(yellowChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(yellowChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
			case 120: {
				// Green Hue
				if (!greenChannelColorSelection) break;
				const redValue = parseInt(greenChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(greenChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(greenChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
			case 180: {
				// Cyan Hue
				if (!cyanChannelColorSelection) break;
				const redValue = parseInt(cyanChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(cyanChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(cyanChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
			case 240: {
				// Blue Hue
				if (!blueChannelColorSelection) break;
				const redValue = parseInt(blueChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(blueChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(blueChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
			case 300: {
				// Magenta Hue
				if (!magentaChannelColorSelection) break;
				const redValue = parseInt(magentaChannelColorSelection.substring(1, 3), 16);
				const greenValue = parseInt(magentaChannelColorSelection.substring(3, 5), 16);
				const blueValue = parseInt(magentaChannelColorSelection.substring(5), 16);
				const HSLOfSelection = rgbToHsl(redValue, greenValue, blueValue);
				newRGBValue = lightnessCheck(HSLOfCurrentPixel[2], HSLOfSelection);
				break;
			}
		}
		red[i] = newRGBValue[0];
		green[i] = newRGBValue[1];
		blue[i] = newRGBValue[2];
		alpha[i] = imgData.data[i + 3];
	}

	// Write the image back to the canvas
	for (let i = 0; i < data.length; i += 4) {
		imgData.data[i] = red[i];
		imgData.data[i + 1] = green[i];
		imgData.data[i + 2] = blue[i];
		imgData.data[i + 3] = alpha[i];
	}

	ctx.putImageData(imgData, 0, 0);
};
