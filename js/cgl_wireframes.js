/******/ (() => { // webpackBootstrap
/******/ 	// runtime can't be in strict mode because a global variable is assign and maybe created.
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  WireframeCube: () => (/* reexport */ WireframeCube),
  WireframeRect: () => (/* reexport */ WireframeRect)
});

;// CONCATENATED MODULE: ./src/corelibs/cgl_wireframes/cgl_wireframecube.js


class WireframeCube
{
    constructor(_cgl)
    {
        this.cgl = _cgl;
        this.geom = new CGL.Geometry("marker");
        this.geom.setPointVertices(
            [
                // frontal
                -1, -1, 1,
                1, -1, 1,

                1, 1, 1,
                -1, 1, 1,

                -1, -1, -1,
                1, -1, -1,

                -1, 1, -1,
                1, 1, -1,

                // vertical lines
                1, -1, -1,
                1, 1, -1,

                -1, 1, -1,
                -1, -1, -1,

                1, 1, 1,
                1, -1, 1,

                -1, 1, 1,
                -1, -1, 1,

                // horizontal lines
                1, 1, -1,
                1, 1, 1,

                -1, 1, -1,
                -1, 1, 1,

                1, -1, 1,
                1, -1, -1,

                -1, -1, 1,
                -1, -1, -1,
            ]
        );

        this.mesh = new CGL.Mesh(this.cgl, this.geom, this.cgl.gl.LINES);
        this.mesh.setGeom(this.geom);

        this.colorShader = new CGL.UniColorShader(this.cgl);
        this.colorShader.setColor([0, 1, 1, 1]);

        this._vScale = vec3.create();
    }

    render(_scaleX, _scaleY, _scaleZ)
    {
        this.cgl.pushModelMatrix();
        this.cgl.pushShader(this.colorShader.shader);
        this.cgl.pushDepthTest(false);

        if (_scaleX == undefined) _scaleX = 1.0;
        if (_scaleY == undefined) _scaleY = _scaleX;
        if (_scaleZ == undefined) _scaleZ = _scaleX;


        // vec3.set(this._vScale, _scaleX || 1, _scaleY || _scaleX || 1, _scaleZ || _scaleX || 1);
        vec3.set(this._vScale, _scaleX, _scaleY, _scaleZ);
        mat4.scale(this.cgl.mvMatrix, this.cgl.mvMatrix, this._vScale);

        this.mesh.render(this.cgl.getShader());

        this.cgl.popDepthTest();
        this.cgl.popShader();
        this.cgl.popModelMatrix();
    }
}

;// CONCATENATED MODULE: ./src/corelibs/cgl_wireframes/cgl_wireframerect.js


class WireframeRect
{
    constructor(_cgl)
    {
        this.cgl = _cgl;
        this.geom = new CGL.Geometry("marker");

        const fr = -1.0;
        const to = 1.0;

        this.geom.setPointVertices(
            [
                fr, fr, 0,
                to, fr, 0,

                to, fr, 0,
                to, to, 0,

                to, to, 0,
                fr, to, 0,

                fr, to, 0,
                fr, fr, 0,
            ]
        );

        this.mesh = new CGL.Mesh(this.cgl, this.geom, this.cgl.gl.LINES);
        this.mesh.setGeom(this.geom);

        this.colorShader = new CGL.UniColorShader(this.cgl);
        this.colorShader.setColor([0, 1, 1, 1]);

        this._vScale = vec3.create();
    }

    render(_scaleX, _scaleY, _scaleZ)
    {
        this.cgl.pushModelMatrix();
        this.cgl.pushShader(this.colorShader.shader);
        this.cgl.pushDepthTest(false);

        vec3.set(this._vScale, _scaleX || 1, _scaleY || _scaleX || 1, _scaleZ || _scaleX || 1);
        mat4.scale(this.cgl.mvMatrix, this.cgl.mvMatrix, this._vScale);

        this.mesh.render(this.cgl.getShader());

        this.cgl.popDepthTest();
        this.cgl.popShader();
        this.cgl.popModelMatrix();
    }
}

;// CONCATENATED MODULE: ./src/corelibs/cgl_wireframes/index.js





})();

var __webpack_export_target__ = (CGL = typeof CGL === "undefined" ? {} : CGL);
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;