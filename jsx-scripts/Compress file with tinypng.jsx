              #target photoshop
              
              /* Open the given file, and compress with TinyPNG. */
              function compressFile(file) {
                var document = open(file);
              
                if (document.mode == DocumentMode.INDEXEDCOLOR) {
                  document.changeMode(ChangeMode.RGB);
                }
              
                if (document.bitsPerChannel == BitsPerChannelType.SIXTEEN) {
                  convertBitDepth(8);
                }
              
                var type = charIDToTypeID("tyPN"); /* tyJP for JPEG */
                var percentage = 100;
              
                var tinypng = new ActionDescriptor();
                tinypng.putPath(charIDToTypeID("In  "), file); /* Overwrite original! */
                tinypng.putEnumerated(charIDToTypeID("FlTy"), charIDToTypeID("tyFT"), type);
                tinypng.putUnitDouble(charIDToTypeID("Scl "), charIDToTypeID("#Prc"), percentage );
              
                var compress = new ActionDescriptor();
                compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
                executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);
              
                document.close(SaveOptions.DONOTSAVECHANGES);
              }
              
              function convertBitDepth(bitdepth) {
                var id1 = charIDToTypeID("CnvM");
                var convert = new ActionDescriptor();
                var id2 = charIDToTypeID("Dpth");
                convert.putInteger(id2, bitdepth);
                executeAction(id1, convert, DialogModes.NO);
              }
              
              compressFile(File.openDialog("Compress file with TinyPNG"));
           