//------------------------------------------------------------------------------
// File: "[M] Fix Font Weight.jsx"
// Version: 1.0
// Release Date: 16. 4. 2018
// Copyright: © 2018 Jaroslav Bereza <http://bereza.cz>

/*
    <javascriptresource>
    <name>[M] Fix Font Weight 1.0</name>
    <enableinfo>true</enableinfo>
    <category>Magic</category>
    </javascriptresource>
    
    VERSION HISTORY:
    ================
    1.0:
    - Initial release.
    
    ALGORITHM
    =========
    
    
    TODO:
    - wide/condensed styles
	- better variable fonts support
    
    KNOWN ISSUES:
	- multicolor fonts are not supported
	- variable font as a target font is not supported
	- layer might have same styleRange twice... wtf Adobe?! -> this is workarounded with rangeIntegrityCheck function

*/

#target Photoshop
app.bringToFront();

cTID = function (s) {
	return cTID[s] || (cTID[s] = app.charIDToTypeID(s));
};
sTID = function (s) {
	return app.stringIDToTypeID(s);
};
idTS = function (id) {
	return app.typeIDToStringID(id);
};

var model = [
	/*{
		layerID: 0,
		changed: false,
		newDesc: {},
		oldDesc: {},
		newRanges:[
			{}
		],
		oldRanges:[
			{}
		]
	}*/
];
var fonts = app.fonts;
var installedFonts;
var newFont;

var ignore = [
	"concept",
	"color"
]

var weights = {
	"hairline": 1,
	"ultra light": 1,
	"ultralight": 1,
	"ultra thin": 1,
	"ultrathin": 1,
	"extra light": 2,
	"extralight": 2,
	"thin": 2,
	"light": 3,
	"demi": 3,
	"normal": 4,
	"regular": 4,
	"book": 4,
	"roman": 4,
	"plain": 4,
	"medium": 5,
	"semibold": 6,
	"demibold": 6,
	"demi bold": 6,
	"bold": 7,
	"black": 8,
	"heavy": 8,
	"extra bold": 8,
	"extrabold": 8,
	"extra black": 9,
	"extrablack": 9,
	"fat": 9,
	"poster": 9,
	"ultra black": 9,
	"ultrablack": 9
}

var italics = {
	"italic": 1,
	"oblique": 1,
	"slanted": 1
}

var result;

const psVersion = app.version.split('.')[0];
var startDisplayDialogs = app.displayDialogs;
app.displayDialogs = DialogModes.NO;


initialize();

function initialize() {

	if (app.documents.length == 0) {
		alert("Please open some document and select text layer(s)");
		return;
	}

	var selected = getSelectedLayers();
	selected = convertIndexesToIDs(selected);
	selected = filterEditableTextLayers(selected);

	if (selected.length === 0) {
		alert("Please select non-empty text layer(s)");
		return;
	}

	if(getHistoryPreferences().maximumStates < 2){
		alert("Photoshop must have allowed two or more history states in performance preferences");
		return;
	}

	if(!existsPreviousStep()){
		alert("Undo is not available. First change font then apply fix. Make sure that you have original state captured in history panel.");
		return;
	}

	app.activeDocument.suspendHistory("[M] Fix Font Weight", "main(selected);");
	if(result !== undefined){
		removeCurrentHistoryState();
	}
	app.displayDialogs = startDisplayDialogs;
}

