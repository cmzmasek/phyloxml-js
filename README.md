# phyloxml-js
A SAX style phyloXML parser for JavaScript (JS).

phyloXML website: http://www.phyloxml.org/

## Dependencies

This requires sax-js from https://github.com/isaacs/sax-js

## Example

This basic example shows how to parse a phyloXML formatted String
into to a object representing a phylogenetic tree.
Followed by printing some elements and then converting the object
back to a phyloXML formatted String.

Change './phyloxml' to 'phyloxml' if you use this code outside of this package

```
var phyloXml = require('./phyloxml').phyloXml;

phlyoXmlFormattedString = '<phyloxml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'xmlns="http://www.phyloxml.org" ' +
    'xsi:schemaLocation="http://www.phyloxml.org http://www.phyloxml.org/1.10/phyloxml.xsd">' +
    '<phylogeny rooted="true" rerootable="false">' +
    '<clade><branch_length>0.2</branch_length>' +
    '<clade><branch_length>0.4</branch_length><name>A</name></clade>' +
    '<clade><branch_length>0.6</branch_length><name>B</name></clade>' +
    '</clade>' +
    '</phylogeny>' +
    '</phyloxml>';

var phylogeneticTree = phyloXml.parse(phlyoXmlFormattedString, {trim: true, normalize: true})[0];

console.log('Root branch length  : ' + phylogeneticTree.children[0].branch_length);
console.log('Node A name         : ' + phylogeneticTree.children[0].children[0].name);
console.log('Node A branch length: ' + phylogeneticTree.children[0].children[0].branch_length);
console.log('Node B name         : ' + phylogeneticTree.children[0].children[1].name);
console.log('Node B branch length: ' + phylogeneticTree.children[0].children[1].branch_length);

console.log('Entire tree in phyloXML format:');
console.log(phyloXml.toPhyloXML(phylogeneticTree, 4));
```

The output should be:

```
Root branch length  : 0.2
Node A name         : A
Node A branch length: 0.4
Node B name         : B
Node B branch length: 0.6
Entire tree in phyloXML format:
<?xml version="1.0" encoding="UTF-8"?>
<phyloxml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.phyloxml.org http://www.phyloxml.org/1.20/phyloxml.xsd" xmlns="http://www.phyloxml.org">
 <phylogeny rooted="true" rerootable="false">
  <clade>
   <branch_length>0.2</branch_length>
   <clade>
    <name>A</name>
    <branch_length>0.4</branch_length>
   </clade>
   <clade>
    <name>B</name>
    <branch_length>0.6</branch_length>
   </clade>
  </clade>
 </phylogeny>
</phyloxml>
```

### Synchronous parsing of phyloXML-formatted String
```
var px = require('./phyloxml').phyloXml;
var phys = px.parse(phyloxmlText, {trim: true, normalize: true});
console.log(px.toPhyloXML(phys[0], 6));
```

### Asynchronous parsing of phyloXML-formatted Stream
```
var fs = require('fs');
var px = require('./phyloxml').phyloXml;
var stream = fs.createReadStream(xmlFile, {encoding: 'utf8'});
px.parseAsync(stream, {trim: true, normalize: true});
```

