"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Ui=Ops.Ui || {};
Ops.Html=Ops.Html || {};
Ops.Json=Ops.Json || {};
Ops.Math=Ops.Math || {};
Ops.Number=Ops.Number || {};
Ops.String=Ops.String || {};
Ops.Devices=Ops.Devices || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Html.Utils=Ops.Html.Utils || {};
Ops.Gl.Textures=Ops.Gl.Textures || {};
Ops.Devices.Midi=Ops.Devices.Midi || {};
Ops.Devices.Mobile=Ops.Devices.Mobile || {};



// **************************************************************
// 
// Ops.Devices.Mobile.MotionSensor_v2
// 
// **************************************************************

Ops.Devices.Mobile.MotionSensor_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    mulAxis = op.inValue("Mul Orientation", 1),
    req = op.inTriggerButton("Request Permissions"),
    axis1 = op.outNumber("Orientation Alpha"),
    axis2 = op.outNumber("Orientation Beta"),
    axis3 = op.outNumber("Orientation Gamma"),
    accX = op.outNumber("Acceleration X"),
    accY = op.outNumber("Acceleration Y"),
    accZ = op.outNumber("Acceleration Z"),
    accNoGravX = op.outNumber("Acceleration X no gravity"),
    accNoGravY = op.outNumber("Acceleration Y no gravity"),
    accNoGravZ = op.outNumber("Acceleration Z no gravity"),

    rotRate1 = op.outNumber("Rotation Rate Alpha"),
    rotRate2 = op.outNumber("Rotation Rate Beta"),
    rotRate3 = op.outNumber("Rotation Rate Gamma"),
    outPermissions = op.outString("Permissions", "no"),

    outObj = op.outObject("Object");

let lastTime = 0;
let lastTimeAcc = 0;
let obj = {};

function handleDeviceMotion(event)
{
    if (CABLES.now() - lastTimeAcc > 15)
    {
        lastTimeAcc = CABLES.now();

        accX.set(event.accelerationIncludingGravity.x || 0);
        accY.set(event.accelerationIncludingGravity.y || 0);
        accZ.set(event.accelerationIncludingGravity.z || 0);

        accNoGravX.set(event.acceleration.x || 0);
        accNoGravY.set(event.acceleration.y || 0);
        accNoGravZ.set(event.acceleration.z || 0);

        obj.AccelerationX = accX.get();
        obj.AccelerationY = accY.get();
        obj.AccelerationZ = accZ.get();

        rotRate1.set(event.rotationRate.alpha || 0);
        rotRate2.set(event.rotationRate.beta || 0);
        rotRate3.set(event.rotationRate.gamma || 0);

        outObj.setRef(obj);
    }
}

function handleDeviceOrientation(event)
{
    if (CABLES.now() - lastTime > 15)
    {
        lastTime = CABLES.now();
        axis1.set((event.alpha || 0) * mulAxis.get());
        axis2.set((event.beta || 0) * mulAxis.get());
        axis3.set((event.gamma || 0) * mulAxis.get());

        if (event.webkitCompassHeading) axis1.set(this.deviceAngleDelta = 360 - event.webkitCompassHeading);

        obj.OrientationAlpha = axis1.get();
        obj.OrientationBeta = axis2.get();
        obj.OrientationGamma = axis3.get();

        outObj.setRef(obj);
    }
}

req.onTriggered = function ()
{
    outPermissions.set("requested");

    if (window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission)
    {
        window.DeviceMotionEvent.requestPermission()
            .then((response) =>
            {
                outPermissions.set(response);
                if (response == "granted") window.addEventListener("devicemotion", handleDeviceMotion, true);
            })
            .catch((e) =>
            {
                outPermissions.set("error: " + e.message);
                console.error(e);
            });

        window.DeviceOrientationEvent.requestPermission()
            .then((response) =>
            {
                outPermissions.set(response);
                if (response == "granted")
                {
                    window.addEventListener("deviceorientation", handleDeviceOrientation, true);
                }
                // else
                // console.error(response);
            })
            .catch((e) =>
            {
                outPermissions.set("error: " + e.message);
                console.error(e);
            });
    }
    else
    {
        window.addEventListener("devicemotion", handleDeviceMotion, true);
        window.addEventListener("deviceorientation", handleDeviceOrientation, true);
    }
};

if (window.self !== window.top)
{
    // outPermissions.set("iframe");
    op.setUiError("iframe", "MotionSensor may not work in an iframe, open the patch without an iframe to get it to work", 1);
    op.warn("MotionSensor may not work in an iframe, open the patch without an iframe to get it to work");
}

}
};






// **************************************************************
// 
// Ops.Gl.MainLoop_v2
// 
// **************************************************************

Ops.Gl.MainLoop_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    hdpi = op.inFloat("Max Pixel Density (DPR)", 2),
    fpsLimit = op.inValue("FPS Limit", 0),
    reduceFocusFPS = op.inValueBool("Reduce FPS unfocussed", false),
    clear = op.inValueBool("Transparent", false),
    active = op.inValueBool("Active", 1),
    inFocus = op.inValueBool("Focus canvas", 1),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    outPixel = op.outNumber("Pixel Density");

op.onAnimFrame = render;
hdpi.onChange = updateHdpi;

const cgl = op.patch.cg = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;
let timeOutTest = null;
let addedListener = false;
if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

let firstTime = true;
let fsElement = null;
let winhasFocus = true;
let winVisible = true;
let lastFrame = -1;
let duplicate = 0;
window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });
if (CABLES.UI)gui.canvasManager.addCgContext(op.patch.cgl);

testMultiMainloop();

// op.patch.cgl.cgCanvas.forceAspect = 1.7777777;
op.patch.tempData.mainloopOp = this;

op.patch.cgl.canvas.classList.add("cablescontext");
op.patch.cgl.canvas.dataset.contextname = "cgl";
op.patch.cgl.canvas.dataset.api = "webgl";

if (CABLES.UI)gui.setLayout();

function updateHdpi()
{
    setPixelDensity();

    if (CABLES.UI)
    {
        if (hdpi.get() < 1)
            op.patch.cgl.canvas.style.imageRendering = "pixelated";
    }

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
}

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