function main(selected) {
	installedFonts = getInstalledFonts();

	for (var i = 0, len = selected.length; i < len; i++) {
		var layerData = {
			layerID: selected[i],
			changed: false,
			newDesc: getTextKey(selected[i]),
			oldDesc: null,
			newRanges: [],
			oldRanges: []
		};

		var textStyleRange = layerData.newDesc.getList(stringIDToTypeID('textStyleRange'));

		for (var ii = 0, len2 = textStyleRange.count; ii < len2; ii++) {
			layerData.newRanges.push(textStyleRange.getObjectValue(ii));
		};

		model.push(layerData);
	};

	
	undo();
/*
	var selectedBefore = getSelectedLayers();
	selectedBefore = convertIndexesToIDs(selectedBefore);
	selectedBefore = filterEditableTextLayers(selectedBefore);


	if(selected.toString() !== selectedBefore.toString()){
		redo();
		alert("I Can't fix layers because in previous step were selected different layers")
		result = 1;
		return;
	}
*/

	for (var i = 0, len = model.length; i < len; i++) {
		var layerData = model[i];
		if( ! isEditableTextLayer(layerData.layerID)){
			array.splice(i, 1);
			i--;
			len--;
			//$.writeln("skipped: " + layerData.layerID );
			continue;
		}
		layerData.oldDesc = getTextKey(layerData.layerID);

		var textStyleRange = layerData.oldDesc.getList(stringIDToTypeID('textStyleRange'));

		for (var ii = 0, len2 = textStyleRange.count; ii < len2; ii++) {
			layerData.oldRanges.push(textStyleRange.getObjectValue(ii));
		};
	};

	redo();

	if(psVersion < 16){
		progressTask();
	}else{
		app.doProgress("So many letters, give me a moment please.","progressTask()");
	}

	function progressTask(){
		var timeSum = 0;
          	var dummy = $.hiresTimer; //reading reset timer to zero

		for (var i = 0, len = model.length; i < len; i++) {
			if(psVersion < 16){
				progressSubTask(i);
			}else{
				var continueTask = app.doProgressSubTask(i,len,"progressSubTask("+i+")");
				timeSum += $.hiresTimer;
				if(i>0){             
					var timeInSeconds = Math.round(((timeSum/i) * (len - i))/1000000);
					app.changeProgressText("Estimated time to completion: "+timeInSeconds+" s. Processed "+i+" layers from "+len+"");
				}
				if(continueTask === false)
				{
					alert("You have interrupted the process. Only some layers was changed. Use 'Edit > Undo' if you want restore layers.");
					break;
				}
			}
		}
	}

	function progressSubTask(i){
		var layerData = model[i];
		var oldRanges = layerData.oldRanges;
		var newRanges = layerData.newRanges;

		// normalize ranges
		for (var ii = 0, len2 = oldRanges.length; ii < len2; ii++) {
			var oldTo = oldRanges[ii].getInteger(stringIDToTypeID("to"));
			var newTo = newRanges[ii].getInteger(stringIDToTypeID("to"));

			if (newTo > oldTo) {
				layerData.changed = true;
				var styleRangeCopy = new ActionDescriptor();
				newRanges[ii].putInteger(stringIDToTypeID("to"), oldTo);
				styleRangeCopy.fromStream(newRanges[ii].toStream());
				newRanges.splice(ii + 1, 0, styleRangeCopy);
				newRanges[ii + 1].putInteger(stringIDToTypeID("from"), oldTo);
				newRanges[ii + 1].putInteger(stringIDToTypeID("to"), newTo);
			}
		};

		for (var ii = 0, len2 = oldRanges.length; ii < len2; ii++) {
			var newTextStyle = newRanges[ii].getObjectValue(stringIDToTypeID("textStyle"));
			var oldTextStyle = oldRanges[ii].getObjectValue(stringIDToTypeID("textStyle"));

			var newFontStyleName = newTextStyle.getString(stringIDToTypeID("fontStyleName"));
			var newFontPostScriptName = newTextStyle.getString(stringIDToTypeID("fontPostScriptName"));
			var newFamily = newTextStyle.getString(stringIDToTypeID("fontName"));

			var oldFontStyleName = oldTextStyle.getString(stringIDToTypeID("fontStyleName"));
			var oldFontPostScriptName = oldTextStyle.getString(stringIDToTypeID("fontPostScriptName"));

			if(includes(ignore,newFontStyleName.toLowerCase()) ){
				//redo();
				alert("Multi-color fonts are not currently supported");
				result = 2;
				return;
			}

			if (oldFontPostScriptName === newFontPostScriptName) {
				continue;
			}

			layerData.changed = true;
			var fixedFont = getFontMatchByFamily(newFamily, oldFontStyleName);

			newTextStyle.putString(stringIDToTypeID("fontPostScriptName"), fixedFont);
			newRanges[ii].putObject(stringIDToTypeID("textStyle"),stringIDToTypeID("textStyle"),newTextStyle);
		};
		if (layerData.changed) {
			var textStyleRangeList = new ActionList();
			rangeIntegrityCheck(newRanges);
			for(var ii = 0, len2 = newRanges.length; ii < len2; ii++){
				textStyleRangeList.putObject(stringIDToTypeID('textStyleRange'),newRanges[ii])
			} 
			layerData.newDesc.putList(stringIDToTypeID('textStyleRange'),textStyleRangeList);
			applyTextKey(layerData.newDesc, layerData.layerID);
		}
	}
}

