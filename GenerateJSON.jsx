var PROPERTIES = [
    "position",
    "rotation",
    "scale",
    "opacity"
];

var FRAMES_PER_SECOND = 30;

function main()
{
    // var win = initSetupWindow();
    // win.show();

    // var properties = getSelectedProperties(win);
    // var fileName = getSelectedFileName(win);

    var properties = PROPERTIES;

    var proj = app.project;
    var comp = proj.activeItem;
    var fileName = comp.name;
    var layers = scanLayers(comp, properties);

    var parsedData = {
        compWidth: comp.width,
        compHeight: comp.height,
        layers: layers
    };

    saveFile(parsedData, fileName);
}


function scanLayers(comp, props)
{
    var layers = [];

    for (var i = 1; i <= comp.layers.length; i++)
    {
        var layer = comp.layer(i);
        var layerData = scanLayer(layer, props);

        layers[i] = layerData;
    }

    return layers;
}

function scanLayer(layer, props)
{
    var animationsArray = [];

    for (var p = 0; p < props.length; p++)
    {
        var propertyName = props[p];
        var property = layer[propertyName];
        var keyframes = getPropertyKeyframes(property);
        if (keyframes.length > 0)
        {
            animationsArray.push({
                name: propertyName,
                keyframes: keyframes
            });
        }
    }

    var layerObj = parseLayerInfo(layer);
    layerObj.animationsArray = animationsArray;

    return layerObj;
}

function parseLayerInfo(layer)
{
    var transformObj = layer.transform;

    var layerObj = {
        name: layer.name,
        width: layer.width,
        height: layer.height,
        anchorPoint: transformObj.anchorPoint.value,
        inFrame: timeToFrame(layer.inPoint),
        opacity: percentToFixedFraction(transformObj.opacity.value),
        outFrame: timeToFrame(layer.outPoint),
        position: transformObj.position.value,
        scale: transformObj.scale.value.map(percentToFixedFraction)
    }

    if (layer.parent)
    {
        layerObj.parentId = layer.parent.index;
    }

    if (transformObj.rotation)
    {
        layerObj.rotation = transformObj.rotation.value;
    }

    layerObj.isBlendingNormal = layerObj.blendingMode === BlendingMode.NORMAL;

    return layerObj;
}

function timeToFrame(time)
{
    return Math.floor(FRAMES_PER_SECOND * time);
}

function getPropertyKeyframes(property)
{
    var propKeyFrames = [];

    for (var i = 1; i <= property.numKeys; i++)
    {
        var time = property.keyTime(i);
        var value = property.keyValue(i);

        propKeyFrames.push({
            frameIndex: timeToFrame(time),
            value: adjustValueByType(value, property)
        });
    }

    return propKeyFrames;
}


function adjustValueByType (value, property)
{
    var adjustedValue = value;

    switch (property.matchName)
    {
        case "ADBE Scale":
            adjustedValue = value.map(percentToFixedFraction);
            break;
        case "ADBE Opacity":
            adjustedValue = percentToFixedFraction(value);
            break;
    }

    return adjustedValue;
}

function percentToFixedFraction(percent)
{
    return Math.round(percent) / 100;
}

function getFormattedLayerName(layer)
{
    return layer.name.replace(/\s/g, '_').toLowerCase();
}

function isLayerExist(comp, id)
{
    return id <= comp.layers.length
            || comp.layer(id);
}

////////////////////////////////////////////////
// SETUP WINDOW
////////////////////////////////////////////////
function initSetupWindow ()
{
    var win = new Window('dialog', 'Alert Box Builder');
    win.options = win.add('panel', undefined, 'Build it');

    for (var i = 0; i < PROPERTIES.length; i++)
    {
        win[PROPERTIES[i]] = win.options.add('checkbox', undefined, PROPERTIES[i]);
        win[PROPERTIES[i]].value = true;
    }

    win.options.fileNameLabel = win.options.add('statictext', undefined, 'json file name:');
    win.options.fileName = win.options.add('edittext', undefined, 'fileName');
    win.options.buildBtn = win.options.add('button', undefined, 'Build',
    {
        name: 'ok'
    });

    return win;
}


function getSelectedFileName(win)
{
    var fileName = win.options.fileName.text;
    if (fileName == "fileName")
    {
        fileName = app.project.file.name.replace(".aep", '');
    }

    return fileName;
}

function getSelectedProperties(win)
{
    var properties = [];
    for (var i = 0; i < PROPERTIES.length; i++)
    {
        log(PROPERTIES[i] + " -> " + win[PROPERTIES[i]].value);
        if (win[PROPERTIES[i]].value)
        {
            properties.push(PROPERTIES[i]);
        }
    }

    return properties;
}