function getFpsLimit()
{
    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0.0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function setPixelDensity()
{
    if (hdpi.get() != 0) op.patch.cgl.pixelDensity = Math.min(hdpi.get(), window.devicePixelRatio);
    else op.patch.cgl.pixelDensity = window.devicePixelRatio;
}

function render(time, frame, delta)
{
    if (frame === lastFrame)
    {
        if (duplicate < 10)console.warn("duplicate frame?!");
        duplicate++;
        return;
    }
    lastFrame = frame;

    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    setPixelDensity();

    // if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth / 1);
        height.set(cgl.canvasHeight / 1);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (!clear.get()) cgl.gl.clearColor(0, 0, 0, 1);
    else cgl.gl.clearColor(0, 0, 0, 0);

    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (!clear.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.tempData.phong)cgl.tempData.phong = {};
    rframes++;
    if (firstTime)
    {
        if (inFocus.get()) cgl.canvas.focus();
        firstTime = false;
    }

    outPixel.set(op.patch.cgl.pixelDensity);
    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    clearTimeout(timeOutTest);
    timeOutTest = setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                if (!addedListener)addedListener = op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}

}
};






// **************************************************************
// 
// Ops.Json.ObjectStringify_v2
// 
// **************************************************************

Ops.Json.ObjectStringify_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inObj = op.inObject("Object"),
    inBeautify = op.inValueBool("Beautify", true),
    outString = op.outString("Result"),
    outError = op.outBoolNum("Error");

inBeautify.onChange = inObj.onChange = update;

function update()
{
    try
    {
        if (!inBeautify.get())outString.set(JSON.stringify(inObj.get()));
        else outString.set(JSON.stringify(inObj.get(), false, 4));
        outError.set(0);
    }
    catch (e)
    {
        op.error(e);
        outString.set("error");
        outError.set(1);
    }
}

}
};






// **************************************************************
// 
// Ops.Gl.Textures.TextTexture_v6
// 
// **************************************************************

Ops.Gl.Textures.TextTexture_v6= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"text_frag":"{{MODULES_HEAD}}\n\nUNI sampler2D tex;\nUNI float a;\nUNI vec4 color;\nIN vec2 texCoord;\n\nvoid main()\n{\n\n    vec4 col=texture(tex,vec2(texCoord.x,(1.0-texCoord.y)));\n\n    {{MODULE_COLOR}}\n\n    outColor=col;\n}\n","text_vert":"{{MODULES_HEAD}}\n\nIN vec3 vPosition;\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\nUNI float aspect;\nOUT vec2 texCoord;\nIN vec2 attrTexCoord;\n\nvoid main()\n{\n    vec4 pos=vec4(vPosition,  1.0);\n\n    pos.x*=aspect;\n\n    texCoord=vec2(attrTexCoord.x,1.0-attrTexCoord.y);;\n\n    mat4 mMatrix=modelMatrix;\n\n    {{MODULE_VERTEX_POSITION}}\n    mat4 modelViewMatrix=viewMatrix*mMatrix;\n\n    gl_Position = projMatrix * modelViewMatrix * pos;\n}\n",};
const
    render = op.inTriggerButton("Render"),

    text = op.inString("text", "cables"),

    drawMesh = op.inValueBool("Draw Mesh", true),
    meshScale = op.inValueFloat("Scale Mesh", 0.5),

    texSizeMeth = op.inSwitch("Size", ["Auto", "Manual"], "Auto"),

    texSizeManWidth = op.inInt("Width", 512),
    texSizeManHeight = op.inInt("Height", 512),
    texSizeAutoHeight = op.inBool("Auto Height", true),

    texSizeManBreak = op.inBool("Auto Line Breaks", true),

    font = op.inString("font", "Arial"),
    weight = op.inString("weight", "normal"),
    inFontSize = op.inValueFloat("fontSize", 300),
    align = op.inSwitch("align", ["left", "center", "right"], "center"),
    valign = op.inSwitch("Vertical align", ["Top", "Middle", "Bottom"], "Top"),

    inLetterspacing = op.inFloat("Letter Spacing", 0),
    inLineHeight = op.inFloat("Line Height Add", 0),

    inPaddingY = op.inInt("Padding Y Top", 3),
    inPaddingYBot = op.inInt("Padding Y Bottom", 3),
    inPaddingX = op.inInt("Padding X", 0),

    tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "linear"),
    wrap = op.inValueSelect("Wrap", ["repeat", "mirrored repeat", "clamp to edge"], "clamp to edge"),
    aniso = op.inSwitch("Anisotropic", [0, 1, 2, 4, 8, 16], 0),
    cachetexture = op.inValueBool("Reuse Texture", true),
    drawDebug = op.inBool("Show Debug", false),

    reloadOnFont = op.inBool("Redraw On Font Load", true),

    r = op.inValueSlider("r", 1),
    g = op.inValueSlider("g", 1),
    b = op.inValueSlider("b", 1),
    inOpacity = op.inFloatSlider("Opacity", 1),

    bgR = op.inValueSlider("background R", 0),
    bgG = op.inValueSlider("background G", 0),
    bgB = op.inValueSlider("background B", 0),
    bgA = op.inValueSlider("background A", 1),

    inRedraw = op.inTriggerButton("Force Redraw"),

    next = op.outTrigger("Next"),
    outRatio = op.outNumber("Ratio"),
    textureOut = op.outTexture("texture"),
    outEle = op.outObject("Canvas", null, "element"),
    outAspect = op.outNumber("Aspect", 1),
    outLines = op.outNumber("Num Lines");

const SPACE = " ";

r.setUiAttribs({ "colorPick": true });
bgR.setUiAttribs({ "colorPick": true });

op.toWorkPortsNeedToBeLinked(render);

op.setPortGroup("Text Color", [r, g, b, inOpacity]);
op.setPortGroup("Background", [bgR, bgG, bgB, bgA]);
op.setPortGroup("Font", [font, weight, inFontSize, align, valign, inLetterspacing, inLineHeight]);
op.setPortGroup("Texture", [wrap, tfilter, aniso, cachetexture, drawDebug]);

op.setPortGroup("Rendering", [drawMesh, meshScale]);

render.onLinkChanged = () =>
{
    if (!render.isLinked())textureOut.setRef(CGL.Texture.getEmptyTexture(cgl));
    else textureOut.setRef(tex);
};

