"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intToRGB = exports.createIconB64 = exports.randomHexColorCode = void 0;
exports.randomHexColorCode = () => {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return "#" + n.slice(0, 6);
};
exports.createIconB64 = (color) => {
    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg1.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg1.setAttribute("width", "10");
    svg1.setAttribute("height", "10");
    const cir1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cir1.setAttribute("cx", "5");
    cir1.setAttribute("cy", "5");
    cir1.setAttribute("r", "5");
    cir1.setAttribute("fill", color);
    svg1.appendChild(cir1);
    return "data:image/svg+xml;base64," + window.btoa(svg1.outerHTML);
};
const hashCode = (str) => {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
};
exports.intToRGB = (str) => {
    const i = hashCode(str);
    var c = (i & 0x00ffffff).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
};
//# sourceMappingURL=generateTopicColor.js.map