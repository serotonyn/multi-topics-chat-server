"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIconB64 = void 0;
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
//# sourceMappingURL=createIconB64.js.map