inRedraw.onTriggered =
    r.onChange =
    g.onChange =
    b.onChange =
    inOpacity.onChange =
    valign.onChange =
    texSizeManBreak.onChange =
    texSizeAutoHeight.onChange =
    inLineHeight.onChange =
    texSizeMeth.onChange =
    texSizeManWidth.onChange =
    texSizeManHeight.onChange =
    align.onChange =
    inLetterspacing.onChange =
    inPaddingY.onChange =
    inPaddingYBot.onChange =
    inPaddingX.onChange =
    text.onChange =
    inFontSize.onChange =
    weight.onChange =
    aniso.onChange =
    font.onChange =
    drawDebug.onChange =
    cachetexture.onChange = function ()
    {
        needsRefresh = true;
        updateUi();
    };

textureOut.ignoreValueSerialize = true;

const cgl = op.patch.cgl;
let tex = new CGL.Texture(cgl);
let autoHeight = 2;
let autoWidth = 2;

const fontImage = document.createElement("canvas");
fontImage.id = "texturetext_" + CABLES.generateUUID();
fontImage.style.display = "none";
document.body.appendChild(fontImage);
fontImage.style.letterSpacing = "0px";

outEle.setRef(fontImage);

let ctx = fontImage.getContext("2d");
let needsRefresh = true;
const mesh = CGL.MESHES.getSimpleRect(cgl, "texttexture rect");
const vScale = vec3.create();
const shader = new CGL.Shader(cgl, "texttexture");
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
shader.setSource(attachments.text_vert, attachments.text_frag);
const texUni = new CGL.Uniform(shader, "t", "tex");
const aspectUni = new CGL.Uniform(shader, "f", "aspect", 0);
const opacityUni = new CGL.Uniform(shader, "f", "a", inOpacity);
const uniColor = new CGL.Uniform(shader, "4f", "color", r, g, b, inOpacity);

if (op.patch.isEditorMode()) CABLES.UI.SIMPLEWIREFRAMERECT = CABLES.UI.SIMPLEWIREFRAMERECT || new CGL.WireframeRect(cgl);

render.onTriggered = doRender;
drawMesh.onChange = updateUi;
updateUi();

op.on("delete", () =>
{
    ctx = null;
    fontImage.remove();
});

aniso.onChange =
    tfilter.onChange =
    wrap.onChange = () =>
    {
        if (tex)tex.delete();
        tex = null;
        needsRefresh = true;
    };

bgR.onChange = bgG.onChange = bgB.onChange = bgA.onChange = r.onChange = g.onChange = b.onChange = inOpacity.onChange = () =>
{
    if (!drawMesh.get() || textureOut.isLinked()) needsRefresh = true;
};

textureOut.onLinkChanged = () =>
{
    if (textureOut.isLinked()) needsRefresh = true;
};

op.patch.on("fontLoaded", (fontName) =>
{
    if (fontName == font.get()) needsRefresh = true;
});

document.fonts.ready.then(() =>
{
    if (reloadOnFont.get()) needsRefresh = true;
});

document.fonts.onloadingdone = function (fontFaceSetEvent)
{
    if (reloadOnFont.get()) needsRefresh = true;
};

function getWidth()
{
    return autoWidth;
}

function getHeight()
{
    return autoHeight;
}

function doRender()
{
    let count = 0;
    while (needsRefresh && count < 10)
    {
        reSize();
        refresh();
        count++;
    }

    if (drawMesh.get())
    {
        vScale[0] = vScale[1] = vScale[2] = meshScale.get();
        cgl.pushBlendMode(CGL.BLEND_NORMAL, false);
        cgl.pushModelMatrix();
        mat4.scale(cgl.mMatrix, cgl.mMatrix, vScale);

        shader.popTextures();
        shader.pushTexture(texUni, tex.tex);
        aspectUni.set(outAspect.get());

        if (cgl.shouldDrawHelpers(op))
            CABLES.UI.SIMPLEWIREFRAMERECT.render(outAspect.get(), 1, 1);

        cgl.pushShader(shader);
        mesh.render(op.patch.cg.getShader());

        cgl.popShader();
        cgl.popBlendMode();
        cgl.popModelMatrix();
    }

    next.trigger();
}

function reSize()
{
    if (tex) tex.setSize(getWidth(), getHeight());

    ctx.canvas.width = fontImage.width = getWidth();
    ctx.canvas.height = fontImage.height = getHeight();

    outAspect.set(fontImage.width / fontImage.height);

    needsRefresh = true;
}

function autoLineBreaks(strings)
{
    let newString = "";

    for (let i = 0; i < strings.length; i++)
    {
        if (!strings[i])
        {
            newString += "\n";
            continue;
        }
        let sumWidth = 0;
        const words = strings[i].split(SPACE);

        for (let j = 0; j < words.length; j++)
        {
            if (!words[j]) continue;
            sumWidth += ctx.measureText(words[j] + SPACE).width;

            if (sumWidth > texSizeManWidth.get())
            {
                // found = true;
                newString += "\n" + words[j] + SPACE;
                sumWidth = ctx.measureText(words[j] + SPACE).width;
            }
            else
            {
                newString += words[j] + SPACE;
            }
        }
        newString += "\n";
    }
    let txt = newString;

    strings = txt.split("\n");

    if (strings[strings.length - 1] == "")strings.pop();

    return strings;
}