function getFontMatchByFamily(newFamily, oldFontStyleName) {
	//  remove dash and numbers from variable fonts - font style
	oldFontStyleName = oldFontStyleName.toLowerCase().replace(/-/g, '').replace(/[0-9]/g, "");
	var isItalic = "notItalics";
	var computedWeight = null;

	// original font italics
	for (var italic in italics) {
		if (oldFontStyleName.indexOf(italic) !== -1) {
			// replace italic, trim,
			oldFontStyleName = oldFontStyleName.replace(italic, "").replace(/^\s+|\s+$/gm,'');
			isItalic = "italics";
			if(oldFontStyleName===""){
				computedWeight=4;
			}
			break;
		}
	};
	// original font weight
	for (var weight in weights) {
		if (oldFontStyleName === weight) {
			computedWeight = weights[weight];
			break;
		}
	};

	newFont = newFont || initializeInstalledFont(installedFonts[newFamily]);

	var italicToggled = false;
	var postScriptName = findIt();
	return postScriptName;


	function findIt() {
		var delta = 0;
		while (newFont.style[isItalic][computedWeight + delta] === undefined && newFont.style[isItalic][computedWeight - delta] === undefined) {
			if (delta > 10) {
				if (!italicToggled) {
					italicToggled = true;
					isItalic = (isItalic === "italics") ? "notItalics" : "italics";
					return findIt();
				}
			}
			delta += 1;
		}
		if (newFont.style[isItalic][computedWeight - delta] !== undefined) {
			computedWeight -= delta;
		} else{
			computedWeight += delta;
		}
		return newFont.style[isItalic][computedWeight];
	}
}

// Find styles for new font family
function initializeInstalledFont(fontFamily) {
	var style = {
		italics: [],
		notItalics: []
	}

	for (var i = 0, len = fontFamily.style.length; i < len; i++) {
		//  remove dash and numbers from variable fonts - font style
		var currentFontStyle = fontFamily.style[i].toLowerCase().replace(/-/g, ' ').replace(/[0-9]/g, "");
		var isItalic = "notItalics";
		var newComputedWeight = null;
		for (var italic in italics) {
			if (currentFontStyle.indexOf(italic) !== -1) {
				currentFontStyle = currentFontStyle.replace(italic, "").replace(/^\s+|\s+$/gm,'');;
				isItalic = "italics";
				break;
			}
		};
		for (var weight in weights) {
			if (currentFontStyle === weight) {
				newComputedWeight = weights[weight];
				style[isItalic][newComputedWeight] = fontFamily.postScriptName[i];
				break;
			}
		};
		if (newComputedWeight === null) {
			style[isItalic][4] = fontFamily.postScriptName[i];
		}
	};
	fontFamily.style = style;
	return fontFamily;
}

// Read installed fonts and transform them into custom format
function getInstalledFonts() {
	var fontFamilyList = {};
	for (var i = 0, len = fonts.length; i < len; i++) {
		var font = fonts[i].family;

		if (fontFamilyList[font] == undefined) {
			fontFamilyList[font] = {};
		}
		fontFamilyList[font].family = fonts[i].family;

		if (fontFamilyList[font].postScriptName == undefined) {
			fontFamilyList[font].postScriptName = [];
		}
		fontFamilyList[font].postScriptName.push(fonts[i].postScriptName);

		if (fontFamilyList[font].style == undefined) {
			fontFamilyList[font].style = []; // regular, italic atd.
		}
		fontFamilyList[font].style.push(fonts[i].style);
	}
	return fontFamilyList;
}

