/**
 *  Copyright (C) 2016 Christian M. Zmasek
 *  Copyright (C) 2016 J. Craig Venter Institute
 *  All rights reserved
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA
 *
 *  Created by czmasek on 7/7/2016.
 */

"use strict";

var phyloxml_parser = require('./phyloxml_parser');
var fs = require('fs');

var a = require('path').join(__dirname, "./data/two_trees.xml");
var b = require('path').join(__dirname, "./data/example_2.xml");
var c = require('path').join(__dirname, "./data/apaf.xml");
var d = require('path').join(__dirname, "./data/amphi_frost.xml");
var e = require('path').join(__dirname, "./data/phyloxml_test1.xml");
var f = require('path').join(__dirname, "./data/phyloxml_test2.xml");

var tests = [a,b,c,d,e,f].forEach(test);

function test(element, index) {
    console.log( index );
    var text = fs.readFileSync(element, 'utf8');
    var p = phyloxml_parser.phyloXmlParser;
    var phys = p.parse(text, {trim: true, normalize: true});
}

//var xmlfile = require('path').join(__dirname, "./data/two_trees.xml");
//var xmlfile = require('path').join(__dirname, "./data/example_2.xml");
var xmlfile = require('path').join(__dirname, "./data/apaf.xml");
//var xmlfile = require('path').join(__dirname, "./data/amphi_frost.xml");
//var xmlfile = require('path').join(__dirname, "./data/ncbi_taxonomy.xml");
//var xmlfile = require('path').join(__dirname, "./data/phyloxml_test1.xml");


// Synchronous parsing of phyloXML-formatted string:
var text = fs.readFileSync(xmlfile, 'utf8');

var p = phyloxml_parser.phyloXmlParser;

var phys = p.parse(text, {trim: true, normalize: true});

var len = phys.length;
console.log("Parsed " + len + " tree:");
for (var i = 0; i < len; i++) {
    console.log();
    console.log("Tree " + i + ":");
    var str = JSON.stringify(phys[i], null, 2);
    console.log(str);
}

// Asynchronous parsing of phyloXML-formatted stream:
var stream = fs.createReadStream(xmlfile, {encoding: 'utf8'});
p.parseAsync(stream, {trim: true, normalize: true});