function refresh()
{
    cgl.checkFrameStarted("texttrexture refresh");
    const rgbStringClear = "rgba(" + Math.floor(bgR.get() * 255) + "," + Math.floor(bgG.get() * 255) + "," + Math.floor(bgB.get() * 255) + "," + bgA.get() + ")";
    ctx.fillStyle = rgbStringClear;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const rgbString = "rgba(" + Math.floor(r.get() * 255) + ","
        + Math.floor(g.get() * 255) + "," + Math.floor(b.get() * 255) + ","
        + inOpacity.get() + ")";

    ctx.fillStyle = rgbString;
    let fontSize = parseFloat(inFontSize.get());
    let fontname = font.get() || "arial";
    if (fontname.indexOf(SPACE) > -1) fontname = "\"" + fontname + "\"";
    ctx.font = weight.get() + SPACE + fontSize + "px " + fontname + "";

    ctx.textBaseline = "top";
    ctx.textAlign = align.get();
    ctx.letterSpacing = inLetterspacing.get() + "px";

    let txt = (text.get() + "").replace(/<br\/>/g, "\n");
    txt = txt.trim();
    let strings = txt.split("\n");

    needsRefresh = false;

    let paddingY = Math.max(0, inPaddingY.get());
    let paddingYBot = Math.max(0, inPaddingYBot.get());
    let paddingX = Math.max(0, inPaddingX.get());

    autoWidth = 0;
    autoHeight = 0;

    if (texSizeManBreak.get() && texSizeMeth.get() == "Manual")
    {
        if (texSizeManWidth.get() > 128)
        {
            strings = autoLineBreaks(strings);
        }
    }

    const lineHeights = [];

    for (let i = 0; i < strings.length; i++)
    {
        const measure = ctx.measureText(strings[i]);
        lineHeights[i] = Math.ceil(measure.fontBoundingBoxAscent) + Math.ceil(measure.fontBoundingBoxDescent) + inLineHeight.get();
    }

    for (let i = 0; i < strings.length; i++)
    {
        const measure = ctx.measureText(strings[i]);
        autoWidth = Math.max(autoWidth, Math.ceil(measure.width));
        autoHeight += lineHeights[i];
    }

    autoWidth += paddingX * 2;

    if (inLineHeight.get() < 0)autoHeight += (inLineHeight.get() / 2) * -1;

    let calcHeight = autoHeight;

    if (texSizeMeth.get() == "Manual")
    {
        autoWidth = texSizeManWidth.get() + paddingX * 2;

        if (!texSizeAutoHeight.get())
        {
            autoHeight = texSizeManHeight.get();
        }
    }

    autoHeight = Math.ceil(autoHeight);
    autoWidth = Math.ceil(autoWidth);

    if (autoWidth > cgl.maxTexSize || autoHeight > cgl.maxTexSize) op.setUiError("textoobig", "Texture too big!");
    else op.setUiError("textoobig", null);

    autoHeight = Math.min(cgl.maxTexSize, autoHeight);
    autoWidth = Math.min(cgl.maxTexSize, autoWidth);

    let posy = 0;
    if (valign.get() == "Middle") posy = (autoHeight - calcHeight) / 2;
    else if (valign.get() == "Bottom") posy = (autoHeight - calcHeight);

    posy += paddingY;

    autoHeight += paddingY + paddingYBot;

    if (ctx.canvas.width != autoWidth || ctx.canvas.height != autoHeight) reSize();

    const dbg = drawDebug.get();

    for (let i = 0; i < strings.length; i++)
    {
        let posx = 0 + paddingX; // left

        if (align.get() == "center") posx = ctx.canvas.width / 2;
        if (align.get() == "right") posx = ctx.canvas.width - paddingX;

        if (texSizeMeth.get() == "Manual") posx += inLetterspacing.get();

        ctx.fillText(strings[i], posx, posy);

        if (dbg)
        {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#FF0000";
            ctx.beginPath();
            ctx.moveTo(0, posy);
            ctx.lineTo(ctx.canvas.width, posy);
            ctx.stroke();
        }

        posy += lineHeights[i];
    }

    // ctx.restore();

    let cgl_wrap = CGL.Texture.WRAP_REPEAT;
    if (wrap.get() == "mirrored repeat") cgl_wrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    else if (wrap.get() == "clamp to edge") cgl_wrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    let f = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "nearest") f = CGL.Texture.FILTER_NEAREST;
    else if (tfilter.get() == "mipmap") f = CGL.Texture.FILTER_MIPMAP;

    if (!cachetexture.get() || !tex || !textureOut.get() || tex.width != fontImage.width || tex.height != fontImage.height || tex.anisotropic != parseFloat(aniso.get()))
    {
        if (tex)tex.delete();
        tex = new CGL.Texture.createFromImage(cgl, fontImage, { "filter": f, "anisotropic": parseFloat(aniso.get()), "wrap": cgl_wrap });
    }

    tex.unpackAlpha = false;
    tex.flip = false;
    tex.initTexture(fontImage, f);

    outRatio.set(ctx.canvas.height / ctx.canvas.width);
    outLines.set(strings.length);

    textureOut.setRef(tex);
}

function updateUi()
{
    texSizeManWidth.setUiAttribs({ "greyout": texSizeMeth.get() != "Manual" });
    texSizeManHeight.setUiAttribs({ "greyout": texSizeMeth.get() != "Manual" || texSizeAutoHeight.get() });
    texSizeManBreak.setUiAttribs({ "greyout": texSizeMeth.get() != "Manual" });
    valign.setUiAttribs({ "greyout": texSizeMeth.get() != "Manual" });
    texSizeAutoHeight.setUiAttribs({ "greyout": texSizeMeth.get() != "Manual" });

    meshScale.setUiAttribs({ "greyout": !drawMesh.get() });
}

}
};






// **************************************************************
// 
// Ops.Gl.Meshes.FullscreenRectangle_v2
// 
// **************************************************************

Ops.Gl.Meshes.FullscreenRectangle_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"shader_frag":"UNI sampler2D tex;\nIN vec2 texCoord;\n\nvoid main()\n{\n    outColor= texture(tex,texCoord);\n}\n\n","shader_vert":"{{MODULES_HEAD}}\n\nIN vec3 vPosition;\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\nIN vec2 attrTexCoord;\n\nvoid main()\n{\n   vec4 pos=vec4(vPosition,  1.0);\n\n   texCoord=vec2(attrTexCoord.x,(1.0-attrTexCoord.y));\n\n   gl_Position = projMatrix * mvMatrix * pos;\n}\n",};
const
    render = op.inTrigger("render"),
    inScale = op.inSwitch("Scale", ["Stretch", "Fit"], "Fit"),
    flipY = op.inValueBool("Flip Y"),
    flipX = op.inValueBool("Flip X"),
    inTexture = op.inTexture("Texture"),
    trigger = op.outTrigger("trigger");

const cgl = op.patch.cgl;
let mesh = null;
let geom = new CGL.Geometry("fullscreen rectangle");
let x = 0, y = 0, w = 0, h = 0;

op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);
op.toWorkPortsNeedToBeLinked(render);