function rangeIntegrityCheck(ranges){
	var last = 0;
	for (var i=0, len=ranges.length; i < len ; i++) {
		var from = ranges[i].getInteger(stringIDToTypeID("from"));
		var to = ranges[i].getInteger(stringIDToTypeID("to"));
		if(from !== last){
			ranges.splice(i, 1);
			i--;
			len--;
		}
		last = to;
	};
}


function applyTextKey(textKey, index) {
	var layerRef = new ActionReference();
	layerRef.putIdentifier(cTID('Lyr '), index);
	var idsetd = charIDToTypeID("setd");
	var desc151 = new ActionDescriptor();
	desc151.putReference(charIDToTypeID("null"), layerRef);
	var idT = charIDToTypeID("T   ");
	var idTxLr = charIDToTypeID("TxLr");
	desc151.putObject(idT, idTxLr, textKey);

	executeAction(idsetd, desc151, DialogModes.NO);
}

function getTextKey(layerID) {
	var ref = new ActionReference();
	var idPrpr = charIDToTypeID("Prpr");
	var idTxtS = stringIDToTypeID("textKey");
	ref.putProperty(idPrpr, idTxtS);
	var lyr = charIDToTypeID("Lyr ");
	ref.putIdentifier(lyr, layerID);

	// step inside
	var desc = executeActionGet(ref);
	var descTextKey = desc.getObjectValue(stringIDToTypeID('textKey'));

	return descTextKey;
}

function getSelectedLayers() {
	var selectedLayers = [];
	var backGroundCounter = getBgCounter();
	var ref = new ActionReference();
	var keyTargetLayers = app.stringIDToTypeID('targetLayers');
	ref.putProperty(app.charIDToTypeID('Prpr'), keyTargetLayers);
	ref.putEnumerated(app.charIDToTypeID('Dcmn'), app.charIDToTypeID('Ordn'), app.charIDToTypeID('Trgt'));
	var desc = executeActionGet(ref);
	if (desc.hasKey(keyTargetLayers)) {
		var layersList = desc.getList(keyTargetLayers);
		for (var j = 0; j < layersList.count; j++) {
			var listRef = layersList.getReference(j);
			selectedLayers.push(listRef.getIndex() + backGroundCounter);
		}
	}
	// CS6 and CC
	if (psVersion < 15 && selectedLayers.length === 0) {
		selectedLayers.push(cs6SelectedLayerBugFix());
	}
	return selectedLayers;
}

function convertIndexesToIDs(indexes){
	for (var i=0, len=indexes.length; i < len ; i++) {
		var ref = new ActionReference();
		var layerID = app.stringIDToTypeID('layerID');
		ref.putProperty(app.charIDToTypeID('Prpr'), layerID);
		ref.putIndex(app.charIDToTypeID('Lyr '),indexes[i]);
		var desc = executeActionGet(ref);
		indexes[i] = desc.getInteger(layerID);
	};
	var ids = indexes;
	return ids;
}

function hasBackground(){
	try {
		var dummy = app.activeDocument.backgroundLayer;
		return true;
	} catch (e) {;
		return false;
	} 
}

function getBgCounter() {
	try {
		var dummy = app.activeDocument.backgroundLayer;
		return 0;
	} catch (e) {;
		return 1
	} 
}

function filterEditableTextLayers(list) {
	for (var i = 0, len = list.length; i < len; i++) {
		
		if ( ! isEditableTextLayer(list[i])) {
			list.splice(i, 1);
			i--;
			len--;
			continue;
		}
	}

	return list;
}

