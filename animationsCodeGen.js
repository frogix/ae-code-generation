//TODO: Position transform: check if one of coord is static, rm it from output
//      and use appropriate sigle tranformation (_X or _Y)
//TODO: inject visibility code into timelines
//TODO: wiggle animations?
//TODO: asset init code (with initial position, rotation, blending, anchor)
//TODO: extract and rename assets
//TODO: resources loader code
//TODO: fix blending

const fs = require('fs');
const path = require('path');

const PROPERTIES_KEY_MAP = {
    'scale': 'SCALE_XY',
    'scale_1d': 'SCALE',
    'opacity': 'ALPHA',
    'position': 'XY',
    'position_x': 'X',
    'position_y': 'Y',
    'rotation': 'ROTATION_IN_DEGREES'
};

const MAX_DECIMAL_PLACES = 2;

function main()
{
    const inputFileName = parseInputFileNameArgument();

    let compObj = readFileAsJSON(inputFileName);

    compObj = normalizeCompObj(compObj);

    const layers = compObj.layers;

    const animationsCode = genAnimationsCode(layers);
    const initCode = genInitCode(layers);

    writeTextToFile(animationsCode, appendFileBasenameSuffix(inputFileName, "_anim"));
    writeTextToFile(initCode, appendFileBasenameSuffix(inputFileName, "_init"));
}

//init code...
function genInitCode(layers)
{
    return layers.map(genLayerInitCode).join('\n\n');
}

function genLayerInitCode (layer)
{
    let strings = [];

    strings.push(genGetAssetLoadLine(layer));

    // strings.push(genBlendingLine(layer));
    strings.push(genAnchorPointLine(layer));
    strings.push(genPositionLine(layer));
    strings.push(genOpacityLine(layer));
    strings.push(genVisibilityLine(layer));
    strings.push(genScaleLine(layer));
    strings.push(genAddToParentLine(layer));

    strings = strings.filter(str => str.length !== 0);

    return strings.join('\n');
}

function genAddToParentLine (layer)
{
    return 'l_udoc.i_addChild(l_udo);';
}

function genVisibilityLine (layer)
{
    return (layer.inFrame === 0) ? '' : 'l_udo.i_setVisible(false);';
}

function genGetAssetLoadLine (layer)
{
    return `l_udo = ` +
        `this._f${pascalize(layer.name)}_udo = ` +
        `this._getAssetContent(l_grsl, l_grsl.i_get${pascalize(layer.name)}ImgURL());`;
}

function genBlendingLine (layer)
{
    return (layer.isBlendingNormal) ? '' : `l_udo.i_setAdditiveBlendingMode();`;
}

function genOpacityLine (layer)
{
    return (layer.opacity === 1) ? '' : `l_udo.i_setAlpha(${layer.opacity});`;
}

function genScaleLine (layer)
{
    const scaleX = layer.scale[0];
    const scaleY = layer.scale[1];

    if (scaleX === 1 && scaleY === 1)
    {
        return '';
    }

    if (scaleX === 1)
    {
        return `l_udo.i_setScaleY(${scaleY});`;
    }

    if (scaleY === 1)
    {
        return `l_udo.i_setScaleX(${scaleX});`;
    }

    if (scaleX === scaleY)
    {
        return `l_udo.i_setScale(${scaleX});`;
    }

    return `l_udo.i_setScaleXY(${scaleX}, ${scaleY});`;
}

function genPositionLine (layer)
{
    const posX = layer.position[0];
    const posY = layer.position[1];

    if (posX === 0 && posY === 0)
    {
        return '';
    }

    if (posX === 0)
    {
        return `l_udo.i_setY(${posY});`;
    }

    if (posY === 0)
    {
        return `l_udo.i_setX(${posX});`;
    }

    return `l_udo.i_setXY(${posX}, ${posY});`;
}

function genAnchorPointLine (layer)
{
    const offsetX = layer.anchorPoint[0];
    const offsetY = layer.anchorPoint[1];

    if (offsetX === layer.width / 2 && offsetY === layer.height / 2)
    {
        return "l_udo.i_alignLocalBoundsCM();";
    }

    // AE and game engine have different signs for offset (that's why we use minus)
    return `l_udo.i_setLocalBoundsXY(${-offsetX}, ${-offsetY});`;
}
//...init code

//data normalization...
function normalizeCompObj(compObj)
{
    compObj.layers = compObj.layers.filter(layer => layer !== null);

    compObj = convertPositionsToRelative(compObj);
    compObj = normalize(compObj);

    compObj = convertComp2dAnimationsTo1dIfPossible(compObj);

    const layers = compObj.layers;

    layers.forEach(layer => layer.name = normalizeString(layer.name));
    return compObj;
}

function convertComp2dAnimationsTo1dIfPossible(compObj)
{
    let layers = compObj.layers;

    compObj.layers = layers.map(convertLayer2dAnimationsTo1dIfPossible);

    return compObj;
}