flipX.onChange = rebuildFlip;
flipY.onChange = rebuildFlip;
render.onTriggered = doRender;
inTexture.onLinkChanged = updateUi;
inScale.onChange = updateScale;

const shader = new CGL.Shader(cgl, "fullscreenrectangle", this);
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

shader.setSource(attachments.shader_vert, attachments.shader_frag);
shader.fullscreenRectUniform = new CGL.Uniform(shader, "t", "tex", 0);
shader.aspectUni = new CGL.Uniform(shader, "f", "aspectTex", 0);

let useShader = false;
let updateShaderLater = true;
let fitImageAspect = false;

updateUi();
updateScale();

inTexture.onChange = function ()
{
    updateShaderLater = true;
};

function updateUi()
{
    if (!CABLES.UI) return;
    flipY.setUiAttribs({ "greyout": !inTexture.isLinked() });
    flipX.setUiAttribs({ "greyout": !inTexture.isLinked() });
    inScale.setUiAttribs({ "greyout": !inTexture.isLinked() });
}

function updateShader()
{
    let tex = inTexture.get();
    if (tex) useShader = true;
    else useShader = false;
}

op.preRender = function ()
{
    updateShader();
    shader.bind();
    if (mesh)mesh.render(shader);
    doRender();
};

function updateScale()
{
    fitImageAspect = inScale.get() == "Fit";
}

function doRender()
{
    if (cgl.viewPort[2] != w || cgl.viewPort[3] != h || !mesh) rebuild();

    if (updateShaderLater) updateShader();

    cgl.pushPMatrix();
    mat4.identity(cgl.pMatrix);
    mat4.ortho(cgl.pMatrix, 0, w, h, 0, -10.0, 1000);

    cgl.pushModelMatrix();
    mat4.identity(cgl.mMatrix);

    cgl.pushViewMatrix();
    mat4.identity(cgl.vMatrix);

    if (fitImageAspect && inTexture.get())
    {
        const rat = inTexture.get().width / inTexture.get().height;

        let _h = h;
        let _w = h * rat;

        if (_w > w)
        {
            _h = w * 1 / rat;
            _w = w;
        }

        cgl.pushViewPort((w - _w) / 2, (h - _h) / 2, _w, _h);
    }

    if (useShader)
    {
        if (inTexture.get()) cgl.setTexture(0, inTexture.get().tex);
        mesh.render(shader);
    }
    else
    {
        mesh.render(cgl.getShader());
    }

    cgl.gl.clear(cgl.gl.DEPTH_BUFFER_BIT);

    cgl.popPMatrix();
    cgl.popModelMatrix();
    cgl.popViewMatrix();

    if (fitImageAspect && inTexture.get()) cgl.popViewPort();

    trigger.trigger();
}

function rebuildFlip()
{
    mesh = null;
}

function rebuild()
{
    if (cgl.viewPort[2] == w && cgl.viewPort[3] == h && mesh) return;

    let xx = 0, xy = 0;

    w = cgl.viewPort[2];
    h = cgl.viewPort[3];

    geom.vertices = new Float32Array([
        xx + w, xy + h, 0.0,
        xx, xy + h, 0.0,
        xx + w, xy, 0.0,
        xx, xy, 0.0
    ]);

    let tc = null;

    if (flipY.get())
        tc = new Float32Array([
            1.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);
    else
        tc = new Float32Array([
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]);

    if (flipX.get())
    {
        tc[0] = 0.0;
        tc[2] = 1.0;
        tc[4] = 0.0;
        tc[6] = 1.0;
    }

    geom.setTexCoords(tc);

    geom.verticesIndices = new Uint16Array([
        2, 1, 0,
        3, 1, 2
    ]);

    geom.vertexNormals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);
    geom.tangents = new Float32Array([
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0]);
    geom.biTangents == new Float32Array([
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0]);

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);
}

}
};






// **************************************************************
// 
// Ops.Html.Utils.PlayButton
// 
// **************************************************************

Ops.Html.Utils.PlayButton= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"inner_css":"\nborder-style:solid;\nborder-color:transparent transparent transparent #ccc;\nbox-sizing:border-box;\nwidth:50px;\nheight:50px;\nmargin-top:25px;\nmargin-left:36px;\nborder-width:25px 0px 25px 40px;\npointer-events:none;\n","outer_css":"width:100px;\nheight:100px;\nleft:50%;\ntop:50%;\nborder-radius:100%;\nposition:absolute;\ncursor:pointer;\nopacity:0.7;\ntransform:translate(-50%,-50%);\nz-index:999999;\nbackground-color:#333;\nborder:5px solid #333;",};
const
    inExec = op.inTrigger("Trigger"),
    inIfSuspended = op.inValueBool("Only if Audio Suspended"),
    inReset = op.inTriggerButton("Reset"),
    inStyleOuter = op.inStringEditor("Style Outer", attachments.outer_css),
    inStyleInner = op.inStringEditor("Style Inner", attachments.inner_css),
    inActive = op.inBool("Active", true),
    outNext = op.outTrigger("Next"),
    notClickedNext = op.outTrigger("Not Clicked"),
    outState = op.outString("Audiocontext State", "unknown"),
    outEle = op.outObject("Element"),
    outClicked = op.outBoolNum("Clicked", false),
    outClickedTrigger = op.outTrigger("Clicked Trigger");

// op.toWorkPortsNeedToBeLinked(inExec);
let audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

const canvas = op.patch.cgl.canvas.parentElement;
let wasClicked = false;
let ele = null;
let elePlay = null;
createElements();

inStyleOuter.onChange =
    inStyleInner.onChange = createElements;

audioCtx.addEventListener("statechange", updateState);
updateState();

inActive.onChange = () =>
{
    if (!inActive.get())ele.style.display = "none";
    else ele.style.display = "block";
};

function createElements()
{
    updateState();
    if (elePlay) elePlay.remove();
    if (ele) ele.remove();

    ele = document.createElement("div");
    ele.style = inStyleOuter.get();
    outEle.set(ele);

    canvas.appendChild(ele);

    elePlay = document.createElement("div");
    elePlay.style = inStyleInner.get();

    ele.appendChild(elePlay);
    ele.classList.add("playButton");

    ele.addEventListener("mouseenter", hover);
    ele.addEventListener("mouseleave", hoverOut);
    ele.addEventListener("click", clicked);
    ele.addEventListener("touchStart", clicked);
    op.onDelete = removeElements;
}