function isEditableTextLayer(layerID){
	var ref166 = new ActionReference();
	var idLyr = charIDToTypeID("Lyr ");
	ref166.putIdentifier(idLyr, layerID);
	var desc = executeActionGet(ref166);

	var isNotTextLayer = !desc.hasKey(stringIDToTypeID('textKey'));
	var descLocking = desc.getObjectValue(stringIDToTypeID('layerLocking'));
	var locked = descLocking.getBoolean(stringIDToTypeID('protectAll'));

	if (isNotTextLayer || locked) {
		return false;
	}

	var textKey = desc.getObjectValue(stringIDToTypeID('textKey'));
	var contentString = textKey.getString(stringIDToTypeID('textKey'));
	if (contentString == "") {
		return false;
	}
	return true;
}

function cs6SelectedLayerBugFix() {
	var ref = new ActionReference();
	var idPrpr = charIDToTypeID("Prpr");
	var idTxtS = stringIDToTypeID("itemIndex");
	ref.putProperty(idPrpr, idTxtS);

	var idLyr = charIDToTypeID("Lyr ");
	var idOrdn = charIDToTypeID("Ordn");
	var idTrgt = charIDToTypeID("Trgt");
	ref.putEnumerated(idLyr, idOrdn, idTrgt);

	var desc = executeActionGet(ref);
	var itemIndex = desc.getInteger(stringIDToTypeID('itemIndex')) + (hasBackground() ? -1 : 0);
	return itemIndex;
}


function undo() {
	var idslct = charIDToTypeID("slct");
	var desc1484 = new ActionDescriptor();
	var idnull = charIDToTypeID("null");
	var ref221 = new ActionReference();
	var idHstS = charIDToTypeID("HstS");
	var idOrdn = charIDToTypeID("Ordn");
	var idPrvs = charIDToTypeID("Prvs");
	ref221.putEnumerated(idHstS, idOrdn, idPrvs);
	desc1484.putReference(idnull, ref221);
	executeAction(idslct, desc1484, DialogModes.NO);
}

function redo(){
	var idslct = charIDToTypeID( "slct" );
	var desc127 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
		var ref23 = new ActionReference();
		var idHstS = charIDToTypeID( "HstS" );
		var idOrdn = charIDToTypeID( "Ordn" );
		var idNxt = charIDToTypeID( "Nxt " );
		ref23.putEnumerated( idHstS, idOrdn, idNxt );
	desc127.putReference( idnull, ref23 );
	executeAction( idslct, desc127, DialogModes.NO );
}

function existsPreviousStep(){
	var ref = new ActionReference();
	var idHstS = charIDToTypeID("HstS");
	var idOrdn = charIDToTypeID("Ordn");
	var idPrvs = charIDToTypeID("Prvs");
	ref.putEnumerated(idHstS, idOrdn, idPrvs);
	try{
		executeActionGet(ref);
		return true;
	}
	catch(e){
		return false;
	}
}

function removeCurrentHistoryState(){
	var idDlt = charIDToTypeID( "Dlt " );
	var desc185 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
		var ref62 = new ActionReference();
		var idHstS = charIDToTypeID( "HstS" );
		var idCrnH = charIDToTypeID( "CrnH" );
		ref62.putProperty( idHstS, idCrnH );
	desc185.putReference( idnull, ref62 );
	executeAction( idDlt, desc185, DialogModes.NO );
}

function getHistoryPreferences(){
	var ref = new ActionReference();
	var idPrpr = charIDToTypeID("Prpr");
	var idTxtS = stringIDToTypeID("historyPreferences");
	ref.putProperty(idPrpr, idTxtS);
	var idcapp = charIDToTypeID("capp");
	var idOrdn = charIDToTypeID("Ordn");
	var idTrgt = charIDToTypeID("Trgt");
	ref.putEnumerated(idcapp, idOrdn, idTrgt);
	var desc = executeActionGet(ref).getObjectValue(stringIDToTypeID("historyPreferences"));
	var result = {
		maximumStates: desc.getInteger(stringIDToTypeID("maximumStates")),
		nonLinear: desc.getBoolean(stringIDToTypeID("nonLinear")),
		snapshotInitial: desc.getBoolean(stringIDToTypeID("snapshotInitial")),
	};
	return result;
}

function includes(arr, value) {

	for(i = 0, len = arr.length; i < len; i++){
		if(arr[i]===value){
			return true;
		}
	}
	return false;
}
