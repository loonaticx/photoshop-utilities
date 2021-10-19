#target photoshop

/* Open the given file, and compress with TinyPNG. */
function compressFile(file) {
  var document = open(file);

  if (document.mode == DocumentMode.INDEXEDCOLOR) {
    document.changeMode(ChangeMode.RGB);
  }

  var tinypng = new ActionDescriptor();
  tinypng.putPath(charIDToTypeID("In  "), file); /* Overwrite original! */

  var compress = new ActionDescriptor();
  compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
  executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);

  document.close(SaveOptions.DONOTSAVECHANGES);
}

/* Recursively compress files in the given folder, overwriting the originals. */
function compressFolder(folder) {
  var children = folder.getFiles();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child instanceof Folder) {
      compressFolder(child);
    } else {
      /* Only attempt to compress PNG files. */
      if (child.name.slice(-4).toLowerCase() == ".png") {
        compressFile(child);
      }
    }
  }
}

try {
  compressFolder(Folder.selectDialog("Compress folder with TinyPNG"));
} catch(error) {
  alert("Error while processing: " + error);
}