inReset.onTriggered = function ()
{
    createElements();
    wasClicked = false;
    outClicked.set(wasClicked);
};

function updateState()
{
    outState.set(audioCtx.state);
    if (inIfSuspended.get() && audioCtx.state == "running") clicked();
}

inExec.onTriggered = function ()
{
    if (wasClicked) outNext.trigger();
    else notClickedNext.trigger();
};

function clicked()
{
    removeElements();
    if (audioCtx && audioCtx.state == "suspended")audioCtx.resume();
    wasClicked = true;
    outClicked.set(wasClicked);
    outClickedTrigger.trigger();
}

function removeElements()
{
    if (elePlay) elePlay.remove();
    if (ele) ele.remove();
}

function hoverOut()
{
    if (ele) ele.style.opacity = 0.7;
}

function hover()
{
    if (ele) ele.style.opacity = 1.0;
}

}
};






// **************************************************************
// 
// Ops.Ui.VizNumber
// 
// **************************************************************

Ops.Ui.VizNumber= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const inNum = op.inFloat("Number", 0);
const outNum = op.outNumber("Result");

op.setUiAttrib({ "widthOnlyGrow": true });

inNum.onChange = update;

update();

function update()
{
    let n = inNum.get();
    // if (op.patch.isEditorMode())
    // {
    //     let str = "";
    //     if (n === null)str = "null";
    //     else if (isNaN(n))str = "NaN";
    //     else if (n === undefined)str = "undefined";
    //     else
    //     {
    //         str = "" + Math.round(n * 10000) / 10000;

    //         if (str[0] != "-")str = " " + str;
    //     }

    //     op.setUiAttribs({ "extendTitle": str });
    // }
    op.setUiAttribs({ "extendTitle": inNum.getValueForDisplay() });

    outNum.set(n);
}

}
};






// **************************************************************
// 
// Ops.Devices.TouchScreen
// 
// **************************************************************

Ops.Devices.TouchScreen= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    disableScaleWeb = op.inValueBool("Disable Scaling", true),
    disableDefault = op.inValueBool("Disable Scroll", true),
    hdpi = op.inValueBool("HDPI Coordinates", false),
    active = op.inValueBool("Active", true),

    outTouched = op.outNumber("Touched", false),
    numFingers = op.outNumber("Fingers", 0),

    f1x = op.outNumber("Finger 1 X", 0),
    f1y = op.outNumber("Finger 1 Y", 0),
    f1f = op.outNumber("Finger 1 Force", 0),

    f2x = op.outNumber("Finger 2 X", 0),
    f2y = op.outNumber("Finger 2 Y", 0),
    f2f = op.outNumber("Finger 2 Force", 0),
    area = op.inSwitch("Area", ["Canvas", "Document"], "Canvas"),

    outEvents = op.outArray("Events"),
    normalize = op.inValueBool("Normalize Coordinates"),
    flipY = op.inValueBool("Flip Y"),
    outTouchStart = op.outTrigger("Touch Start"),
    outTouchEnd = op.outTrigger("Touch End");

area.onChange = updateArea;

function setPos(event)
{
    if (event.touches && event.touches.length > 0)
    {
        var rect = event.target.getBoundingClientRect();
        var x = event.touches[0].clientX - event.touches[0].target.offsetLeft;
        var y = event.touches[0].clientY - event.touches[0].target.offsetTop;

        if (flipY.get()) y = rect.height - y;

        if (hdpi.get())
        {
            x *= (op.patch.cgl.pixelDensity || 1);
            y *= (op.patch.cgl.pixelDensity || 1);
        }

        if (normalize.get())
        {
            x = (x / rect.width * 2.0 - 1.0);
            y = (y / rect.height * 2.0 - 1.0);
        }

        f1x.set(x);
        f1y.set(y);

        if (event.touches[0].force)f1f.set(event.touches[0].force);
    }

    if (event.touches && event.touches.length > 1)
    {
        var rect = event.target.getBoundingClientRect();
        var x = event.touches[1].clientX - event.touches[1].target.offsetLeft;
        var y = event.touches[1].clientY - event.touches[1].target.offsetTop;

        if (hdpi.get())
        {
            x *= (op.patch.cgl.pixelDensity || 1);
            y *= (op.patch.cgl.pixelDensity || 1);
        }

        if (normalize.get())
        {
            x = (x / rect.width * 2.0 - 1.0);
            y = (y / rect.height * 2.0 - 1.0);
        }

        f2x.set(x);
        f2y.set(y);

        if (event.touches[1].force)f2f.set(event.touches[1].force);
    }
    outEvents.set(event.touches);
}

const ontouchstart = function (event)
{
    outTouched.set(true);
    setPos(event);
    numFingers.set(event.touches.length);
    outTouchStart.trigger();
};

const ontouchend = function (event)
{
    outTouched.set(false);
    f1f.set(0);
    f2f.set(0);
    setPos(event);

    numFingers.set(event.touches.length);
    outTouchEnd.trigger();
};

const ontouchmove = function (event)
{
    setPos(event);
    numFingers.set(event.touches.length);
    if (disableDefault.get() || (disableScaleWeb.get() && event.scale !== 1))
    {
        event.preventDefault();
        document.body.style["touch-action"] = "none";
    }
    else
    {
        document.body.style["touch-action"] = "initial";
    }
};

const cgl = op.patch.cgl;
let listenerElement = null;
function addListeners()
{
    listenerElement.addEventListener("touchmove", ontouchmove, { "passive": false });
    listenerElement.addEventListener("touchstart", ontouchstart, { "passive": false });
    listenerElement.addEventListener("touchend", ontouchend, { "passive": false });
}

function updateArea()
{
    removeListeners();

    if (area.get() == "Document") listenerElement = document;
    else listenerElement = cgl.canvas;

    if (active.get()) addListeners();
}

function removeListeners()
{
    if (listenerElement)
    {
        listenerElement.removeEventListener("touchmove", ontouchmove);
        listenerElement.removeEventListener("touchstart", ontouchstart);
        listenerElement.removeEventListener("touchend", ontouchend);
    }
    listenerElement = null;
}