////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////
function log(arg)
{
    $.writeln(arg);
}

//gets a URL based on the file path and the name
function getUrl(name)
{
    var projectName = app.project.file.name.replace(".aep", '');
    var compName = app.project.activeItem.name;
    var fileName = name || projectName + "_" + compName + ".json";
    fileName = fileName.replace(/\s/g, '');
    var path = app.project.file.parent.absoluteURI + "/";
    return path + fileName;
}

//   you need to allow AE to write files to your hard drive:
//   go to: Edit > Preferences > General > and check on "Allow Scripts to Write Files and Access Network"
function saveFile(obj, fileName)
{
    var output = new File(getUrl(fileName + ".json"));
    if (output.open("w"))
    {
        output.encoding = "UTF-8";
        var content = JSON.stringify(obj, undefined, 2);
        output.write(content);
        output.close();
    }
}

//JSON object
"object"!=typeof JSON&&(JSON={}),function(){"use strict";function f(t){return 10>t?"0"+t:t}function this_value(){return this.valueOf()}function quote(t){return rx_escapable.lastIndex=0,rx_escapable.test(t)?'"'+t.replace(rx_escapable,function(t){var e=meta[t];return"string"==typeof e?e:"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+t+'"'}function str(t,e){var r,n,o,u,f,a=gap,i=e[t];switch(i&&"object"==typeof i&&"function"==typeof i.toJSON&&(i=i.toJSON(t)),"function"==typeof rep&&(i=rep.call(e,t,i)),typeof i){case"string":return quote(i);case"number":return isFinite(i)?i+"":"null";case"boolean":case"null":return i+"";case"object":if(!i)return"null";if(gap+=indent,f=[],"[object Array]"===Object.prototype.toString.apply(i)){for(u=i.length,r=0;u>r;r+=1)f[r]=str(r,i)||"null";return o=0===f.length?"[]":gap?"[\n"+gap+f.join(",\n"+gap)+"\n"+a+"]":"["+f.join(",")+"]",gap=a,o}if(rep&&"object"==typeof rep)for(u=rep.length,r=0;u>r;r+=1)"string"==typeof rep[r]&&(n=rep[r],o=str(n,i),o&&f.push(quote(n)+(gap?": ":":")+o));else for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(o=str(n,i),o&&f.push(quote(n)+(gap?": ":":")+o));return o=0===f.length?"{}":gap?"{\n"+gap+f.join(",\n"+gap)+"\n"+a+"}":"{"+f.join(",")+"}",gap=a,o}}var rx_one=/^[\],:{}\s]*$/,rx_two=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,rx_three=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,rx_four=/(?:^|:|,)(?:\s*\[)+/g,rx_escapable=/[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,rx_dangerous=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=this_value,Number.prototype.toJSON=this_value,String.prototype.toJSON=this_value);var gap,indent,meta,rep;"function"!=typeof JSON.stringify&&(meta={"\b":"\\b","	":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(t,e,r){var n;if(gap="",indent="","number"==typeof r)for(n=0;r>n;n+=1)indent+=" ";else"string"==typeof r&&(indent=r);if(rep=e,e&&"function"!=typeof e&&("object"!=typeof e||"number"!=typeof e.length))throw Error("JSON.stringify");return str("",{"":t})}),"function"!=typeof JSON.parse&&(JSON.parse=function(text,reviver){function walk(t,e){var r,n,o=t[e];if(o&&"object"==typeof o)for(r in o)Object.prototype.hasOwnProperty.call(o,r)&&(n=walk(o,r),void 0!==n?o[r]=n:delete o[r]);return reviver.call(t,e,o)}var j;if(text+="",rx_dangerous.lastIndex=0,rx_dangerous.test(text)&&(text=text.replace(rx_dangerous,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})),rx_one.test(text.replace(rx_two,"@").replace(rx_three,"]").replace(rx_four,"")))return j=eval("("+text+")"),"function"==typeof reviver?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}();

function JSONstringifyOrder( obj, space )
{
    var allKeys = [];
    var seen = {};
    JSON.stringify(obj, function (key, value) {
        if (!(key in seen)) {
            allKeys.push(key);
            seen[key] = null;
        }
        return value;
    });
    allKeys.sort();
    return JSON.stringify(obj, allKeys, space);
}

Array.prototype.map = function(callbackFn) {
  var arr = [];
  for (var i = 0; i < this.length; i++) {
     /* call the callback function for every value of this array and       push the returned value into our resulting array
     */
    arr.push(callbackFn(this[i], i, this));
  }
  return arr;
}

////////////////////////////////////////////////
// GO !
////////////////////////////////////////////////

main();