function convertLayer2dAnimationsTo1dIfPossible(layer)
{
    let animations = layer.animationsArray;

    layer.animationsArray = animations.map(convert2dAnimationTo1dIfPossible);

    return layer;
}

function convert2dAnimationTo1dIfPossible(animation)
{
    if (!(animation.name === 'position' || animation.name === 'scale'))
    {
        return animation;
    }

    let keyframes = animation.keyframes;

    const keyframeValues = keyframes.map(kf => kf.value);

    const frameIndexes = keyframes.map(kf => kf.frameIndex);

    if (animation.name === 'scale')
    {
        const equalPairs = keyframeValues.filter(xyPair => xyPair[0] === xyPair[1]);
        if (equalPairs.length === keyframeValues.length)
        {
            animation.keyframes = updateKeyframesValues(
                keyframes,
                keyframes.map(kf => kf.value[0])
            );

            animation.name = 'scale_1d';

            return animation;
        }
    }

    var xValues = keyframeValues.map(keyframeValue => keyframeValue[0]); 
    var yValues = keyframeValues.map(keyframeValue => keyframeValue[1]); 

    let nameSuffix = '';

    if (isConstArray(xValues))
    {
        nameSuffix = '_y';
        keyframes = updateKeyframesValues(keyframes, yValues);
    }
    else if (isConstArray(yValues))
    {
        nameSuffix = '_x';
        keyframes = updateKeyframesValues(keyframes, xValues);
    }
    
    if (nameSuffix)
    {
        animation.name += nameSuffix;
        animation.keyframes = keyframes;
    }

    return animation;
}

function updateKeyframesValues(keyframes, newValues)
{
    const frameIndexes = keyframes.map(kf => kf.frameIndex);

    return newValues.map((value, index) => {
        return {
            frameIndex: frameIndexes[index],
            value: value
        };
    }) 
}

function isConstArray(array)
{
    for (var i = 0; i < array.length-1; i++)
    {
        if (array[i+1] !== array[i]) return false;
    }

    return true;
}


function convertPositionsToRelative(compObj)
{
    let layers = compObj.layers;

    const {compWidth, compHeight} = compObj;

    const animationsPosToCompRelative = layer =>
        convertAnimationsPositionsToRelative.apply(null, [layers, layer, compWidth, compHeight]);

    const layerPosToCompRelative = layer =>
        convertLayerPositionsToCompRelative.apply(null, [layers, layer, compWidth, compHeight]);

    layers = layers.map(animationsPosToCompRelative);
    layers = layers.map(layerPosToCompRelative);

    const modifiedObj = deepCloneObject(compObj);

    modifiedObj.layers = layers;
    return modifiedObj;
}

function convertLayerPositionsToCompRelative(layers, layer, compWidth, compHeight)
{
    const modifiedLayer = deepCloneObject(layer);

    var offsetX = 0;
    var offsetY = 0;

    if (layer.parentId)
    {
        var parent = layers[layer.parentId-1];
        console.log(layer.name, '<', parent.name, '(' + layer.parentId + ')');
        offsetX = -parent.anchorPoint[0];
        offsetY = -parent.anchorPoint[1];
    }
    else
    {
        offsetX = -compWidth / 2;
        offsetY = -compHeight / 2;
    }

    modifiedLayer.position[0] += offsetX;
    modifiedLayer.position[1] += offsetY;

    return modifiedLayer;
}

function convertAnimationsPositionsToRelative(layers, layer, compWidth, compHeight)
{
    const clonedLayer = deepCloneObject(layer);

    const animations = clonedLayer.animationsArray;

    const positionAnimation = animations.filter(
        animation => animation.name === "position"
    )[0];

    if (positionAnimation === undefined) return clonedLayer;

    var offsetX = 0;
    var offsetY = 0;

    if (layer.parentId)
    {
        var parent = layers[layer.parentId-1];
        offsetX = -parent.anchorPoint[0];
        offsetY = -parent.anchorPoint[1];
    }
    else
    {
        offsetX = -compWidth / 2;
        offsetY = -compHeight / 2;
    }

    positionAnimation.keyframes.map(keyframe => {
        keyframe.value[0] += offsetX;
        keyframe.value[1] += offsetY;
    });

    return clonedLayer;
}

function normalize (value)
{
    const type = typeof value;

    if (type === "number")
    {
        return normalizeNumber(value);
    };

    if (type !== "object" || value === null)
    {
        return value;
    }

    if (Array.isArray(value))
    {
        return value.map(normalize);
    }

    let result = {};

    for (const key in value)
    {
        result[key] = normalize(value[key]);
    }

    return result;
}

const normalizeNumber = (num) => parseFloat(num.toFixed(MAX_DECIMAL_PLACES));
//...data normalization