active.onChange = function ()
{
    updateArea();
};

updateArea();

}
};






// **************************************************************
// 
// Ops.String.NumberToString_v2
// 
// **************************************************************

Ops.String.NumberToString_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    val = op.inValue("Number"),
    decPlaces = op.inInt("Decimal Places", 4),
    result = op.outString("Result");

let doDec = false;
let decm = 1;
decPlaces.onChange = updateDecm;
val.onChange = update;
updateDecm();
update();

function updateDecm()
{
    doDec = decPlaces.get() < 100;
    decm = Math.pow(10, decPlaces.get());
    update();
}

function update()
{
    if (doDec)
        result.set(String(Math.round(val.get() * decm) / decm));
    else
        result.set(String(val.get() || 0));
}

}
};






// **************************************************************
// 
// Ops.Math.MapRange
// 
// **************************************************************

Ops.Math.MapRange= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inValueFloat("value", 0),
    old_min = op.inValueFloat("old min", 0),
    old_max = op.inValueFloat("old max", 1),
    new_min = op.inValueFloat("new min", 0),
    new_max = op.inValueFloat("new max", 1),
    easing = op.inValueSelect("Easing", ["Linear", "Smoothstep", "Smootherstep"], "Linear"),
    inClamp = op.inBool("Clamp", true),
    result = op.outNumber("result", 0);

op.setPortGroup("Input Range", [old_min, old_max]);
op.setPortGroup("Output Range", [new_min, new_max]);

let doClamp = true;
let ease = 0;
let r = 0;

v.onChange =
    old_min.onChange =
    old_max.onChange =
    new_min.onChange =
    new_max.onChange = exec;

exec();

inClamp.onChange =
() =>
{
    doClamp = inClamp.get();
    exec();
};

easing.onChange = function ()
{
    if (easing.get() == "Smoothstep") ease = 1;
    else if (easing.get() == "Smootherstep") ease = 2;
    else ease = 0;
};

function exec()
{
    const nMin = new_min.get();
    const nMax = new_max.get();
    const oMin = old_min.get();
    const oMax = old_max.get();
    let x = v.get();

    if (doClamp)
    {
        if (x >= Math.max(oMax, oMin))
        {
            result.set(nMax);
            return;
        }
        else
        if (x <= Math.min(oMax, oMin))
        {
            result.set(nMin);
            return;
        }
    }

    let reverseInput = false;
    const oldMin = Math.min(oMin, oMax);
    const oldMax = Math.max(oMin, oMax);
    if (oldMin != oMin) reverseInput = true;

    let reverseOutput = false;
    const newMin = Math.min(nMin, nMax);
    const newMax = Math.max(nMin, nMax);
    if (newMin != nMin) reverseOutput = true;

    let portion = 0;

    if (reverseInput) portion = (oldMax - x) * (newMax - newMin) / (oldMax - oldMin);
    else portion = (x - oldMin) * (newMax - newMin) / (oldMax - oldMin);

    if (reverseOutput) r = newMax - portion;
    else r = portion + newMin;

    if (ease === 0)
    {
        result.set(r);
    }
    else
    if (ease == 1)
    {
        x = Math.max(0, Math.min(1, (r - nMin) / (nMax - nMin)));
        result.set(nMin + x * x * (3 - 2 * x) * (nMax - nMin)); // smoothstep
    }
    else
    if (ease == 2)
    {
        x = Math.max(0, Math.min(1, (r - nMin) / (nMax - nMin)));
        result.set(nMin + x * x * x * (x * (x * 6 - 15) + 10) * (nMax - nMin)); // smootherstep
    }
}

}
};






// **************************************************************
// 
// Ops.Math.Round
// 
// **************************************************************

Ops.Math.Round= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    number1 = op.inValueFloat("number"),
    decPlaces = op.inInt("Decimal Places", 0),
    result = op.outNumber("result");

let decm = 0;

number1.onChange = exec;
decPlaces.onChange = updateDecm;

updateDecm();

function updateDecm()
{
    decm = Math.pow(10, decPlaces.get());
    exec();
}

function exec()
{
    result.set(Math.round(number1.get() * decm) / decm);
}

}
};






// **************************************************************
// 
// Ops.Number.SequenceNumbers
// 
// **************************************************************

Ops.Number.SequenceNumbers= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const cleanup = op.inTriggerButton("Clean up connections");
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hidePort": true });
cleanup.setUiAttribs({ "hideParam": true });
let updateTimeout = null;

const outputs = [];
const inputs = [];

for (let i = 0; i < 16; i++)
{
    const inp = op.inFloat("Number " + i, 0);
    const out = op.outNumber("Output " + i);

    inp.changeAlways = true;
    out.onLinkChanged = updateButton;

    outputs.push(out);
    inputs.push(inp);
}

for (let i = 0; i < inputs.length; i++)
{
    const inp = inputs[i];
    inp.onChange = function ()
    {
        for (let j = 0; j < outputs.length; j++) outputs[j].set(inp.get());
    };
}

function updateButton()
{
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < outputs.length; i++)
            if (outputs[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function clean()
{
    let count = 0;
    for (let i = 0; i < outputs.length; i++)
    {
        let removeLinks = [];

        if (outputs[i].links.length > 1)
            for (let j = 1; j < outputs[i].links.length; j++)
            {
                while (outputs[count].links.length > 0) count++;

                removeLinks.push(outputs[i].links[j]);
                const otherPort = outputs[i].links[j].getOtherPort(outputs[i]);
                op.patch.link(op, "Output " + count, otherPort.op, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
}

}
};






// **************************************************************
// 
// Ops.Devices.Midi.MidiCCOut_v2
// 
// **************************************************************

Ops.Devices.Midi.MidiCCOut_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const MIDIChannels = Array.from(Array(16).keys(), (i) => { return i + 1; }),
    clamp = (val, min, max) => { return Math.min(Math.max(val, min), max); },
    CC_STATUS_BYTE = 0xb;

const inExec = op.inTriggerButton("Send"),
    inChannel = op.inDropDown("MIDI Channel", MIDIChannels, "1"),
    inCcIndex = op.inInt("CC Index", 1),
    inCCValue = op.inInt("CC Value", 0),
    inAuto = op.inBool("Auto send value change", false),
    outEvent = op.outObject("MIDI Event Out");

inExec.onTriggered = send;

inCCValue.onChange = () =>
{
    if (inAuto.get())send();
};

function send()
{
    const ccValue = clamp(inCCValue.get(), 0, 127);
    const ccIndex = clamp(inCcIndex.get(), 1, 127);

    const event = {
        "deviceName": null,
        "output": null,
        "inputId": 0,
        "messageType": "CC",
        "data": [CC_STATUS_BYTE << 4 | (inChannel.get() - 1), ccIndex, ccValue],
        "index": ccIndex,
        "value": ccValue,
        "channel": inChannel.get() - 1,
    };

    outEvent.setRef(event);
}

}
};






// **************************************************************
// 
// Ops.Number.TriggerOnChangeNumber_v2
// 
// **************************************************************

Ops.Number.TriggerOnChangeNumber_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inval = op.inFloat("Value"),
    next = op.outTrigger("Next"),
    number = op.outNumber("Number");

inval.onChange = function ()
{
    number.set(inval.get());
    next.trigger();
};

op.init = () =>
{
    if (inval.isLinked())next.trigger();
};

}
};






