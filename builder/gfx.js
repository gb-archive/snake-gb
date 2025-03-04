"use strict";

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var images = {};

module.exports = function(imageDirectory, done) {
  var sourceDirectory = path.resolve(imageDirectory, "src");
  var fileNames = fs.readdirSync(sourceDirectory);
  for(var i=0; i<fileNames.length; i++) {
    var fileName = fileNames[i];
    if(path.extname(fileName) == ".json") {
      var filePath = path.resolve(sourceDirectory, fileName);
      processSet(imageDirectory, filePath);
    }
  }
  done();
}

function getImage(dirPath, imageName) {
  if(images[imageName] == null) {
    var imagePath = path.resolve(dirPath, imageName);
    var data = fs.readFileSync(imagePath);
    var png = PNG.sync.read(data);
    images[imageName] = png;
  }
  
  return images[imageName];
}

function processTile(image, bytes, coordinate) {
  for(var y=coordinate.y * 8; y < coordinate.y * 8 + 8; y++) {
    var byteA = 0;
    var byteB = 0;
    for(var x=coordinate.x * 8; x < coordinate.x * 8 + 8; x++) {
      var index = (x + y * image.width) * 4;

      var average = (image.data[index] + image.data[index + 1] + image.data[index + 2]) / 3;
      var bucket = 3 - Math.floor(average / 64);

      if(bucket == 1) {
        byteA |= 1 << (7 - (x - coordinate.x * 8));
      } else if(bucket == 2) {
        byteB |= 1 << (7 - (x - coordinate.x * 8));
      } else if(bucket == 3) {
        byteA |= 1 << (7 - (x - coordinate.x * 8));
        byteB |= 1 << (7 - (x - coordinate.x * 8));
      }
    }

    bytes.push(byteA);
    bytes.push(byteB);
  }
}

function processSet(outputPath, filePath) {
  var name = path.basename(filePath, path.extname(filePath));
  var data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  var sources = data["sources"];
  var bytes = [];
  var indices = [];
  for(var sourceIndex=0; sourceIndex<sources.length; sourceIndex++) {
    var source = sources[sourceIndex];
    var imageName = source["image"];
    var tiles = source["tiles"];
    var tilesList = source["tilesList"];
    
    var image = getImage(path.dirname(filePath), imageName);
    
    if(tilesList != null) {
      for(var tileIndex=0; tileIndex<tilesList.length; tileIndex++) {
        var coordinate = tilesList[tileIndex];
        processTile(image, bytes, coordinate)
        indices.push("SPACER");
      }
    }
    
    if(tiles != null) {
      for (var identifier in tiles) {
        if (tiles.hasOwnProperty(identifier)) {
          var coordinate = tiles[identifier];

          for(var y=coordinate.y * 8; y < coordinate.y * 8 + 8; y++) {
            var byteA = 0;
            var byteB = 0;
            for(var x=coordinate.x * 8; x < coordinate.x * 8 + 8; x++) {
              var index = (x + y * image.width) * 4;

              var average = (image.data[index] + image.data[index + 1] + image.data[index + 2]) / 3;
              var bucket = 3 - Math.floor(average / 64);

              if(bucket == 1) {
                byteA |= 1 << (7 - (x - coordinate.x * 8));
              } else if(bucket == 2) {
                byteB |= 1 << (7 - (x - coordinate.x * 8));
              } else if(bucket == 3) {
                byteA |= 1 << (7 - (x - coordinate.x * 8));
                byteB |= 1 << (7 - (x - coordinate.x * 8));
              }
            }

            bytes.push(byteA);
            bytes.push(byteB);
          }
          indices.push(identifier);
        }
      }
    }
  }
  
  outputAssembly(name, indices, bytes, path.resolve(outputPath, "tiles_" + name + ".asm"));
}

function outputAssembly(name, indices, bytes, path) {
  var output = "; IMPORTANT: Tool-generated file. Do not modify.\n\n";
  output += "IF !DEF(TILES_" + name.toUpperCase() + "_ASM)\n";
  output += "TILES_" + name.toUpperCase() + "_ASM SET 1\n\n";
  
  output += name.toUpperCase() + "_TILES_COUNT EQU " + (bytes.length / 16) + "\n\n";
  
  var writtenIndexCount = 0;
  for(var i=0; i<indices.length; i++) {
    if(indices[i] != "SPACER") {
      output += "TILE_" + indices[i].toUpperCase() + " EQU $" + i.toString(16) + "\n";
      writtenIndexCount += 1;
    }
  }
  
  if(writtenIndexCount > 0) {
    output += "\n";
  }
  
  output += "SECTION \"" + name + " tiles\", HOME\n";
  output += name + "Tiles:\n";
  for(var i=0; i<bytes.length; i++) {
    if(i % 16 == 0) {
      output += "  DB ";
    }
    
    var string = bytes[i].toString(16);
    if(string.length == 1) {
      string = "0" + string;
    }
    output += "$" + string;
    
    if(i % 16 == 15) {
      output += "\n";
    } else {
      output += ",";
    }
  }
  
  output += "\nENDC\n";
  
  fs.writeFileSync(path, output);
}