//animations code...
function genAnimationsCode (layers)
{
    let generatedString = "";

    for (let layer of layers)
    {
        const name = layer.name.trim();

        let layerString = `l_udo = this._f${pascalize(name)}_udo;\n`;
        layerString += genVisibilityStrings(layer);
        layerString += genAddAnimationStrings(layer.animationsArray);

        layerString = encloseByBlockComments(layerString.trim(), name.toUpperCase());

        generatedString += layerString + '\n\n';
    }

    return generatedString;
}

function genAddAnimationStrings (animationsArray)
{
    let generatedString = "";
    for (let propAnimation of animationsArray)
    {
        let animationCode = PROPERTIES_KEY_MAP[propAnimation.name];
        let initialValue = extractKeyframesInitialValue(propAnimation.keyframes);
        generatedString += `` +
            `l_gut.i_addAnimation(l_udo, GUTimeline.i_SET_${animationCode}, ${toString(initialValue)},\n` +
            `\t[\n\t\t${genKeyframesStrings(propAnimation.keyframes)}\n\t]\n);\n\n`
    }

    return generatedString;
}

function genVisibilityStrings (layer)
{
    return `` +
        `l_gut.i_callHandlerAtTime(${layer.inFrame}, l_udo.i_setVisible.i_toObjectMethod(l_udo), [true]);\n` +
        `l_gut.i_callHandlerAtTime(${layer.outFrame}, l_udo.i_setVisible.i_toObjectMethod(l_udo), [false]);\n`;
}

function extractKeyframesInitialValue (keyframes)
{
    return trimValueArrayIfNeeded(keyframes[0].value);
}

function genKeyframesStrings (keyframes)
{
    let outputArray = [];

    let prevFrameIndex = keyframes[0].frameIndex;
    if (prevFrameIndex !== 0)
    {
        outputArray.push(prevFrameIndex); // delay before start
    }

    for (var i = 0; i < keyframes.length; i++)
    {
        keyframe = keyframes[i];

        let frameDelta = keyframe.frameIndex - prevFrameIndex;
        prevFrameIndex = keyframe.frameIndex;
        let value = keyframe.value;

        if (frameDelta === 0)
        {
            continue;
        }

        value = trimValueArrayIfNeeded(value);

        // replace two equal keyframes with pause
        if (i > 0)
        {
            let prevValue = keyframes[i-1].value;

            if (deepEqual(value, prevValue))
            {
                outputArray.push(frameDelta)
                continue;
            }
        }

        let frameArray = [];

        frameArray.push(toString(value));
        frameArray.push(frameDelta);

        outputArray.push(toString(frameArray));
    }

    return outputArray.join(',\n\t\t');
}

function deepEqual (x, y) {
  if (x === y) {
    return true;
  }
  else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
    if (Object.keys(x).length != Object.keys(y).length)
      return false;

    for (var prop in x) {
      if (y.hasOwnProperty(prop))
      {  
        if (! deepEqual(x[prop], y[prop]))
          return false;
      }
      else
        return false;
    }
    
    return true;
  }
  else 
    return false;
}
//...animations code

//util fns...
function trimValueArrayIfNeeded (value)
{
    if (Array.isArray(value))
    {
        return value.splice(0, 2);
    }
    return value;
}


function deepCloneObject(object)
{
    return JSON.parse(JSON.stringify(object));
}
//...util fns

//string helpers...
function toString(value, arrayDelimeter)
{
    let delimeter = arrayDelimeter || ', ';
    let type = typeof value;

    if (Array.isArray(value))
    {
        return `[${value.join(delimeter)}]`
    }

    return value.toString();
}

function encloseByBlockComments(string, blockName)
{
    return `//${blockName}...\n${string}\n//...${blockName}`
}

function toSignedNumberString (num)
{
    const sign = num > 0 ? '+' : '-';
    return `${sign}${Math.abs(num)}`;
}

//layer name converters...
function pascalize (str)
{
    let camelized = camelize(str);
    return camelized[0].toUpperCase() + camelized.slice(1)
}

function camelize (str)
{
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function snakeCase (str)
{
    return str.replace(/\W+/g, " ")
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
};

function normalizeString (name)
{
    let newName = name
        .replace(/^LMC/, '')
        .replace(/MASK/, 'mask')
        .replace(/BG/, 'bg')
        .replace(/FX/i, '')
        .replace(/[_\-/.]/g, ' ')
        .replace(/(?:png|jpeg|jpg)$/i, '')
        .replace(/\s+/, ' ');

    return newName;
}
//...layer name converters
//...string helpers

//file handling...
function writeTextToFile(text, fn)
{
    fs.writeFileSync(fn, text);
}

function readFileAsJSON(inputFileName)
{
    return require(inputFileName);
}

function appendFileBasenameSuffix(inputFileName, suffix)
{
    const ext = path.extname(inputFileName);
    const base = path.basename(inputFileName, ext);

    return `${base}${suffix}.js`;
}

function parseInputFileNameArgument()
{
    return path.resolve(process.argv.slice(2)[0]);
}
//...file handling

main();