// **************************************************************
// 
// Ops.Devices.Midi.MidiOutputDevice
// 
// **************************************************************

Ops.Devices.Midi.MidiOutputDevice= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const CC_STATUS_BYTE = 0xb;
const NOTE_OFF = 0x8;

const inDeviceSelect = op.inValueSelect("Device", ["none"]);
const inNote = op.inObject("Note");
const inCC = op.inObject("CC");
const inNRPN = op.inObject("NRPN");

let midi = null;
let outputDevice = null;
let currentNote = null;
let currentChannel = null;

inDeviceSelect.onChange = setDevice;

op.setPortGroup("Device", [inDeviceSelect]);
op.setPortGroup("Midi Events", [inNote, inCC, inNRPN]);

request();

inNRPN.onChange = function (_event)
{
    if (!outputDevice) return;
    if (!_event) return;

    const event = _event.get();

    if (!event) return;
    if (!event.data) return;
    if (event.messageType !== "NRPN") return;

    const indexLSB = (event.nrpnIndex & 0b1111111);
    const indexMSB = (event.nrpnIndex >> 7);

    const valueLSB = (event.nrpnValue & 0b1111111);
    const valueMSB = (event.nrpnValue >> 7);

    const dataIndexLSB = [CC_STATUS_BYTE << 4 | event.channel, 98, indexLSB];
    const dataIndexMSB = [CC_STATUS_BYTE << 4 | event.channel, 99, indexMSB];

    const dataValueLSB = [CC_STATUS_BYTE << 4 | event.channel, 38, valueLSB];
    const dataValueMSB = [CC_STATUS_BYTE << 4 | event.channel, 6, valueMSB];

    outputDevice.send(dataIndexLSB);
    outputDevice.send(dataIndexMSB);
    outputDevice.send(dataValueLSB);
    outputDevice.send(dataValueMSB);
};

inCC.onChange = function (_event)
{
    if (!outputDevice) return;
    if (!_event) return;

    const event = _event.get();

    if (!event) return;
    if (!event.data) return;
    if (event.messageType !== "CC") return;
    // TODO: Check for invalid status bytes
    outputDevice.send(event.data);
};

const killLastNote = () =>
{
    if (!outputDevice || !currentNote || !currentChannel) return;
    outputDevice.send([(NOTE_OFF << 4 | (currentChannel)), currentNote, 0]);
};

const killAllNotes = () =>
{
    if (!outputDevice) return;
    for (let i = 0; i < 128; i += 1)
    {
        for (let channel = 0; channel < 16; channel += 1) outputDevice.send([(NOTE_OFF << 4 | channel), i, 0]);
    }
};

inNote.onLinkChanged = function ()
{
    if (!inNote.isLinked()) killAllNotes();
};

inNote.onChange = function (_event)
{
    if (!outputDevice) return;
    if (!_event) return;

    const event = _event.get();

    if (!event) return;
    if (!event.data) return;
    // TODO: let CC all notes off message pass through
    // if (event.messageType !== "Note") return;
    // TODO: Check for invalid status bytes

    setTimeout(function ()
    {
        outputDevice.send(event.data);
        currentNote = event.index;
        currentChannel = event.channel;
    }, 10);
};

function setDevice()
{
    if (!midi || !midi.inputs) return;
    const name = inDeviceSelect.get();

    op.setUiAttrib({ "extendTitle": name });

    const inputs = midi.inputs.values();
    const outputs = midi.outputs.values();

    for (let output = outputs.next(); output && !output.done; output = outputs.next())
    {
        if (output.value.name === name)
        {
            outputDevice = midi.outputs.get(output.value.id);
        }
    }
}

function onMIDIFailure()
{
    op.uiAttr({ "warning": "No MIDI support in your browser." });
}

function onMIDISuccess(midiAccess)
{
    midi = midiAccess;
    const inputs = midi.inputs.values();
    const outputs = midi.outputs.values();

    const deviceNames = ["..."];

    for (let output = outputs.next(); output && !output.done; output = outputs.next())
        deviceNames.push(output.value.name);

    inDeviceSelect.uiAttribs.values = deviceNames;

    op.refreshParams();
    setDevice();
}

function request()
{
    if (navigator.requestMIDIAccess) navigator.requestMIDIAccess({ "sysex": false }).then(onMIDISuccess, onMIDIFailure);
    else onMIDIFailure("no midi/requestMIDIAccess");

    if (!midi)
    {
        op.log("request midi out again?");
        setTimeout(request, 500);
    }
}

}
};






// **************************************************************
// 
// Ops.Number.Number
// 
// **************************************************************

Ops.Number.Number= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inFloat("value"),
    result = op.outNumber("result");

v.onChange = exec;

let isLinked = false;
v.onLinkChanged = () =>
{
    if (!isLinked && v.isLinked())op.setUiAttribs({ "extendTitle": null });
    isLinked = v.isLinked();
};

function exec()
{
    if (CABLES.UI && !isLinked) op.setUiAttribs({ "extendTitle": Math.round(10000 * v.get()) / 10000 });

    result.set(Number(v.get()));
}

}
};





window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
